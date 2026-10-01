// SPDX-License-Identifier: GPL-3.0-or-later
// Use the SDK's page-table translator without its mdbg-first memory path.
// Page translation: John Tornblom, idlesauce and sleirsgoevy (PS5 payload SDK).
#ifndef GTA_PROCESS_MEMORY_TEST
#include <ps5/kernel.h>
#include <stdint.h>
#include <unistd.h>
extern const intptr_t KERNEL_ADDRESS_DMAP_BASE;
extern int kernel_proc_getpaddr(int, unsigned long, unsigned long*, unsigned long*);
#endif

// Fault in a nonresident game page through the same read ABI as PS5Debug-NG.
// Unlike the SDK convenience path, do not replace the caller's capabilities,
// and never accept a short transfer as a successful read.
static int read_nonresident(pid_t target,intptr_t address,void* buffer,size_t length){
  pid_t self=getpid();uint64_t saved=kernel_get_ucred_authid(self);
  if(!saved||saved==UINT64_MAX)return -1;
  if(kernel_set_ucred_authid(self,0x4800000000000006ULL))return -1;
  uint64_t command[2]={1,0x12},args[4]={(uint64_t)target,(uint64_t)address,(uint64_t)buffer,length},result[2]={0,0};
  int failed=syscall(573,command,args,result)!=0||result[1]!=length;
  if(kernel_set_ucred_authid(self,saved))return -1;
  return failed?-1:0;
}

static int target_stopped;
void gta_memory_target_stopped(int stopped){target_stopped=stopped;}

int __wrap_kernel_proc_copyout(pid_t pid,intptr_t address,void* buffer,size_t length){
  if(!target_stopped&&!read_nonresident(pid,address,buffer,length))return 0;
  for(size_t offset=0;offset<length;){
    unsigned long physical=0,span=0;
    if(kernel_proc_getpaddr(pid,address+offset,&physical,&span)||!span)return -1;
    size_t count=length-offset;if(count>span)count=span;
    if(kernel_copyout(KERNEL_ADDRESS_DMAP_BASE+physical,(uint8_t*)buffer+offset,count))return -1;
    offset+=count;
  }
  return 0;
}

int __wrap_kernel_proc_copyin(pid_t pid,const void* buffer,intptr_t address,size_t length){
  for(size_t offset=0;offset<length;){
    unsigned long physical=0,span=0;
    if(kernel_proc_getpaddr(pid,address+offset,&physical,&span)||!span)return -1;
    size_t count=length-offset;if(count>span)count=span;
    if(kernel_copyin((const uint8_t*)buffer+offset,KERNEL_ADDRESS_DMAP_BASE+physical,count))return -1;
    offset+=count;
  }
  return 0;
}
