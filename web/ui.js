import {rejection} from './firmware.js';
import {loadProfiles,installMenu} from './installer.js';
import {Debugger} from './debugger.js';
import {connectDebugger} from './socket.js?r=2';
import {createCounter} from './counter.js?r=3';
const button=document.getElementById('gta-load'),status=document.getElementById('status'),output=document.getElementById('console');
const reason=rejection(navigator.userAgent);button.disabled=Boolean(reason);button.textContent=reason?'Supported PS5 required':'Load GTA V menu';status.textContent=reason||'Ready · unified loader. GTA Story Mode and PS5Debug-NG must already be running.';
const counter=createCounter(document.getElementById('load-count'));const counterReady=counter.refresh();
let started=false;
const log=message=>{const row=document.createElement('div');row.textContent=message;output.appendChild(row);output.scrollTop=output.scrollHeight;status.textContent=message;};
button.addEventListener('click',async()=>{
  if(started||reason)return;started=true;button.disabled=true;button.textContent='Loading…';document.getElementById('progress').open=true;
  let debug;
  try{
    await counterReady;await counter.click();
    log('Checking menu files…');const response=await fetch('/gta/manifest.json',{cache:'no-store'});if(!response.ok)throw Error('Menu manifest unavailable');const profiles=await loadProfiles(await response.json());
    const {prepare}=await import('./runtime.js'),{p,chain}=await prepare(log);
    debug=new Debugger(await connectDebugger(p,chain));
    const allocator={async allocate(pid){const d=new Debugger(await connectDebugger(p,chain));try{return await d.allocate(pid);}finally{await d.close();}}};
    await installMenu(debug,profiles,log,allocator);button.textContent='Return to GTA';
  }catch(e){log(e.message||String(e));button.textContent='Installation stopped';}
  finally{if(debug)await debug.close().catch(()=>{});}
});
