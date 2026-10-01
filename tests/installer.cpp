// SPDX-License-Identifier: GPL-3.0-or-later
#define GTA_INSTALLER_TEST
#include "../payload/main.cpp"
extern "C" {const unsigned char menu_0[0x20000]={0};const unsigned char menu_1[0x20000]={0};}
template<class T>static void put(uint64_t a,T value){uint64_t off;auto* b=region(a,sizeof(value),off);assert(b);memcpy(b->data()+off,&value,sizeof(value));}
static Profile setup(){
 memory.clear();attached=freed=published=failedAfterPublish=permissionFailure=false;writeCalls=detachCalls=failAt=0;
 memory[0x400000]=std::vector<uint8_t>(0x4000);memory[0x600000]=std::vector<uint8_t>(0x8000);
 Profile p={};p.title="test";p.version="test";p.playerRoot=0x600000;p.networkFlag=0x600010;p.registry=0x601000;p.original=0x400100;p.image=menu_0;
 sha256(p.image,IMAGE_SIZE,p.imageHash);
 for(auto& f:p.fingerprints){f.address=0x400100;f.length=32;sha256(memory[0x400000].data()+0x100,32,f.hash);}
 put<uint64_t>(p.playerRoot,0x600100);put<uint64_t>(0x600108,0x600200);put<float>(0x600450,200.0f);
 put<uint64_t>(p.registry+8,0x602000);put<uint32_t>(p.registry+0x1c,16);put<uint64_t>(p.registry+0x40,0x603000);put<uint64_t>(p.registry+0x48,0x604000);put<uint32_t>(p.registry+0x50,1);
 put<uint32_t>(0x603000,1459623836);put<int32_t>(0x603004,0);put<int32_t>(0x603008,-1);put<int32_t>(0x604000,0);put<uint64_t>(0x602000,0x605000);
 put<uint32_t>(0x605058,1459623836);put<uint64_t>(0x605040,0x606000);put<uint32_t>(0x60502c,2);put<uint64_t>(0x606000,p.original);put<uint64_t>(0x606008,0x400200);
 testSlot=0x606000;testOriginal=p.original;diagnostic=tmpfile();assert(diagnostic);return p;
}
int main(){
 auto p=setup();assert(install(93,p)==0);assert(!attached&&published&&!freed&&detachCalls==1);uint64_t slot=0;assert(find_slot(93,p,slot)==2);
 diagnostic=tmpfile();unsigned writes=writeCalls;assert(install(93,p)==0);assert(writeCalls==writes&&detachCalls==1); // duplicate load is read-only
 p=setup();failAt=3;assert(install(93,p)!=0);assert(!attached&&freed&&!published&&detachCalls==2); // interrupted image never published
 p=setup();permissionFailure=true;assert(install(93,p)!=0);assert(!attached&&freed&&!published&&writeCalls==0); // permission failure never publishes a hook
 p=setup();failedAfterPublish=true;assert(install(93,p)!=0);assert(!attached&&!published&&!freed&&detachCalls==1); // retain any possibly executed image after rollback
 p=setup();put<uint8_t>(p.networkFlag,1);assert(install(93,p)!=0);assert(!published&&writeCalls==0&&!attached); // transition into Online refused after attach
 p=setup();put<uint8_t>(p.fingerprints[0].address,1);assert(install(93,p)!=0);assert(!published&&writeCalls==0&&!attached); // changed executable refused
 p=setup();put<uint64_t>(0x606000,0x44444000);assert(install(93,p)!=0);assert(writeCalls==0&&!attached); // unknown hook never replaced
 puts("Installer fault, duplicate and profile checks passed");return 0;
}
