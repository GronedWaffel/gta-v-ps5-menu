import path from 'node:path';
import { connectGTA } from './connection.mjs';
import { selectGTAProfile } from './gta-profiles.mjs';
import { GTAStoryTrainer } from './gta-story-trainer.mjs';
import { GTANativeBridge } from './gta-native-bridge.mjs';

const directory = path.resolve(import.meta.dirname, '../menu');
export async function inspectGTA(options) {
  const connection = await connectGTA(options);
  try {
    const selected = await selectGTAProfile(connection.call, directory);
    await new GTAStoryTrainer(connection.call, selected.profile).target();
    return { titleId: selected.profile.titleId, version: selected.profile.version, firmware: connection.capabilities.firmware };
  } finally { connection.close(); }
}

export async function installGTA(options, progress = () => {}) {
  progress('Connecting to PS5Debug-NG…');
  const connection = await connectGTA(options);
  try {
    progress('Verifying GTA and Story Mode…');
    const selected = await selectGTAProfile(connection.call, directory);
    const trainer = new GTAStoryTrainer(connection.call, selected.profile);
    const bridge = new GTANativeBridge(trainer, selected.directory, path.join(options.data, 'recovery'));
    progress('Installing the in-game menu… Keep GTA running.');
    await bridge.ensure();
    const result = await bridge.installMenu();
    const before = (await bridge.read(bridge.session.base + 0x10600n, 12)).readUInt32LE();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const state = await bridge.read(bridge.session.base + 0x10600n, 12);
    await bridge.close(); // Menu remains resident; it needs no running PC process.
    return { ...result, titleId: selected.profile.titleId, version: selected.profile.version, framesAdvancing: state.readUInt32LE() > before };
  } finally { connection.close(); }
}
