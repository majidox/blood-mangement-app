const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win; // Keeps a global reference to your active window

// The file paths where your information is stored permanently on your machine
const usersFilePath = path.join(app.getPath('userData'), 'users-database.json');
const inventoryFilePath = path.join(app.getPath('userData'), 'blood-bags-inventory.json');
const donorsFilePath = path.join(app.getPath('userData'), 'donors-database.json');
const dbPath = path.join(__dirname, 'inventory-database.json');

// --- 1. WINDOW MANAGEMENT ---

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
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

// Quit the app when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- 2. DATABASE AUTHENTICATION CORE   loginpart --- 

function verifyCredentials(username, password) {
    if (!fs.existsSync(usersFilePath)) {
        console.log("Database file not initialized yet.");
        return null;
    }
    
    try {
        const database = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        
        // STRICT SECURITY VERIFICATION: Both username AND password must match exactly
        const foundUser = database.find(u => u.user === username && u.password === password);
        
        if (foundUser) {
            return { username: foundUser.user, role: foundUser.grade };
        }
    } catch (error) {
        console.error("Error reading unified database file:", error);
    }
    
    return null; // Reject if combination doesn't match
}

// --- 3. HELPER FUNCTIONS: FILE DATABASE CRUD ---

function readUsers() {
    if (!fs.existsSync(usersFilePath)) {
        const initialSeed = [
            { first: "Bouzouada", last: "Nail", user: "admin", grade: "admin", code: "CTS-2026-1001" }
        ];
        fs.writeFileSync(usersFilePath, JSON.stringify(initialSeed, null, 4), 'utf-8');
        return initialSeed;
    }
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
}

function writeUsers(data) {
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4), 'utf-8');
}

function readDonors() {
    if (!fs.existsSync(donorsFilePath)) {
        const initialSeed = [
            { first: "Elena", last: "Hernandez", nid: "99281", blood: "O-", antecedents: "Prior donation complete. Zero secondary reactions logged.", status: "pending", code: "DON-2026-1001" },
            { first: "Marcus", last: "Wright", nid: "99285", blood: "A+", antecedents: "", status: "eligible", code: "DON-2026-1002" }
        ];
        fs.writeFileSync(donorsFilePath, JSON.stringify(initialSeed, null, 4), 'utf-8');
        return initialSeed;
    }
    return JSON.parse(fs.readFileSync(donorsFilePath, 'utf-8'));
}

function writeDonors(data) {
    fs.writeFileSync(donorsFilePath, JSON.stringify(data, null, 4), 'utf-8');
}

function readInventory() {
    if (!fs.existsSync(inventoryFilePath)) {
        fs.writeFileSync(inventoryFilePath, JSON.stringify([], null, 4), 'utf-8');
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(inventoryFilePath, 'utf-8'));
    } catch (e) {
        console.error("Error parsing blood bags inventory database file:", e);
        return [];
    }
}

function writeInventory(data) {
    fs.writeFileSync(inventoryFilePath, JSON.stringify(data, null, 4), 'utf-8');
}

/**
 * 📦 LOAD MASTER INVENTORY STATE DATA
 */
function loadInventoryDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ bloodBags: [], serologyReagents: [], recentMovements: [] }, null, 2));
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Critical Error reading inventory ledger file:", error);
        return { bloodBags: [], serologyReagents: [], recentMovements: [] };
    }
}

/**
 * 💾 SAVE MASTER INVENTORY STATE DATA
 */
function saveInventoryDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Critical Error writing inventory ledger file:", error);
        return false;
    }
}

// ==========================================================================
// 4. MAIN PROCESS CENTRAL IPC LISTENERS HANDLERS
// ==========================================================================

let currentActiveSessionUser = null;

ipcMain.handle('auth:login', async (event, { username, password }) => {
    const allUsers = readUsers();
    const matchingUser = allUsers.find(u => 
        u.user === username && u.password === String(password)
    );
    
    if (matchingUser) {
        currentActiveSessionUser = matchingUser;
        console.log(`Login successful! Logged in as: ${matchingUser.user} (${matchingUser.grade})`);
        win.loadFile(path.join(__dirname, 'src/views/preload.html'));
        return { success: true, role: matchingUser.grade };
    } else {
        return { success: false, message: "Invalid username or password." };
    }
});

ipcMain.handle('users:get-current-session', async () => {
    return currentActiveSessionUser; 
});

ipcMain.handle('users:get-all', async () => {
    return readUsers();
});

ipcMain.handle('users:save-profile', async (event, payload) => {
    let database = readUsers();

    if (payload.isNew) {
        let highestIdNumber = 1000;
        database.forEach(profile => {
            if (profile.code && profile.code.includes('-')) {
                const structuralSegments = profile.code.split('-');
                const numericalSequence = parseInt(structuralSegments[2], 10);
                if (!isNaN(numericalSequence) && numericalSequence > highestIdNumber) {
                    highestIdNumber = numericalSequence;
                }
            }
        });

        const automaticNextId = highestIdNumber + 1;
        const fullyGeneratedIdCode = `CTS-2026-${automaticNextId}`;

        const newProfile = {
            first: payload.first,
            last: payload.last,
            user: payload.user,
            grade: payload.grade,
            password: payload.password,
            code: fullyGeneratedIdCode
        };

        database.push(newProfile);
    } else {
        const index = payload.index;
        if (database[index]) {
            if (database[index].user === "admin") {
                return { success: false, message: "Root Admin profile is system-protected and cannot be modified.", updatedList: database };
            }
            database[index].first = payload.first;
            database[index].last = payload.last;
            database[index].user = payload.user;
            database[index].grade = payload.grade;
            if (payload.password && payload.password !== "FallbackPassword2026") {
                database[index].password = payload.password;
            }
        }
    }

    writeUsers(database);
    return { success: true, updatedList: database };
});

ipcMain.handle('users:delete-profile', async (event, targetIndex) => {
    let database = readUsers();
    if (database[targetIndex]) {
        if (database[targetIndex].user === "admin") {
            return { success: false, message: "Root Admin profile is core-protected and cannot be deleted.", updatedList: database };
        }
        database.splice(targetIndex, 1);
        writeUsers(database);
        return { success: true, updatedList: database };
    }
    return { success: false, updatedList: database };
});

// --- REAL PERSISTENT DATABASE DONORS SYNC CHANNEL HANDLERS ---
ipcMain.handle('donors:get-all', async (event) => {
    const donors = readDonors();
    const inventory = readInventory();

    return donors.map(donor => {
        const matchedBag = inventory.find(bag => bag.code === donor.code);
        if (matchedBag) {
            return {
                ...donor,
                status: matchedBag.status, 
                bagId: matchedBag.bagId,
                verifiedBloodType: matchedBag.verifiedBloodType,
                bagPreservative: matchedBag.bagPreservative,
                phenotypeProfile: matchedBag.phenotypeProfile,
                approvalTimestamp: matchedBag.approvalTimestamp,
                expirationTimestamp: matchedBag.expirationTimestamp,
                comments: matchedBag.comments
            };
        }
        return {
            ...donor,
            status: donor.status || "pending"
        };
    });
});

ipcMain.handle('donors:save-profile', async (event, payload) => {
    let database = readDonors();

    if (payload.isNew) {
        let highestIdNumber = 1000;
        database.forEach(profile => {
            if (profile.code && profile.code.includes('-')) {
                const structuralSegments = profile.code.split('-');
                const numericalSequence = parseInt(structuralSegments[2], 10);
                if (!isNaN(numericalSequence) && numericalSequence > highestIdNumber) {
                    highestIdNumber = numericalSequence;
                }
            }
        });

        const automaticNextId = highestIdNumber + 1;
        const fullyGeneratedIdCode = `DON-2026-${automaticNextId}`;

        const now = new Date();
        const timestampStr = now.toLocaleDateString('fr-FR') + " " + 
                             String(now.getHours()).padStart(2, '0') + ":" + 
                             String(now.getMinutes()).padStart(2, '0');

        const newProfile = {
            first: payload.first,
            last: payload.last,
            phone: payload.phone,
            blood: payload.blood,
            antecedents: payload.antecedents,
            status: "pending", 
            code: fullyGeneratedIdCode,
            registeredAt: timestampStr
        };
        database.push(newProfile);
    } else {
        const index = payload.index;
        if (database[index]) {
            database[index].first = payload.first;
            database[index].last = payload.last;
            database[index].phone = payload.phone;
            database[index].blood = payload.blood;
            database[index].antecedents = payload.antecedents;
        }
    }

    writeDonors(database);
    return { success: true, updatedList: database };
});

ipcMain.handle('donors:delete-profile', async (event, targetIndex) => {
    let database = readDonors();
    if (database[targetIndex]) {
        database.splice(targetIndex, 1);
        writeDonors(database);
        return { success: true, updatedList: database };
    }
    return { success: false, updatedList: database };
});

ipcMain.handle('spa:fetch-module-markup', async (event, fileName) => {
    try {
        const structuralPath = path.join(__dirname, 'src', 'views', fileName); 
        return fs.readFileSync(structuralPath, 'utf-8');
    } catch (e) {
        console.error(`Failed to stream HTML layout asset for target [${fileName}]:`, e);
        return `<div style="padding:20px; color:#f85149; font-family:monospace;">
                    <h3>⚠️ SPA View Resolution Error</h3>
                    <p>Failed to read file layout target on disk path check.</p>
                </div>`;
    }
});

// --- REAL TIME LABORATORY FINALIZE ASSAY LOGGING HANDLER ---
ipcMain.handle('approvals:finalize-test', async (event, validationPackage) => {
    try {
        console.log("Backend received validation package:", validationPackage);

        const currentInventory = readInventory();
        const filteredInventory = currentInventory.filter(bag => bag.code !== validationPackage.donorCode);

        const isEligible = validationPackage.statusResult === "eligible";
        const assignedAssetId = isEligible 
            ? `BAG-2026-${Math.floor(1000 + Math.random() * 9000)}` 
            : `QUARANTINE-${validationPackage.donorCode}`;

        const dynamicBagEntry = {
            bagId: assignedAssetId,
            code: validationPackage.donorCode,
            status: validationPackage.statusResult, 
            verifiedBloodType: validationPackage.verifiedBloodType,
            phenotypeProfile: validationPackage.phenotypeProfile,
            bagPreservative: validationPackage.bagPreservative,
            approvalTimestamp: validationPackage.approvalTimestamp,
            expirationTimestamp: validationPackage.expirationTimestamp,
            comments: validationPackage.comments
        };

        filteredInventory.push(dynamicBagEntry);
        writeInventory(filteredInventory);
        
        // Simultaneously update status inside donors-database.json file!
        let donorDb = readDonors();
        const targetDonor = donorDb.find(d => d.code === validationPackage.donorCode);
        if (targetDonor) {
            targetDonor.status = validationPackage.statusResult;
            writeDonors(donorDb);
        }

        // ⚡ NEW AUTOMATION LINK: If eligible, automatically inject into inventory-database.json and deduct serology
        // ⚡ FIXED AUTOMATION LINK: Always inject into inventory-database.json so both active and quarantine display!
        const logisticsDb = loadInventoryDatabase();
        if (!logisticsDb.bloodBags) logisticsDb.bloodBags = [];
        
        logisticsDb.bloodBags.push({
            bagId: assignedAssetId,
            runtimeState: isEligible ? "active" : "quarantine", // Routes state descriptor based on result
            storageLocation: isEligible ? "Fridge A-1" : "Deep Cold C-2 (Plasma)", // Staging zone
            stockStatus: isEligible ? "Available" : "Quarantined"
        });

        // Only execute Reagent Deduction if it passed as eligible
        if (isEligible) {
            const testDropsNeeded = (validationPackage.verifiedBloodType === "AB-" || validationPackage.verifiedBloodType === "AB+") ? 2 : 1;
            let reagentKit = (logisticsDb.serologyReagents || []).find(r => r.availableQty > 0);

            if (reagentKit) {
                let currentCount = parseInt(reagentKit.currentAppCount, 10) || 0;
                let testsPerUnit = parseInt(reagentKit.testsPerUnit, 10) || 50;
                let availableBoxes = parseInt(reagentKit.availableQty, 10) || 0;

                currentCount -= testDropsNeeded;
                if (currentCount <= 0) {
                    availableBoxes -= 1; 
                    if (availableBoxes > 0) {
                        currentCount = testsPerUnit + currentCount; 
                    } else {
                        currentCount = 0; 
                    }
                }
                reagentKit.currentAppCount = currentCount;
                reagentKit.availableQty = availableBoxes;

                if (!logisticsDb.recentMovements) logisticsDb.recentMovements = [];
                logisticsDb.recentMovements.unshift({
                    movementId: `MOV-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    type: "deduction",
                    assetId: assignedAssetId,
                    description: `🤖 Auto-Ingest: Bag [${assignedAssetId}] verified. Consumed ${testDropsNeeded} drops from Reagent Batch [${reagentKit.batchLotNo}].`,
                    performedBy: "Lab Auto-Deduction System"
                });
            }
        } else {
            // Log a separate warning event for quarantine units
            if (!logisticsDb.recentMovements) logisticsDb.recentMovements = [];
            logisticsDb.recentMovements.unshift({
                movementId: `MOV-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: "quarantine",
                assetId: assignedAssetId,
                description: `⚠️ Security Alert: Unit [${assignedAssetId}] failed laboratory assay checks and was routed to Quarantine inventory.`,
                performedBy: "Lab System Validation"
            });
        }
        
        saveInventoryDatabase(logisticsDb);

        console.log(`💾 Successfully committed unit ${assignedAssetId} and processed relational automation dependencies.`);

        return {
            success: true,
            newBagData: isEligible ? {
                bagId: dynamicBagEntry.bagId,
                donorCode: dynamicBagEntry.code,
                bloodGroup: dynamicBagEntry.verifiedBloodType,
                expiresAt: dynamicBagEntry.expirationTimestamp
            } : null
        };

    } catch (error) {
        console.error("Database compilation pipeline exception:", error);
        return { success: false, message: "Internal JSON inventory write transaction failed: " + error.message };
    }
});

/* ==========================================================================
   📡 UNIFIED INVENTORY INTERACTION NETWORKING LAYER (CLEANED JOIN ENGINE)
   ========================================================================== */

// Unified single data channel handler
ipcMain.handle('inventory:get-data', async (event, payload) => {
    const { viewType, sortBy } = payload || { viewType: "blood", sortBy: "newest" };
    const logisticsDb = loadInventoryDatabase();
    
    if (viewType === "serology") {
        let reagents = [...(logisticsDb.serologyReagents || [])];
        if (sortBy === "newest") {
            reagents.sort((a, b) => new Date(b.receivedTimestamp) - new Date(a.receivedTimestamp));
        }
        return reagents;
    } 
    
    if (viewType === "blood") {
        const activeLogistics = logisticsDb.bloodBags || [];
        const bloodMaster = readInventory();

        // RELATIONAL INNER JOIN MAP: Links logistics metadata with physical attributes via bagId
        let mergedBloodStock = activeLogistics.map(logisticsItem => {
            const clinicalDetails = bloodMaster.find(masterBag => masterBag.bagId === logisticsItem.bagId);
            if (!clinicalDetails) return null;

            return {
                bagId: logisticsItem.bagId,
                runtimeState: logisticsItem.runtimeState || "active",
                storageLocation: logisticsItem.storageLocation || "Fridge A-1",
                stockStatus: logisticsItem.stockStatus || "Available",
                status: clinicalDetails.status || "eligible", // ◄--- ADD THIS THING HERE TO PASS THE INELIGIBLE CHECK
                verifiedBloodType: clinicalDetails.verifiedBloodType,
                phenotypeProfile: clinicalDetails.phenotypeProfile,
                volume: clinicalDetails.volume || 450,
                expirationTimestamp: clinicalDetails.expirationTimestamp,
                approvalTimestamp: clinicalDetails.approvalTimestamp
            };
        }).filter(item => item !== null);

        // Applying sort rule to joined schema array
        if (sortBy === "newest") {
            mergedBloodStock.sort((a, b) => new Date(b.approvalTimestamp) - new Date(a.approvalTimestamp));
        } else if (sortBy === "expiration") {
            mergedBloodStock.sort((a, b) => new Date(a.expirationTimestamp) - new Date(b.expirationTimestamp));
        }
        return mergedBloodStock;
    }

    return [];
});

// Handler to pull recent sidebar timeline events
ipcMain.handle('inventory:get-movements', async (event) => {
    const db = loadInventoryDatabase();
    return (db.recentMovements || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
});

// Handler to process manual addition of reagents
ipcMain.handle('inventory:add-reagent', async (event, reagentData) => {
    const db = loadInventoryDatabase();
    const newReagentId = `REA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const finalizedReagent = {
        reagentId: newReagentId,
        kitName: reagentData.kitName,
        batchLotNo: reagentData.batchLotNo,
        availableQty: parseInt(reagentData.availableQty, 10) || 0,
        testsPerUnit: parseInt(reagentData.testsPerUnit, 10) || 0,
        deductionPerBag: parseInt(reagentData.deductionPerBag, 10) || 0,
        currentAppCount: parseInt(reagentData.testsPerUnit, 10) || 0, 
        unitType: reagentData.unitType || "Vials",
        storageLocation: reagentData.storageLocation || "Reagent Cabinet Shelf-3",
        stockStatus: "Optimal",
        receivedTimestamp: new Date().toISOString(),
        expiryDate: reagentData.expiryDate
    };

    if (!db.serologyReagents) db.serologyReagents = [];
    db.serologyReagents.push(finalizedReagent);

    if (!db.recentMovements) db.recentMovements = [];
    db.recentMovements.unshift({
        movementId: `MOV-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "addition",
        assetId: newReagentId,
        description: `Added ${finalizedReagent.availableQty} Vials of "${finalizedReagent.kitName}" (Lot: ${finalizedReagent.batchLotNo}) to storage cabinet.`,
        performedBy: "Lab System Admin"
    });

    saveInventoryDatabase(db);
    return { success: true, data: finalizedReagent };
});

/**
 * 🧪 RELATIONAL DYNAMIC INGESTION & AUTO-DEDUCTION ENGINE
 */
ipcMain.handle('inventory:add-blood-bag', async (event, newBagData) => {
    const { bagId, verifiedBloodType, phenotypeProfile, volume, storageLocation, deductCount } = newBagData;
    
    // 1. Inject into blood-bags-inventory.json
    const bloodMaster = readInventory();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 42); 

    bloodMaster.push({
        bagId,
        verifiedBloodType,
        phenotypeProfile,
        volume: parseInt(volume, 10) || 450,
        approvalTimestamp: new Date().toISOString(),
        expirationTimestamp: expirationDate.toISOString(),
        status: "eligible"
    });
    writeInventory(bloodMaster);

    // 2. Inject state metadata into inventory-database.json
    const logisticsDb = loadInventoryDatabase();
    if (!logisticsDb.bloodBags) logisticsDb.bloodBags = [];
    
    logisticsDb.bloodBags.push({
        bagId,
        runtimeState: "active",
        storageLocation: storageLocation || "Fridge A-1",
        stockStatus: "Available"
    });

    // 3. Automated Serology Reactive Drops Calculation Matrix (-1 or -2 tests)
    const deductionTarget = parseInt(deductCount, 10) || 1;
    let reagentKit = (logisticsDb.serologyReagents || []).find(r => r.availableQty > 0);

    if (reagentKit) {
        let currentCount = parseInt(reagentKit.currentAppCount, 10) || 0;
        let testsPerUnit = parseInt(reagentKit.testsPerUnit, 10) || 50;
        let availableBoxes = parseInt(reagentKit.availableQty, 10) || 0;

        currentCount -= deductionTarget;

        if (currentCount <= 0) {
            availableBoxes -= 1; 
            if (availableBoxes > 0) {
                currentCount = testsPerUnit + currentCount; 
            } else {
                currentCount = 0; 
            }
        }

        reagentKit.currentAppCount = currentCount;
        reagentKit.availableQty = availableBoxes;

        if (!logisticsDb.recentMovements) logisticsDb.recentMovements = [];
        logisticsDb.recentMovements.unshift({
            movementId: `MOV-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "deduction",
            assetId: bagId,
            description: `Automated testing check for Bag [${bagId}] consumed ${deductionTarget} drops from Reagent Batch [${reagentKit.batchLotNo}].`,
            performedBy: "Lab Auto-Deduction System"
        });
    }

    const success = saveInventoryDatabase(logisticsDb);
    return { success };
});

/**
 * 📦 DYNAMIC BACKEND OVERRIDE TO STATE DISTRIBUTE
 */
ipcMain.handle('inventory:distribute-bag', async (event, { bagId }) => {
    const logisticsDb = loadInventoryDatabase();
    const targetedBag = (logisticsDb.bloodBags || []).find(b => b.bagId === bagId);

    if (targetedBag) {
        targetedBag.runtimeState = "distributed";
        
        if (!logisticsDb.recentMovements) logisticsDb.recentMovements = [];
        logisticsDb.recentMovements.unshift({
            movementId: `MOV-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "distribution",
            assetId: bagId,
            description: `Blood Unit asset [${bagId}] updated state status descriptor directly to Distributed Archive.`,
            performedBy: "Inventory Router"
        });

        const success = saveInventoryDatabase(logisticsDb);
        return { success };
    }
    return { success: false };
});
ipcMain.handle('dashboard:get-stats', async () => {
    const donors = readDonors();
    const masterInventory = readInventory(); // From blood-bags-inventory.json
    const logisticsDb = loadInventoryDatabase(); // From inventory-database.json

    // 1. Total Registered Donors
    const totalDonors = donors.length;

    // 2. Approved Blood Bags (Eligible and not yet distributed)
    const approvedBags = masterInventory.filter(bag => bag.status === "eligible").length;

    // 3. Current Active Stock (In the fridges right now)
    const activeStock = logisticsDb.bloodBags.filter(bag => bag.runtimeState === "active").length;

    // 4. Dispatched This Month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const dispatchedThisMonth = (logisticsDb.recentMovements || []).filter(mov => {
        const movDate = new Date(mov.timestamp);
        return mov.type === "distribution" && 
               movDate.getMonth() === currentMonth && 
               movDate.getFullYear() === currentYear;
    }).length;

    return {
        totalDonors,
        approvedBags,
        activeStock,
        dispatchedThisMonth
    };
});