import { cp, mkdir, readFile, rename, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json')));
const out = path.join(root, 'dist', `GTA-V-${pkg.version}-win-x64`);
try { await access(out); throw Error('Output already exists; move the previous package before rebuilding.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const runtime = path.resolve(process.env.ELECTRON_DIST || path.join(root, 'node_modules/electron/dist'));
await access(path.join(runtime, 'electron.exe'));
await mkdir(out, { recursive: true });
await cp(runtime, out, { recursive: true });
await rename(path.join(out, 'electron.exe'), path.join(out, 'GTA V.exe'));
const app = path.join(out, 'resources/app');
await mkdir(app, { recursive: true });
for (const file of ['desktop', 'src', 'menu', 'package.json', 'README.md', 'LICENSE', 'CREDITS.md', 'VALIDATION.md']) {
  await cp(path.join(root, file), path.join(app, file), { recursive: true });
}
await writeFile(path.join(out, 'START-HERE.txt'), 'GTA V — PS5 Story Mode Menu\r\n\r\nRun GTA V.exe. Keep the whole folder together. No Node.js or PS Neighborhood installation is needed.\r\nStart PS5Debug-NG 1.3.2 on the PS5 (only once), launch GTA and enter Story Mode.\r\nEnter the console IP and debugger port (normally 744), then Install in-game menu.\r\nL1 + D-pad Right opens the menu. You may close the PC app after installation.\r\nRestart GTA before switching from an ELF or another menu build.\r\nReinstall after closing/restarting GTA. Experimental firmware targets: 7.00-13.60, exact versions in README. 9.05 and 11.40 excluded. Only the previous 13.60 release has console validation.\r\nSupported: PPSA04263 01.000.000 and PPSA04264 01.010.002.\r\nSettings and recovery data: %APPDATA%\\GTA-V-Menu\r\n');
const profiles = JSON.parse(await readFile(path.join(root, 'menu/profiles.json')));
await writeFile(path.join(out, 'menu-manifest.json'), JSON.stringify({ version: pkg.version, profiles: await Promise.all(profiles.map(async dir => ({
  ...JSON.parse(await readFile(path.join(root, 'menu', dir, 'profile.json'))),
  imageSha256: createHash('sha256').update(await readFile(path.join(root, 'menu', dir, 'gta-bridge.bin'))).digest('hex')
}))) }, null, 2));
console.log(out);
