import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'build/tests');mkdirSync(out,{recursive:true});
const zig=process.env.ZIG || 'zig';
function run(exe,args){const p=spawnSync(exe,args,{cwd:root,encoding:'utf8',env:{...process.env,ZIG_GLOBAL_CACHE_DIR:path.join(out,'zig-cache')}});assert.equal(p.status,0,p.stdout+p.stderr+(p.error||''));return p.stdout;}
test('resident controls for both supported executable profiles',()=>{
 for(const [i,profile]of JSON.parse(readFileSync(path.join(root,'menu/profiles.json'))).entries()){
  const exe=path.join(out,'resident-'+i+'.exe');
  run(zig,['cc','-O1','-DGTA_BUILD_PROFILE_HEADER='+JSON.stringify(path.join(root,'menu',profile,'build-profile.h').replaceAll('\\','/')),'tests/gta-resident-menu.c','-o',exe]);
  assert.match(run(exe,[]),/passed/i);
 }
});
test('installer rejects wrong builds and unknown hooks, rolls back write failures, and refuses duplicate installation',()=>{
 const exe=path.join(out,'installer.exe');
 run(zig,['c++','-std=c++17','-O1','-I',path.join(root,'build'),'-I',path.join(root,'payload'),'tests/installer.cpp','-o',exe]);
 assert.match(run(exe,[]),/checks passed/);
});
test('SHA-256 matches independent Node crypto across padding and menu boundaries',()=>{
 const file=path.join(out,'hash.c'),exe=path.join(out,'hash.exe');
 writeFileSync(file,'#include "sha256.h"\n#include <stdio.h>\nint main(){unsigned char b[131073],h[32];for(unsigned i=0;i<sizeof(b);i++)b[i]=(unsigned char)(i*37);unsigned sizes[]={0,1,55,56,63,64,65,127,128,256,131072,131073};for(unsigned n=0;n<sizeof(sizes)/sizeof(sizes[0]);n++){sha256(b,sizes[n],h);for(unsigned i=0;i<32;i++)printf("%02x",h[i]);puts("");}return 0;}');
 run(zig,['cc','-O2','-I',path.join(root,'payload'),file,'-o',exe]);
 const buffer=Buffer.alloc(131073);for(let i=0;i<buffer.length;i++)buffer[i]=i*37;
 const expected=[0,1,55,56,63,64,65,127,128,256,131072,131073].map(n=>createHash('sha256').update(buffer.subarray(0,n)).digest('hex'));
 assert.deepEqual(run(exe,[]).trim().split(/\r?\n/),expected);
});
test('remote syscall completes the wrapper return before restoring GTA, including syscall errors',()=>{
 const exe=path.join(out,'syscall-return.exe');
 run(zig,['cc','-O1','tests/syscall-return.c','-o',exe]);
 assert.match(run(exe,[]),/checks passed/);
});

test('Fidelity interval ownership and rollback',()=>{
 const exe=path.join(out,'fidelity-cap.exe');
 run(zig,['cc','-O1','tests/fidelity-cap.c','-o',exe]);
 assert.match(run(exe,[]),/passed/);
});
