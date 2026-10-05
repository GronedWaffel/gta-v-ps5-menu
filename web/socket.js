// MIT. Raw loopback TCP after the existing userland-only WebKit/ROP setup.
// The debugger is never exposed to the Internet and no kernel exploit runs here.
const bad=r=>r.hi!==0||r.low===0xffffffff;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function connectDebugger(p,chain,{now=Date.now,delay=sleep}={}){
  const result=await chain.syscall(97,2,1,0);if(bad(result)||result.low>65535)throw Error('Cannot open local debugger socket');
  const fd=result.low;let closed=false;
  const close=async()=>{if(!closed){closed=true;await chain.syscall(6,fd);}};
  try{
    const addr=p.malloc(16,1),timeout=p.malloc(16,1),data=p.malloc(65536,1),poll=p.malloc(8,1),pv=new DataView(poll.backing.buffer,poll.backing.byteOffset,8);
    [16,2,2,232,127,0,0,1,0,0,0,0,0,0,0,0].forEach((b,i)=>p.write1(addr.add32(i),b));
    p.write8(timeout,8);p.write8(timeout.add32(8),0);
    for(const opt of [0x1005,0x1006])if(bad(await chain.syscall(105,fd,0xffff,opt,timeout,16)))throw Error('Cannot set debugger timeout');
    if(bad(await chain.syscall(98,fd,addr,16)))throw Error('PS5Debug-NG is not listening on this console. Start it once in etaHEN Services, then reopen this page.');
    // The PS5 browser rejects F_SETFL on this socket. Use MSG_DONTWAIT per
    // operation instead; poll and socket timeouts still bound each request.
    pv.setInt32(0,fd,true);
    async function ready(event,deadline){
      while(now()<deadline){pv.setInt16(4,event,true);pv.setInt16(6,0,true);const n=await chain.syscall(209,poll,1,0);if(bad(n)||n.low>1)throw Error('Debugger poll failed');const events=pv.getUint16(6,true);if(events&event)return;if(events&0x38)throw Error('Debugger connection closed');await delay(8);}
      throw Error('Debugger timed out. Return to GTA and check its state before retrying.');
    }
    async function io(bytes,reading){
      let offset=0;const deadline=now()+15000;
      try{while(offset<bytes.length){if(closed)throw Error('Debugger connection closed');await ready(reading?1:4,deadline);const length=Math.min(65536,bytes.length-offset);if(!reading)data.backing.set(bytes.subarray(offset,offset+length));const n=await chain.syscall(reading?29:133,fd,data,length,reading?0x80:0x20080,0,0);if(bad(n)||!n.low||n.low>length)throw Error('Debugger '+(reading?'receive':'send')+' interrupted; installation was not retried');if(reading)bytes.set(data.backing.subarray(0,n.low),offset);offset+=n.low;}return bytes;}catch(e){await close();throw e;}
    }
    return {write:bytes=>io(bytes,false),read:length=>{if(!Number.isInteger(length)||length<0||length>4*1024*1024)throw Error('Invalid response size');return io(new Uint8Array(length),true);},close};
  }catch(e){await close();throw e;}
}
