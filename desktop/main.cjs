const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
app.setName('GTA V');
app.setPath('userData', path.join(app.getPath('appData'), 'GTA-V-Menu'));
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
let window, busy = false, config;
app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
app.on('window-all-closed', () => app.quit());
app.whenReady().then(async () => {
  const file = path.join(app.getPath('userData'), 'settings.json');
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  try { config = JSON.parse(await fs.readFile(file, 'utf8')); } catch { config = {}; }
  config = { host: '', port: 744, ...config, identity: config.identity || randomUUID() };
  await fs.writeFile(file, JSON.stringify(config, null, 2));
  const { installGTA, inspectGTA } = await import(pathToFileURL(path.join(__dirname, '../src/install.mjs')).href);
  const { validateEndpoint } = await import(pathToFileURL(path.join(__dirname, '../src/connection.mjs')).href);
  const page = pathToFileURL(path.join(__dirname, 'index.html')).href;
  function sender(event) { if (event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== page) throw Error('Unexpected caller'); }
  ipcMain.handle('settings', event => { sender(event); return { host: config.host, port: config.port }; });
  ipcMain.handle('run', async (event, request) => {
    sender(event);
    if (busy) return { error: 'An operation is already running.' };
    busy = true;
    try {
      if (!request || !['check', 'install'].includes(request.action)) throw Error('Invalid operation');
      const endpoint = validateEndpoint(request.host, request.port);
      config = { ...config, ...endpoint };
      await fs.writeFile(file, JSON.stringify(config, null, 2));
      const options = { ...config, data: app.getPath('userData') };
      const result = request.action === 'check' ? await inspectGTA(options) : await installGTA(options, message => window.webContents.send('progress', message));
      return { result };
    } catch (error) { return { error: error.message }; }
    finally { busy = false; }
  });
  window = new BrowserWindow({ width: 960, height: 750, minWidth: 780, minHeight: 680, title: 'GTA V', backgroundColor: '#101715', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('close', event => { if (busy) { event.preventDefault(); window.webContents.send('progress', 'Wait for installation to finish before closing.'); } });
  app.on('before-quit', event => { if (busy) event.preventDefault(); });
  await window.loadURL(page);
}).catch(error => { dialog.showErrorBox('GTA V', error.message); app.quit(); });
