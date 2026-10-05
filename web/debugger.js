import {supportedCode} from './firmware.js';
// GPL-3.0-or-later. PS5Debug-NG wire operations used by the working PC installer.
export const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
export function u32(n){const b=new Uint8Array(4);view(b).setUint32(0,n,true);return b;}
export function qword(n){if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid address');const b=new Uint8Array(8);view(b).setUint32(0,n>>>0,true);view(b).setUint32(4,Math.floor(n/4294967296),true);return b;}
export function address(b,offset=0){const v=view(b),n=v.getUint32(offset,true)+v.getUint32(offset+4,true)*4294967296;if(!Number.isSafeInteger(n))throw Error('Invalid debugger address');return n;}
const text=b=>String.fromCharCode(...b).split('\0')[0];
export class Debugger {
  constructor(socket){this.socket=socket;}
  async send(command,body=new Uint8Array()){
    const bytes=new Uint8Array(12+body.length),v=view(bytes);v.setUint32(0,0xffaabbcc,true);v.setUint32(4,command,true);v.setUint32(8,body.length,true);bytes.set(body,12);await this.socket.write(bytes);
  }
  async status(){const s=view(await this.socket.read(4)).getUint32(0,true);if(s!==0x80000000)throw Error('Debugger rejected command: 0x'+s.toString(16));}
  async identify(){
    await this.send(0xbd000502);if(view(await this.socket.read(2)).getUint16(0,true)!==5)throw Error('A PS5 debugger is required');
    await this.send(0xbd000500);if(!supportedCode(view(await this.socket.read(2)).getUint16(0,true)))throw Error('Unsupported PS5 firmware; choose an exact supported 11.00-13.60 profile');
    await this.send(0xbd000501);const size=view(await this.socket.read(4)).getUint32(0,true);if(size<1||size>512)throw Error('Invalid debugger identity');
    const brand=text(await this.socket.read(size));if(!/ps5debug[- ]ng\b.*\bv1\.3\.2\b/i.test(brand))throw Error('Start PS5Debug-NG 1.3.2 first');return brand;
  }
  async records(command,body,stride,max){await this.send(command,body);await this.status();const n=view(await this.socket.read(4)).getUint32(0,true);if(n>max)throw Error('Debugger response exceeds limits');return {n,bytes:await this.socket.read(n*stride)};}
  async processes(){const {n,bytes}=await this.records(0xbdaa0001,new Uint8Array(),36,4096);return Array.from({length:n},(_,i)=>({name:text(bytes.subarray(i*36,i*36+32)),pid:view(bytes).getUint32(i*36+32,true)}));}
  async info(pid){await this.send(0xbdaa000a,u32(pid));await this.status();const b=await this.socket.read(188);return {pid:view(b).getUint32(0,true),titleId:text(b.subarray(108,124)),contentId:text(b.subarray(124,188))};}
  async maps(pid){const {n,bytes}=await this.records(0xbdaa0004,u32(pid),58,65536);return Array.from({length:n},(_,i)=>({start:address(bytes,i*58+32),end:address(bytes,i*58+40),prot:view(bytes).getUint16(i*58+56,true)}));}
  packet(pid,at,length){if(!Number.isInteger(length)||length<1||length>1048576)throw Error('Invalid memory length');const b=new Uint8Array(16);b.set(u32(pid));b.set(qword(at),4);b.set(u32(length),12);return b;}
  async read(pid,at,length){await this.send(0xbdaa0002,this.packet(pid,at,length));await this.status();return this.socket.read(length);}
  async write(pid,at,bytes){await this.send(0xbdaa0003,this.packet(pid,at,bytes.length));await this.status();await this.socket.write(bytes);await this.status();}
  async allocate(pid){const b=new Uint8Array(8);b.set(u32(pid));b.set(u32(0x20000),4);await this.send(0xbdaa000b,b);await this.status();return address(await this.socket.read(8));}
  close(){return this.socket.close();}
}
