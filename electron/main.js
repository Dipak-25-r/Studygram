/* ============================================================
   electron/main.js — desktop wrapper for StudyGram
   Run: npm install && npm start (from /electron)
   Build EXE: npm run build  (uses electron-builder, see package.json)
   ============================================================ */
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'icon.png'), // optional — add a 256x256 png here
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the app from the sibling /app folder (copied in at build time, see package.json "files")
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
