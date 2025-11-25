const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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

// Listen for a print-to-pdf event from the renderer process
ipcMain.on('print-to-pdf', (event, { url, filename }) => {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  pdfWindow.loadURL(url);

  pdfWindow.webContents.on('did-finish-load', () => {
    dialog.showSaveDialog({
      title: 'Save PDF',
      defaultPath: filename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    }).then(result => {
      if (!result.canceled && result.filePath) {
        // Use default printing options
        pdfWindow.webContents.printToPDF({}).then(data => {
          fs.writeFile(result.filePath, data, (error) => {
            if (error) {
              console.error('Failed to write PDF:', error);
              event.sender.send('print-to-pdf-complete', { success: false, error: error.message });
            } else {
              console.log(`PDF saved to ${result.filePath}`);
              event.sender.send('print-to-pdf-complete', { success: true, path: result.filePath });
            }
            pdfWindow.close();
          });
        }).catch(error => {
          console.error('Failed to print to PDF:', error);
          event.sender.send('print-to-pdf-complete', { success: false, error: error.message });
          pdfWindow.close();
        });
      } else {
        // User cancelled the save dialog, close the window
        pdfWindow.close();
      }
    }).catch(err => {
        console.error('Error showing save dialog:', err);
        pdfWindow.close();
    });
  });
});

// Listen for a select-directory event from the renderer process
ipcMain.on('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ['openDirectory'],
    title: 'Select Backup Directory',
    buttonLabel: 'Select Folder'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    event.sender.send('selected-directory', result.filePaths[0]);
  } else {
    event.sender.send('selected-directory', null); // Send null if cancelled
  }
});
