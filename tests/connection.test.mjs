import test from 'node:test';
import assert from 'node:assert/strict';
import { connectGTA, validateEndpoint } from '../src/connection.mjs';

function fixture(firmware = '13.60') {
  const memory = Buffer.alloc(16, 1), writes = [];
  let closed = false, active = 0, maxActive = 0;
  class Debug {
    async connect() { this.connected = true; }
    async detectCapabilities() { return { firmware, branding: 'ps5debug-NG v1.3.2' }; }
    close() { closed = true; this.connected = false; }
    async read(_pid, at, length) { maxActive = Math.max(maxActive, ++active); await new Promise(r => setTimeout(r, 2)); active--; return Buffer.from(memory.subarray(Number(at), Number(at) + length)); }
    async writeMemory(_pid, at, value) { writes.push(Buffer.from(value)); value.copy(memory, Number(at)); }
  }
  return { Debug, memory, writes, get closed() { return closed; }, get maxActive() { return maxActive; } };
}
const options = { host: '192.168.1.100', port: 744, identity: 'local-test' };
test('validates endpoint and closes rejected firmware without writes', async () => {
  assert.throws(() => validateEndpoint('https://example.com', 744));
  assert.throws(() => validateEndpoint('192.168.1.100', 0));
  const f = fixture('11.40');
  await assert.rejects(connectGTA({ ...options, Debug: f.Debug }), /experimental target list/);
  assert.equal(f.closed, true); assert.equal(f.writes.length, 0);
});
test('direct connection refuses stale compare-and-write and verifies successful writes', async () => {
  const f = fixture(), c = await connectGTA({ ...options, Debug: f.Debug });
  try {
    await assert.rejects(c.call('memory_write', { pid: 1, address: '0', expectedHex: '0000', hex: '0202' }), /changed/);
    assert.equal(f.writes.length, 0);
    const result = await c.call('memory_write', { pid: 1, address: '0', expectedHex: '0101', hex: '0202' });
    assert.deepEqual(result, { verified: true, after: '0202' });
    await assert.rejects(c.call('memory_write', { pid: 1, address: '0', expectedHex: '0202', hex: '03' }), /sizes/);
    await assert.rejects(c.call('load_payload'), /Unsupported/);
    assert.equal(f.writes.length, 1);
  } finally { c.close(); }
  assert.equal(f.closed, true);
});
test('concurrent install operations are serialized through one private connection', async () => {
  const f = fixture(), c = await connectGTA({ ...options, Debug: f.Debug });
  try {
    const write = value => c.call('memory_write', { pid: 1, address: '0', expectedHex: '0101', hex: value });
    const results = await Promise.allSettled([write('0202'), write('0303')]);
    assert.deepEqual(results.map(r => r.status), ['fulfilled', 'rejected']);
    assert.equal(f.writes.length, 1); assert.equal(f.maxActive, 1);
    assert.equal((await c.call('status')).profile.host, options.host);
  } finally { c.close(); }
});

test('all exact experimental firmware targets connect without granting extra game profiles',async()=>{
 const {ps5FirmwareTargets}=await import('../src/ps5-firmware.mjs');
 for(const fw of ps5FirmwareTargets){const f=fixture(fw),c=await connectGTA({...options,Debug:f.Debug});assert.equal(c.capabilities.firmware,fw);assert.equal(f.writes.length,0);c.close();}
 for(const fw of ['9.05','11.40','13.61',null]){const f=fixture(fw);await assert.rejects(connectGTA({...options,Debug:f.Debug}),/experimental target list/);assert.equal(f.writes.length,0);}
});
