const { app, BrowserWindow } = require('electron');
const path = require('path');
const server = require('./server'); // Import your server.js

function createWindow () {
  console.log('createWindow called');
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html')).then(() => {
    console.log('index.html loaded');
  }).catch(err => {
    console.error('Error loading index.html:', err);
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();

  // Get the user data path
  const userDataPath = app.getPath('userData');
  console.log('Electron userData path:', userDataPath);
  const server = require('./server')(userDataPath); // Pass userDataPath to server.js

  // Start the Express server
  server.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
