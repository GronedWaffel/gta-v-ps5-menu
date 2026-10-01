// SPDX-License-Identifier: GPL-3.0-or-later
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef int pid_t;
struct reg { uint64_t r_rip, r_rsp, r_rax, r_rflags; };
static struct reg cpu, original;
static unsigned steps, restores, fail_step;
static int error_result, streaming_stopped, complete_return;
static int pt_getregs(pid_t p,struct reg *r){assert(p==100248);*r=cpu;return 0;}
static int pt_setregs(pid_t p,const struct reg *r){
  assert(p==100248);
  if(r->r_rip==original.r_rip){
    restores++;
    if(!fail_step)assert(complete_return&&!streaming_stopped);
  }
  cpu=*r;return 0;
}
static int pt_step_lwp(pid_t p,pid_t tid){
  assert(p==133&&tid==100248);steps++;if(steps==fail_step)return -1;
  if(cpu.r_rip==0x800006aaULL){cpu.r_rip+=2;cpu.r_rax=error_result?12:0x369350000ULL;cpu.r_rflags=error_result?1:0;streaming_stopped=1;}
  else if(cpu.r_rip==0x800006acULL){assert(!error_result);cpu.r_rip+=2;}
  else if(cpu.r_rip==0x800006aeULL){cpu.r_rip=0x800008bd5ULL;cpu.r_rsp+=8;streaming_stopped=0;complete_return=1;}
  else assert(!"Unexpected instruction");
  return 0;
}
#include "../vendor/libNineS/syscall-return.h"
static void setup(void){
  original=(struct reg){0x80000038cULL,0x7eeffbcb8ULL,4,0x247};
  cpu=original;cpu.r_rip=0x800006aaULL;cpu.r_rax=477;
  steps=restores=fail_step=0;error_result=streaming_stopped=complete_return=0;
}
int main(void){
  setup();struct reg current=cpu;
  assert(pt_complete_syscall(133,100248,0x800006aaULL,&original,&current,0x800008bd5ULL)==0x369350000ULL);
  assert(steps==3&&restores==1&&!memcmp(&cpu,&original,sizeof(cpu)));
  setup();error_result=1;current=cpu;
  assert(pt_complete_syscall(133,100248,0x800006aaULL,&original,&current,0x800008bd5ULL)==-1);
  assert(steps==2&&complete_return&&restores==1&&!memcmp(&cpu,&original,sizeof(cpu)));
  setup();fail_step=1;current=cpu;
  assert(pt_complete_syscall(133,100248,0x800006aaULL,&original,&current,0x800008bd5ULL)==-1);
  assert(restores==1&&!memcmp(&cpu,&original,sizeof(cpu)));
  setup();current=cpu;
  assert(pt_complete_syscall(133,100248,0x800006aaULL,&original,&current,0xdeadbeefULL)==-1);
  assert(complete_return&&restores==1);
  puts("Syscall return and register restoration checks passed");
}
