// GPL-3.0-or-later. Browser adaptation of GronedWaffel's GTA V PC installer.
import {address,qword,u32,view} from './debugger.js';
import {sha256Hex} from '/builder/runtime/src/sha256.js';
const MAGIC=new Uint8Array([0x50,0x53,0x4e,0x47,0x54,0x56,0x32,0]), SIZE=0x20000, HASH=1459623836;
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function mapped(maps,at,length,prot=1){if(!at||!Number.isSafeInteger(at+length)||!maps.some(m=>(m.prot&prot)===prot&&at>=m.start&&at+length<=m.end))throw Error('Game memory is not ready');}
export async function loadProfiles(manifest,fetcher=fetch){
  const profiles=[];
  for(const p of manifest.profiles){const r=await fetcher(p.url);if(!r.ok)throw Error('Menu download failed; reconnect and reload');const image=new Uint8Array(await r.arrayBuffer());if(image.length!==SIZE||sha256Hex(image)!==p.sha256)throw Error('Menu checksum mismatch; reload the page online');profiles.push({...p,image});}return profiles;
}
export async function installMenu(debug,profiles,log=()=>{},allocationDebug=debug){
  await debug.identify();
  const candidates=(await debug.processes()).filter(p=>p.name==='eboot.bin');if(candidates.length!==1)throw Error('Open GTA V Story Mode and load your character first');
  const pid=candidates[0].pid,info=await debug.info(pid);
  const p=profiles.find(p=>p.titleId===info.titleId&&p.contentId===info.contentId);if(!p)throw Error('Unsupported game. Supported builds: PPSA04263 01.000.000 and PPSA04264 01.010.002.');
  if(p.image.length!==SIZE||sha256Hex(p.image)!==p.sha256)throw Error('Menu image integrity failed');
  async function validate(){
    const identity=await debug.info(pid);if(identity.titleId!==p.titleId||identity.contentId!==p.contentId)throw Error('The game changed; installation stopped');
    for(const f of p.fingerprints)if(sha256Hex(await debug.read(pid,Number(f.address),f.length))!==f.sha256)throw Error('GTA executable version mismatch; no menu installed');
    if((await debug.read(pid,Number(p.networkFlag),1))[0]!==0)throw Error('Story Mode only. GTA Online is not supported.');
    const maps=await debug.maps(pid),root=address(await debug.read(pid,Number(p.playerRoot),8));mapped(maps,root,16);
    const ped=address(await debug.read(pid,root+8,8));mapped(maps,ped,0x1098,3);
    const raw=await debug.read(pid,ped,0x1098),health=view(raw).getFloat32(0x250,true),max=view(raw).getFloat32(0x254,true);
    if(!Number.isFinite(health)||!Number.isFinite(max)||health<=0||max<=0||max>100000||health>max*10)throw Error('Wait for a living Story Mode character to load');
    mapped(maps,address(raw,0x1088),Number(p.runOffset)+4,3);mapped(maps,address(raw,0x1090),0x72,3);
    return maps;
  }
  await validate();log('Matched GTA V '+p.titleId+' / '+p.version);
  async function table(){
    const g=await debug.read(pid,Number(p.scriptRegistry),0x58),v=view(g),count=v.getUint32(0x50,true);if(!count||count>65536||v.getUint32(0x1c,true)!==16)throw Error('Invalid Story script registry');
    const buckets=address(g,0x48),entries=address(g,0x40),pool=address(g,8);let index=view(await debug.read(pid,buckets+(HASH%count)*4,4)).getInt32(0,true);
    for(let hops=0;index>=0&&index<16384&&hops<16384;hops++){
      const e=view(await debug.read(pid,entries+index*12,12));if(e.getUint32(0,true)===HASH){const slot=e.getInt32(4,true);if(slot<0||slot>=16384)break;const program=address(await debug.read(pid,pool+slot*16,8)),h=await debug.read(pid,program,0x78),hv=view(h);if(hv.getUint32(0x58,true)!==HASH)break;const n=hv.getUint32(0x2c,true);if(!n||n>8192)break;return {at:address(h,0x40),n};}index=e.getInt32(8,true);
    }throw Error('Story script is not ready. Return to the game before trying again.');
  }
  const t=await table(),natives=await debug.read(pid,t.at,t.n*8),original=Number(p.original),slots=[];
  for(let i=0;i<t.n;i++)if(address(natives,i*8)===original)slots.push(t.at+i*8);
  if(slots.length!==1){
    // Detect only an exact copy of our resident code, not an arbitrary foreign hook.
    const maps=await debug.maps(pid);let matches=0;
    if(!slots.length)for(let i=0;i<t.n;i++){
      const at=address(natives,i*8);if(at%0x4000||!maps.some(m=>(m.prot&7)===7&&at>=m.start&&at+SIZE<=m.end))continue;
      const header=await debug.read(pid,at+0x10000,16);if(!same(header.subarray(0,8),MAGIC)||address(header,8)!==original)continue;
      if(same(await debug.read(pid,at,0x10000),p.image.subarray(0,0x10000)))matches++;
    }
    if(matches===1){log('This menu is already installed. Return to GTA.');return {alreadyInstalled:true,titleId:p.titleId};}
    throw Error('A different menu or hook is present. Restart GTA before changing installers.');
  }
  const slot=slots[0];log('Allocating through PS5Debug-NG…');
  // Same allocation command, size, chunking and publication order as the PC app.
  const base=await allocationDebug.allocate(pid);mapped(await debug.maps(pid),base,SIZE,7);
  const image=p.image.slice();image.set(MAGIC,0x10000);image.set(qword(original),0x10008);
  p.frameNatives.forEach((at,i)=>image.set(qword(Number(at)),0x10550+i*8));
  async function checked(at,before,after){await validate();if(!same(await debug.read(pid,at,before.length),before))throw Error('Memory changed; write refused');await debug.write(pid,at,after);if(!same(await debug.read(pid,at,after.length),after))throw Error('Menu write did not verify; restart GTA before retrying');}
  for(let offset=0;offset<SIZE;offset+=4096){await checked(base+offset,new Uint8Array(4096),image.subarray(offset,offset+4096));if(offset%16384===0)log('Uploading menu: '+Math.round((offset+4096)/SIZE*100)+'%');}
  const current=await table();if(current.at!==t.at||current.n!==t.n)throw Error('Story script changed; menu was not activated');
  await checked(slot,qword(original),qword(base));
  await checked(base+0x105fc,u32(0),u32(1));
  log('Menu installed. Return to GTA and press L1 + D-pad Right.');
  return {installed:true,titleId:p.titleId,version:p.version};
}
