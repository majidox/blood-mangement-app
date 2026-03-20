const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');




// --- 3. WINDOW MANAGEMENT ---

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Allows the use of require('electron') in your renderer scripts
            nodeIntegration: true, 
            contextIsolation: false
        }
    });

    // Hide the default top menu bar for a cleaner UI
    win.setMenuBarVisibility(false);
    
    // Loads your starting page from the src folder
    win.loadFile(path.join(__dirname, 'src/views/login.html'));
}

// Start the application once Electron is ready
app.whenReady().then(createWindow);

// Quit the app when all windows are closed (standard behavior for Windows/Linux)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});



// --- 1. DATABASE CONFIGURATION ---
// We use app.getPath('userData') to ensure Windows allows the app to write the file
// This is the safest way to handle a JSON database in Electron
const dbPath = path.join(app.getPath('userData'), 'db.json');

// Initialize the database file with an empty donor array if it doesn't exist
if (!fs.existsSync(dbPath)) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify({ donors: [] }, null, 2));
    } catch (err) {
        console.error("Main Process: Could not create DB file", err);
    }
}

// --- 2. IPC HANDLERS (The Bridge) ---
// These must be registered before the window loads to prevent "No handler registered" errors

// Fetch all donors
ipcMain.handle('get-donors', async () => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data).donors;
    } catch (error) {
        console.error("Main Process: Error reading database", error);
        return [];
    }
});

// delete selected donnor 
ipcMain.handle('delete-donor', async (event, donorId) => {
    try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        const data = JSON.parse(fileContent);

        // Keep everyone EXCEPT the donor with the matching ID
        data.donors = data.donors.filter(d => d.id !== donorId);

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        console.error("Main Process: Error deleting donor", error);
        return { success: false };
    }
});

// Save a new donor
ipcMain.handle('save-donor', async (event, donorData) => {
    try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        data.donors.push(donorData);
        
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        console.error("Main Process: Error saving donor", error);
        return { success: false, error: error.message };
    }
});

// update a  donor 
ipcMain.handle('update-donor', async (event, updatedDonor) => {
    try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Find the donor by ID and update their info
        const index = data.donors.findIndex(d => d.id === updatedDonor.id);
        if (index !== -1) {
            data.donors[index] = updatedDonor;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return { success: true };
        }
        return { success: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});



// --- 3. WINDOW MANAGEMENT ---


// Quit the app when all windows are closed (standard behavior for Windows/Linux)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
