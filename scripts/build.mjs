import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {inspectElf} from './verify-elf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const zig=process.env.ZIG || 'zig';
const sdk=process.env.PS5_PAYLOAD_SDK || path.resolve(root, 'tools/ps5-payload-sdk');
const out=path.join(root,'build');mkdirSync(out,{recursive:true});
function run(exe,args){const r=spawnSync(exe,args,{cwd:root,encoding:'utf8',env:{...process.env,ZIG_GLOBAL_CACHE_DIR:path.join(out,'zig-cache')}});if(r.status!==0)throw Error(r.stdout+r.stderr+(r.error||''));return r;}
run(process.execPath,['scripts/build-gta-bridge.mjs']);
const list=JSON.parse(readFileSync(path.join(root,'menu/profiles.json')));
const bytes=b=>'{'+[...b].map(n=>'0x'+n.toString(16)).join(',')+'}';
const handlers=['GET_FRAME_COUNT','PLAYER_PED_ID','GET_VEHICLE_PED_IS_IN','IS_HORN_ACTIVE','GET_ENTITY_SPEED','SET_VEHICLE_FORWARD_SPEED','APPLY_FORCE_TO_ENTITY_CENTER_OF_MASS','DISABLE_CONTROL_ACTION','GET_FRAME_TIME','GET_GAME_TIMER','GET_ENTITY_COORDS','GET_WATER_HEIGHT_NO_WAVES','SET_ENTITY_COORDS_NO_OFFSET','GET_ENTITY_HEADING','SET_ENTITY_HEADING','DOES_ENTITY_EXIST'];
let assembly='.section .rodata\n',definitions='#include "profile.h"\nextern "C" {\n';const rows=[];
for(const [i,dir]of list.entries()){
 const p=JSON.parse(readFileSync(path.join(root,'menu',dir,'profile.json'))),n=JSON.parse(readFileSync(path.join(root,'menu',dir,'native-addresses.json')));
 const file=path.join(root,'menu',dir,'gta-bridge.bin'),image=readFileSync(file);
 if(image.length!==0x20000)throw Error('Wrong menu size');
 const hash=createHash('sha256').update(image).digest();
 definitions+=`extern const unsigned char menu_${i}[];\n`;
 assembly+=`.balign 16\n.global menu_${i}\nmenu_${i}:\n.incbin "${file.replaceAll('\\','/')}"\n`;
 rows.push(`{${JSON.stringify(p.titleId)},${JSON.stringify(p.version)},${p.playerRoot}ULL,${p.networkFlag}ULL,${p.scriptRegistry}ULL,${n.PLAYER_ID.handler}ULL,{${p.fingerprints.map(f=>`{${f.address}ULL,${f.length},${bytes(Buffer.from(f.sha256,'hex'))}}`).join(',')}},{${handlers.map(h=>n[h].handler+'ULL').join(',')}},menu_${i},${bytes(hash)}}`);
}
definitions+='}\nstatic const Profile profiles[]={\n'+rows.join(',\n')+'\n};\n';
writeFileSync(path.join(out,'profiles.h'),definitions);writeFileSync(path.join(out,'images.S'),assembly);
const common=['-target','x86_64-linux-none','-U__linux__','-D__FreeBSD__=11','-D__PS5__','-DETAHEN_PORT_1360=1','-isystem',path.join(sdk,'target/include'),'-march=znver2','-fPIC','-fno-stack-protector','-fno-plt','-ffunction-sections','-fdata-sections','-O2','-I',path.join(root,'payload'),'-I',out];
const objects=[];
for(const source of ['payload/main.cpp','payload/process-memory.c','vendor/libNineS/pt.c','payload/syscall-shim.S','build/images.S']){
 const object=path.join(out,path.basename(source)+'.o');objects.push(object);
 const opts=source.endsWith('.cpp')?['-std=c++17','-fno-exceptions','-fno-rtti']:[];
 run(zig,['cc',...common,...opts,'-c',path.join(root,source),'-o',object]);
}
const elf=path.join(out,'GTA-V.elf');
run(zig,['ld.lld','--eh-frame-hdr','--gc-sections','--no-dependent-libraries','--wrap=syscall','--wrap=__syscall','--wrap=ptrace','--wrap=kernel_proc_copyout','--wrap=kernel_proc_copyin','-pie','--hash-style=gnu','-z','max-page-size=0x4000','-T',path.join(sdk,'ldscripts/elf_x86_64.x'),...objects,path.join(sdk,'target/lib/crt1.o'),'-L',path.join(sdk,'target/lib'),'--start-group',path.join(sdk,'target/lib/libc.a'),'-ldl','--end-group','-lkernel_web','-lSceSysCore','-lSceLibcInternal','-o',elf]);
const report=inspectElf(readFileSync(elf));writeFileSync(path.join(out,'manifest.json'),JSON.stringify({file:'GTA-V.elf',...report,profiles:list},null,2));console.log(report);
