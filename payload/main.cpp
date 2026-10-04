#include "firmware-targets.h"
// SPDX-License-Identifier: GPL-3.0-or-later
// Standalone installer. The resident menu runs on GTA's existing script thread.
#ifndef GTA_INSTALLER_TEST
#include <ps5/kernel.h>
#include <sys/sysctl.h>
#include <sys/user.h>
#include <sys/mman.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#else
#include "../tests/mock-platform.h"
#endif
#include "sha256.h"
#include "profile.h"
#include "profiles.h"
#ifndef GTA_INSTALLER_TEST
extern "C" {
#include "../vendor/libNineS/pt.h"
int sceKernelSendNotificationRequest(int,void*,size_t,int);
int _sceApplicationGetAppId(int,int*);
int sceApplicationContinue(int);
void gta_memory_target_stopped(int);
}
#endif
static const uint64_t MENU_MAGIC=0x325654474e5350ULL;
static const uint64_t INSTALL_MAGIC=0x31464c45415447ULL;
static const size_t IMAGE_SIZE=0x20000, ALLOCATION_SIZE=0x24000;
struct Identity {uint64_t magic,original,slot;uint8_t imageHash[32];};
static FILE* diagnostic;
static int finish(int result,const char* message){
 printf("GTA V: %s\n",message);
 if(diagnostic){fprintf(diagnostic,"result=%d %s\n",result,message);fclose(diagnostic);diagnostic=nullptr;}
 unsigned char notification[0xc30]={0};int minus=-1;memcpy(notification+0x10,&minus,4);
 snprintf((char*)notification+0x2d,1024,"GTA V: %s",message);
 sceKernelSendNotificationRequest(0,notification,sizeof(notification),0);return result;
}
static bool read_bytes(pid_t pid,uint64_t at,void* out,size_t length){
 if(at<0x4000||at>0x7fffffffffffULL||!length||length>0x40000||at+length<at)return false;
 // PS5 game code is execute-only. Kernel copyout can inspect those mapped
 // pages without changing their permissions; SHA-256 still verifies identity.
 // A separately walked live VM tree can race GTA's mapping changes. Require
 // an exact successful read, rather than using that tree walk as a read gate.
 int result=kernel_proc_copyout(pid,(intptr_t)at,out,length);
 if(result&&diagnostic)fprintf(diagnostic,"read failed at=%#lx length=%zu result=%d\n",at,length,result);
 return !result;
}
template<class T>static bool read_value(pid_t p,uint64_t a,T& out){return read_bytes(p,a,&out,sizeof(out));}
static int write_bytes(pid_t pid,const void* data,intptr_t address,size_t length){
 if(!length||length>4096||kernel_proc_copyin(pid,data,address,length))return -1;
 uint8_t check[4096];
 return kernel_proc_copyout(pid,address,check,length)||memcmp(check,data,length)?-1:0;
}
static bool fingerprint(pid_t pid,const Profile& p){
 uint8_t bytes[256],hash[32];
 for(const auto& f:p.fingerprints){if(f.length>sizeof(bytes)||!read_bytes(pid,f.address,bytes,f.length)){if(diagnostic)fprintf(diagnostic,"fingerprint unreadable pid=%d at=%#lx prot=%d\n",pid,f.address,kernel_get_vmem_protection(pid,f.address,f.length));return false;}sha256(bytes,f.length,hash);if(memcmp(hash,f.hash,32)){if(diagnostic)fprintf(diagnostic,"fingerprint mismatch pid=%d at=%#lx\n",pid,f.address);return false;}}
 return true;
}
static bool player_ready(pid_t pid,const Profile& p){
 uint8_t online=1;uint64_t root=0,ped=0;float health=0;
 bool ready=read_value(pid,p.networkFlag,online)&&!online&&read_value(pid,p.playerRoot,root)&&read_value(pid,root+8,ped)&&read_value(pid,ped+0x250,health)&&health>0&&health<100000;
 if(!ready&&diagnostic)fprintf(diagnostic,"player not ready online=%u root=%#lx ped=%#lx health=%f\n",online,root,ped,health);
 return ready;
}
static bool native_table(pid_t pid,const Profile& p,uint64_t& table,uint32_t& count){
 uint8_t g[0x58];if(!read_bytes(pid,p.registry,g,sizeof(g)))return false;
 uint64_t pool,entries,buckets;uint32_t bucketCount,stride;
 memcpy(&pool,g+8,8);memcpy(&entries,g+0x40,8);memcpy(&buckets,g+0x48,8);memcpy(&bucketCount,g+0x50,4);memcpy(&stride,g+0x1c,4);
 if(!bucketCount||bucketCount>65536||stride!=16){if(diagnostic)fprintf(diagnostic,"registry invalid buckets=%u stride=%u\n",bucketCount,stride);return false;}
 const uint32_t hash=1459623836;int32_t index=-1;
 if(!read_value(pid,buckets+(hash%bucketCount)*4ULL,index))return false;
 for(unsigned hops=0;index>=0&&index<16384&&hops<16384;hops++){
  struct Entry{uint32_t hash;int32_t slot,next;}e;
  if(!read_value(pid,entries+(uint64_t)index*12,e))return false;
  if(e.hash==hash){
   uint64_t program=0;uint32_t identity=0;
   return e.slot>=0&&e.slot<16384&&read_value(pid,pool+(uint64_t)e.slot*16,program)&&read_value(pid,program+0x58,identity)&&identity==hash&&read_value(pid,program+0x40,table)&&read_value(pid,program+0x2c,count)&&count>0&&count<=8192;
  }index=e.next;
 }return false;
}
static bool existing_menu(pid_t pid,const Profile& p,uint64_t at,uint64_t slot){
 if(at%0x4000)return false;
 uint64_t magic=0,original=0;Identity id;uint8_t code[64];
 return read_value(pid,at+0x10000,magic)&&magic==MENU_MAGIC&&read_value(pid,at+0x10008,original)&&original==p.original&&read_value(pid,at+IMAGE_SIZE,id)&&id.magic==INSTALL_MAGIC&&id.original==p.original&&id.slot==slot&&!memcmp(id.imageHash,p.imageHash,32)&&read_bytes(pid,at,code,64)&&!memcmp(code,p.image,64);
}
// Return 1 for a free original slot, 2 for this exact installed build, 0 otherwise.
static int find_slot(pid_t pid,const Profile& p,uint64_t& slot){
 uint64_t table=0;uint32_t count=0;if(!native_table(pid,p,table,count))return 0;
 auto* pointers=(uint64_t*)malloc(count*8);if(!pointers)return 0;
 if(!read_bytes(pid,table,pointers,count*8)){free(pointers);return 0;}
 unsigned originals=0,installed=0;uint64_t freeSlot=0;
 for(unsigned i=0;i<count;i++){
  if(pointers[i]==p.original){originals++;freeSlot=table+i*8ULL;}
  else if(pointers[i]>=0x4000&&pointers[i]%0x4000==0&&existing_menu(pid,p,pointers[i],table+i*8ULL))installed++;
 }
 free(pointers);if(diagnostic)fprintf(diagnostic,"native slots count=%u originals=%u installed=%u\n",count,originals,installed);if(installed)return installed==1&&!originals?2:0;
 if(originals!=1)return 0;slot=freeSlot;return 1;
}
static int detach_game(pid_t pid){
 int app=0;if(!_sceApplicationGetAppId(pid,&app))sceApplicationContinue(app);
 int result=-1;for(int i=0;i<3&&result;i++){result=pt_detach(pid,0);if(result)usleep(10000);}
 if(!result)gta_memory_target_stopped(0);
 return result;
}
static int install(pid_t pid,const Profile& p){
 uint64_t slot=0;int state=find_slot(pid,p,slot);
 if(state==2)return finish(0,"Already loaded. Press L1 + D-pad Right.");
 if(state!=1)return finish(1,"Story script is unavailable or already modified. Restart GTA, enter Story Mode and retry.");
 if(!fingerprint(pid,p)||!player_ready(pid,p))return finish(1,"GTA changed during installation; no menu installed.");
 auto* image=(uint8_t*)malloc(IMAGE_SIZE);if(!image)return finish(1,"Not enough installer memory.");
 memcpy(image,p.image,IMAGE_SIZE);uint32_t enabled=1;
 memcpy(image+0x10000,&MENU_MAGIC,8);memcpy(image+0x10008,&p.original,8);
 memcpy(image+0x10550,p.frameNatives,sizeof(p.frameNatives));memcpy(image+0x105fc,&enabled,4);
 if(pt_attach(pid)){free(image);return finish(1,"Could not attach to GTA. No menu installed.");}
 gta_memory_target_stopped(1);
 uint64_t allocation=0,current=0;bool allocated=false;
 const char* error="Could not allocate executable menu memory.";
 do {
  intptr_t base=pt_mmap(pid,0x100000,ALLOCATION_SIZE,PROT_READ|PROT_WRITE|PROT_EXEC,MAP_PRIVATE|MAP_ANON,-1,0);
  if(base<=0||((uint64_t)base%0x4000))break;
  allocation=base;
  if(kernel_mprotect(pid,base,ALLOCATION_SIZE,7)){error="Could not enable the menu's executable mapping.";break;}
  if(pt_syscall(pid,203,(uint64_t)base,(uint64_t)ALLOCATION_SIZE,0ULL,0ULL,0ULL,0ULL)){error="Could not populate the menu's private memory.";break;}
  int prot=kernel_get_vmem_protection(pid,base,ALLOCATION_SIZE);
  if(prot<0||(prot&7)!=7){error="Menu allocation has incorrect permissions.";break;}
  allocated=true;
 }while(false);
 if(!allocated&&allocation)pt_munmap(pid,allocation,ALLOCATION_SIZE);
 int detached=detach_game(pid);
 if(detached||!allocated){free(image);return finish(1,detached?"GTA detach did not confirm. Restart GTA before retrying.":error);}
 // Resume before all image I/O, matching PS5Debug-NG + the desktop installer.
 // Only the private, unpublished mapping is written until the final pointer.
 bool success=false,publicationAttempted=false;uint64_t checkedSlot=0;
 do {
  fprintf(diagnostic,"pid=%d profile=%s/%s slot=%#lx\n",pid,p.title,p.version,slot);fflush(diagnostic);
  bool copied=true;
  for(size_t off=0;off<IMAGE_SIZE;off+=4096)if(write_bytes(pid,image+off,allocation+off,4096)){copied=false;break;}
  Identity id={INSTALL_MAGIC,p.original,slot,{0}};memcpy(id.imageHash,p.imageHash,32);
  if(!copied||write_bytes(pid,&id,allocation+IMAGE_SIZE,sizeof(id))){error="Menu upload failed verification.";break;}
  if(!fingerprint(pid,p)||!player_ready(pid,p)||find_slot(pid,p,checkedSlot)!=1||checkedSlot!=slot){error="GTA changed during upload; no menu activated.";break;}
  if((slot&7)||!read_value(pid,slot,current)||current!=p.original){error="Native slot changed; no menu activated.";break;}
  publicationAttempted=true;
  int written=write_bytes(pid,&allocation,slot,8);
  success=!written&&read_value(pid,slot,current)&&current==allocation;
  if(!success){
   error="Native hook did not verify. Restart GTA before retrying.";
   if(read_value(pid,slot,current)&&current==allocation)write_bytes(pid,&p.original,slot,8);
  }
 }while(false);
 // Once publication was attempted, preserve the image even after rollback:
 // the running game could already have an in-flight return into that mapping.
 if(!success&&!publicationAttempted&&!pt_attach(pid)){
  gta_memory_target_stopped(1);pt_munmap(pid,allocation,ALLOCATION_SIZE);
  if(detach_game(pid))error="GTA cleanup detach did not confirm. Restart GTA before retrying.";
 }
 free(image);
 if(!success)return finish(1,error);
 fprintf(diagnostic,"installed base=%#lx\n",allocation);fflush(diagnostic);
 return finish(0,"Loaded. Press L1 + D-pad Right. Story Mode only.");
}

#ifndef GTA_INSTALLER_TEST
int main(){
 diagnostic=fopen("/data/gta-v-menu.log","w");
 if(!diagnostic)return finish(1,"Cannot create local diagnostic file.");
 if(!snipers_firmware_supported(kernel_get_fw_version()))return finish(1,"This firmware is outside the experimental target list.");
 // Serialize two overlapping loader requests; close releases the advisory lock.
 int lock=open("/system_tmp/gta-v-menu.lock",O_CREAT|O_RDWR,0600);
 if(lock<0||flock(lock,LOCK_EX|LOCK_NB)){if(lock>=0)close(lock);return finish(1,"Another GTA installer is active.");}
 int mib[4]={CTL_KERN,KERN_PROC,KERN_PROC_PROC,0};size_t size=0;
 if(sysctl(mib,4,nullptr,&size,nullptr,0)||!size||size>16*1024*1024)return finish(1,"Cannot enumerate games.");
 size+=size/4;auto* data=(uint8_t*)malloc(size);
 if(!data||sysctl(mib,4,data,&size,nullptr,0)){free(data);return finish(1,"Cannot read game processes.");}
 pid_t pid=0;const Profile* selected=nullptr;unsigned matches=0;
 for(size_t off=0;off+sizeof(kinfo_proc)<=size;){
  auto* process=(kinfo_proc*)(data+off);if(process->ki_structsize<sizeof(kinfo_proc)||(size_t)process->ki_structsize>size-off)break;
  if(!strcmp(process->ki_comm,"eboot.bin")){fprintf(diagnostic,"game candidate pid=%d\n",process->ki_pid);for(const auto& p:profiles)if(fingerprint(process->ki_pid,p)){pid=process->ki_pid;selected=&p;matches++;}}
  off+=process->ki_structsize;
 }free(data);
 if(matches!=1)return finish(1,"Open a supported GTA V build in Story Mode, then load this ELF again.");
 if(!player_ready(pid,*selected))return finish(1,"Enter Story Mode and wait for your character to load.");
 int result=install(pid,*selected);close(lock);return result;
}
#endif
