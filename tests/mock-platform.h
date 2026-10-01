// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <map>
#include <vector>
#include <assert.h>
using pid_t=int;
enum{PROT_READ=1,PROT_WRITE=2,PROT_EXEC=4,MAP_PRIVATE=2,MAP_ANON=0x1000};
static std::map<uint64_t,std::vector<uint8_t>> memory;
static bool attached,freed,published,failedAfterPublish,permissionFailure;
static unsigned detachCalls,writeCalls,failAt;
static uint64_t testSlot,testOriginal;
static const uint64_t testAllocation=0x100000000ULL;
static std::vector<uint8_t>* region(uint64_t at,size_t len,uint64_t& offset){for(auto& item:memory)if(at>=item.first&&at-item.first<=item.second.size()&&len<=item.second.size()-(at-item.first)){offset=at-item.first;return &item.second;}return nullptr;}
static int kernel_get_vmem_protection(pid_t,intptr_t at,size_t len){uint64_t off;return region(at,len,off)?(at>=0x400000&&at<0x404000?PROT_EXEC:7):-1;}
static int kernel_proc_copyout(pid_t,intptr_t at,void* p,size_t len){uint64_t off;auto* bytes=region(at,len,off);if(!bytes)return-1;memcpy(p,bytes->data()+off,len);return 0;}
static int pt_attach(pid_t){attached=true;return 0;}
static int pt_detach(pid_t,int){detachCalls++;attached=false;return 0;}
static intptr_t pt_mmap(pid_t,intptr_t,size_t len,int,int,int,ptrdiff_t){assert(attached);memory[testAllocation]=std::vector<uint8_t>(len);return testAllocation;}
static void gta_memory_target_stopped(int stopped){assert((bool)stopped==attached);}
static long pt_syscall(pid_t,int code,...){assert(attached&&code==203);return 0;}
static int kernel_mprotect(pid_t,intptr_t at,size_t len,int prot){assert(attached&&at==testAllocation&&len==0x24000&&prot==7);return permissionFailure?-1:0;}
static int pt_munmap(pid_t,intptr_t at,size_t){assert(attached);assert(!published);freed=true;memory.erase(at);return 0;}
static int kernel_proc_copyin(pid_t,const void* p,intptr_t at,size_t len){assert(!attached);++writeCalls;if(failAt&&writeCalls==failAt)return-1;uint64_t off;auto* bytes=region(at,len,off);if(!bytes)return-1;memcpy(bytes->data()+off,p,len);if((uint64_t)at==testSlot){uint64_t next;memcpy(&next,p,8);published=next!=testOriginal;if(published&&failedAfterPublish)return-1;}return 0;}
static int sceKernelSendNotificationRequest(int,void*,size_t,int){return 0;}
static int _sceApplicationGetAppId(int,int* app){*app=0x2018;return 0;}
static int sceApplicationContinue(int app){assert(attached&&app==0x2018);return 0;}
static int usleep(unsigned){return 0;}
