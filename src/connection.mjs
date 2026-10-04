import {isPS5FirmwareTarget} from './ps5-firmware.mjs';
import net from 'node:net';
import { PS5Debug } from './ps5debug.mjs';
import { bytes, integer, address } from './protocol.mjs';

export function validateEndpoint(host, port) {
  if (typeof host !== 'string' || !net.isIP(host)) throw Error('Enter your PS5 IP address.');
  integer(port, 1, 65535, 'Debugger port');
  return { host, port };
}

// A private in-process adapter. No HTTP server, MCP bridge, or companion app.
export async function connectGTA({ host, port = 744, identity, Debug = PS5Debug }) {
  validateEndpoint(host, port);
  if (typeof identity !== 'string' || !identity) throw Error('Missing local installation identity');
  const debug = new Debug({ host, port });
  let tail = Promise.resolve();
  try {
    await debug.connect();
    const capabilities = await debug.detectCapabilities();
    if (!isPS5FirmwareTarget(capabilities.firmware)) throw Error('This firmware is outside the experimental target list.');
    if (!/ps5debug[- ]ng\b.*\bv1\.3\.2\b/i.test(capabilities.branding)) throw Error('Load PS5Debug-NG 1.3.2 before connecting.');
    const status = { mode: 'live', mcpWrites: true, connectionId: `${identity}:${host}:${port}`, profile: { platform: 'ps5', host, debugPort: port } };
    async function dispatch(method, args) {
      if (!debug.connected) throw Error('Debugger disconnected. Check PS5Debug-NG on the console, then retry.');
      switch (method) {
        case 'status': return structuredClone(status);
        case 'processes': return debug.processes();
        case 'process_info': return debug.info(args.pid);
        case 'maps': return debug.maps(args.pid);
        case 'memory_read': return { hex: (await debug.read(args.pid, address(args.address), args.length)).toString('hex') };
        case 'memory_write': {
          const expected = bytes(args.expectedHex), value = bytes(args.hex);
          if (value.length !== expected.length) throw Error('Compare-and-write sizes differ');
          const at = address(args.address), before = await debug.read(args.pid, at, expected.length);
          if (!before.equals(expected)) throw Error('Game memory changed; write refused.');
          await debug.writeMemory(args.pid, at, value);
          const after = await debug.read(args.pid, at, value.length);
          return { verified: after.equals(value), after: after.toString('hex') };
        }
        default: throw Error('Unsupported installer operation');
      }
    }
    return { capabilities, close: () => debug.close(), call(method, args = {}) {
      const result = tail.then(() => dispatch(method, args));
      tail = result.catch(() => {});
      return result;
    } };
  } catch (error) { debug.close(); throw error; }
}
