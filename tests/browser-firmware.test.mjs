import test from 'node:test';
import assert from 'node:assert/strict';
import {Debugger} from '../web/debugger.js';
const word=n=>{const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,n,true);return b;};
function socket(firmware){
 const brand=new TextEncoder().encode('ps5debug-ng v1.3.2\0'),length=new Uint8Array(4);
 new DataView(length.buffer).setUint32(0,brand.length,true);
 const replies=[word(5),word(firmware),length,brand],commands=[];
 return {commands,async write(b){commands.push(new DataView(b.buffer,b.byteOffset).getUint32(4,true));},async read(n){const b=replies.shift();assert.equal(b.length,n);return b;}};
}
test('browser debugger accepts supported 12.40 protocol and checks debugger identity',async()=>{
 const wire=socket(1240);assert.match(await new Debugger(wire).identify(),/1\.3\.2/);
 assert.deepEqual(wire.commands,[0xbd000502,0xbd000500,0xbd000501]);
});
test('browser debugger rejects unsupported firmware before game operations',async()=>{
 for(const firmware of [1060,1140,1400]){const wire=socket(firmware);await assert.rejects(new Debugger(wire).identify(),/Unsupported PS5 firmware/);assert.equal(wire.commands.length,2);}
});
