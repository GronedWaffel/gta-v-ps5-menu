const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
app.setPath('userData', path.resolve(__dirname, '../build/ui-smoke-data'));
app.whenReady().then(async () => {
  let request, fail = false;
  ipcMain.handle('settings', () => ({ host: '192.168.1.100', port: 744 }));
  ipcMain.handle('run', (_event, value) => {
    request = value;
    return fail ? { error: 'Enter Story Mode and wait until your character is loaded.' } : { result: { titleId: 'PPSA04264', version: '01.010.002', framesAdvancing: true } };
  });
  const window = new BrowserWindow({ show: false, width: 960, height: 750, webPreferences: { preload: path.resolve(__dirname, '../desktop/preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await window.loadFile(path.resolve(__dirname, '../desktop/index.html'));
  async function run(code) { return window.webContents.executeJavaScript(code); }
  await new Promise(r => setTimeout(r, 300));
  assert.equal(await run("document.querySelector('#host').value"), '192.168.1.100');
  await run("document.querySelector('#check').click()");
  await new Promise(r => setTimeout(r, 100));
  assert.equal(request.action, 'check');
  assert.match(await run("document.querySelector('#status').textContent"), /Ready — PPSA04264/);
  await run("document.querySelector('#install').click()");
  await new Promise(r => setTimeout(r, 100));
  assert.equal(request.action, 'install');
  assert.match(await run("document.querySelector('#status').textContent"), /Menu installed/);
  fail = true;
  await run("document.querySelector('#check').click()");
  await new Promise(r => setTimeout(r, 100));
  assert.match(await run("document.querySelector('#status').textContent"), /Enter Story Mode/);
  assert.equal(await run("document.querySelector('#install').disabled"), false);
  assert.equal(await run('typeof require'), 'undefined');
  assert.equal(await run('document.documentElement.scrollHeight <= innerHeight'), true, 'Page must fit');
  await fs.mkdir(path.resolve(__dirname, '../build'), { recursive: true });
  await fs.writeFile(path.resolve(__dirname, '../build/desktop-preview.png'), (await window.webContents.capturePage()).toPNG());
  console.log('Desktop UI checks passed: connection, install, error recovery, sandbox and layout.');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
