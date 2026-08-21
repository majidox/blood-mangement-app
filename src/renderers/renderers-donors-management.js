(function () {
    console.log("CTS Donors Management Engine Active.");

    const { ipcRenderer } = require('electron');

    // DOM Selectors
    const toggleDonorFormBtn = document.getElementById('toggleDonorFormBtn');
    const dmTableView = document.getElementById('dmTableView');
    const dmFormView = document.getElementById('dmFormView');
    const dmFormCancelBtn = document.getElementById('dmFormCancelBtn');
    const hospitalDonorForm = document.getElementById('hospitalDonorForm');
    const dmTableBody = document.getElementById('dmTableBody');
    const dmSearchInput = document.getElementById('dmSearchInput');
    const dmBloodFilter = document.getElementById('dmBloodFilter');
    const dmFormActionState = document.getElementById('dmFormActionState');
    const editingDonorRowIndex = document.getElementById('editingDonorRowIndex');

    let localDonorsCache = [];
    let selectedDonorIndexForPrint = null;
    let currentUserRole = "staff"; // Default baseline privilege level

    // 1. UNIFIED TOAST ENGINE DISMISSAL SYSTEM
    function spawnToast(message, type = "success") {
        const container = document.getElementById('dmToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `um-toast ${type}`;
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.transform = 'translateY(-10px)';
        
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    // 2. PRIVILEGE ENFORCEMENT SYNC SYSTEM
   async function checkSecurityPrivileges() {
        try {
            // Asks the new backend handler for the active logged-in profile matrix
            const activeSession = await ipcRenderer.invoke('users:get-current-session'); 
            
            console.log("Active Session Token Context Found:", activeSession);

            if (activeSession && activeSession.grade && activeSession.grade.toLowerCase().trim() === "admin") {
                currentUserRole = "admin";
            } else {
                currentUserRole = "staff"; // Biologists and others get secure staff rules
            }
            
            console.log("Current Resolved Security Access Level Assigned:", currentUserRole);
        } catch (e) {
            console.error("Privilege verification failure:", e);
            currentUserRole = "staff"; 
        }
    }

    async function syncDonorsFromDatabase() {
        try {
            localDonorsCache = await ipcRenderer.invoke('donors:get-all');
            // Rebuild grid only after global state arrays are updated
            rebuildDonorsGridTable();
        } catch (err) {
            spawnToast("Failed to retrieve system donor directory entries.", "error");
        }
    }

    // 3. ENHANCED SEARCH & DATA GRID GENERATOR
    function rebuildDonorsGridTable() {
        if (!dmTableBody) return;
        dmTableBody.innerHTML = "";

        // Normalize text search queries defensively to avoid system type faults
        const searchValue = dmSearchInput ? dmSearchInput.value.toLowerCase().trim() : "";
        const bloodFilterValue = dmBloodFilter ? dmBloodFilter.value : "all";

        let activeCount = 0;
        let rareCount = 0;
        let pendingCount = 0;

        localDonorsCache.forEach((donor, idx) => {
            if (donor.status === "eligible") activeCount++;
            if (donor.status === "pending") pendingCount++;
            if (donor.blood === "O-") rareCount++;

            // 🔍 ENHANCED SAFE SEARCH LOOKUPS: Safe string checking protects against blank items breaking search
            const firstName = (donor.first || "").toLowerCase();
            const lastName = (donor.last || "").toLowerCase();
            const phoneStr = (donor.phone || "").toLowerCase();
            const uniqueCode = (donor.code || "").toLowerCase();

            const matchesSearch = firstName.includes(searchValue) || 
                                  lastName.includes(searchValue) || 
                                  phoneStr.includes(searchValue) || 
                                  uniqueCode.includes(searchValue);

            const matchesFilter = (bloodFilterValue === "all") || (donor.blood === bloodFilterValue);

            if (!matchesSearch || !matchesFilter) return;

            // 🔒 ROLE SECURITY ACCESS CHECK: Base print utility is shared; management tools belong strictly to Admin profiles
            let actionBlockHtml = `<button class="um-action-btn print" data-index="${idx}" title="Print Label">🖨️ Print</button>`;
            
            if (currentUserRole === "admin") {
                actionBlockHtml += `
                    <button class="um-action-btn edit" data-index="${idx}">✏️</button>
                    <button class="um-action-btn delete" data-index="${idx}">❌</button>
                `;
            }

            const tr = document.createElement('tr');
            tr.className = "animate-fade-in";
            tr.innerHTML = `
                <td>
                    <div class="um-user-cell">
                        <div class="um-avatar" style="color:#ff3838;">🩸</div>
                        <div class="um-user-info">
                            <span class="u-name">${donor.first || ""} ${donor.last || ""}</span>
                            <span style="font-size:0.72rem; color:#8b949e; display:block;">Tel: ${donor.phone || "N/A"}</span>
                        </div>
                    </div>
                </td>
                <td><code class="um-code-id" style="color:#ff3838;">${donor.blood || "UNKNOWN"}</code></td>
                <td style="font-size:0.85rem; font-family:monospace; color:#8b949e;">${donor.registeredAt || '--/--/---- --:--'}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.85rem; color:#c9d1d9;">
                    ${donor.antecedents ? donor.antecedents : '<span style="color:#484f58;">No antecedents logged</span>'}
                </td>
                <td><span class="badge-status-p ${donor.status || "pending"}">${donor.status || "pending"}</span></td>
                <td><div class="um-action-group">${actionBlockHtml}</div></td>
            `;
            dmTableBody.appendChild(tr);
        });

        if (document.getElementById('totalDonorsCount')) document.getElementById('totalDonorsCount').textContent = activeCount;
        if (document.getElementById('rareDonorsCount')) document.getElementById('rareDonorsCount').textContent = String(rareCount).padStart(2, '0');
        if (document.getElementById('pendingDonorsCount')) document.getElementById('pendingDonorsCount').textContent = String(pendingCount).padStart(2, '0');
    }

    // Toggle Form Views Control Actions
    if (toggleDonorFormBtn) {
        toggleDonorFormBtn.addEventListener('click', () => {
            hospitalDonorForm.reset();
            dmFormActionState.value = "create";
            document.getElementById('dmFormSubmitBtn').textContent = "Save Donor Record";
            toggleDonorFormBtn.classList.add('um-element-hidden');
            dmTableView.classList.add('um-element-hidden');
            dmFormView.classList.remove('um-element-hidden');
        });
    }

    if (dmFormCancelBtn) {
        dmFormCancelBtn.addEventListener('click', () => {
            dmFormView.classList.add('um-element-hidden');
            dmTableView.classList.remove('um-element-hidden');
            if (toggleDonorFormBtn) toggleDonorFormBtn.classList.remove('um-element-hidden');
        });
    }

    if (hospitalDonorForm) {
        hospitalDonorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                isNew: (dmFormActionState.value === "create"),
                index: dmFormActionState.value === "create" ? null : parseInt(editingDonorRowIndex.value, 10),
                first: document.getElementById('dFirstName').value.trim(),
                last: document.getElementById('dLastName').value.trim(),
                phone: document.getElementById('dPhone').value.trim(),
                blood: document.getElementById('dBloodType').value,
                antecedents: document.getElementById('dAntecedents').value.trim()
            };

            const response = await ipcRenderer.invoke('donors:save-profile', payload);
            if (response.success) {
                localDonorsCache = response.updatedList;
                spawnToast(payload.isNew ? "Donor saved safely into system index arrays." : "Donor database profiles modified.");
                dmFormCancelBtn.click();
                rebuildDonorsGridTable();

                if (payload.isNew) {
                    selectedDonorIndexForPrint = localDonorsCache.length - 1;
                    triggerUnifiedPrintModalOverlay();
                }
            }
        });
    }

    // Table Interaction Listeners Delegate Hooks
    if (dmTableBody) {
        dmTableBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.um-action-btn.edit');
            const deleteBtn = e.target.closest('.um-action-btn.delete');
            const printBtn = e.target.closest('.um-action-btn.print');

            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const currentData = localDonorsCache[index];

                document.getElementById('dFirstName').value = currentData.first;
                document.getElementById('dLastName').value = currentData.last;
                document.getElementById('dPhone').value = currentData.phone;
                document.getElementById('dBloodType').value = currentData.blood;
                document.getElementById('dAntecedents').value = currentData.antecedents || "";

                dmFormActionState.value = "update";
                editingDonorRowIndex.value = index;
                document.getElementById('dmFormSubmitBtn').textContent = "Save Changes";

                if (toggleDonorFormBtn) toggleDonorFormBtn.classList.add('um-element-hidden');
                dmTableView.classList.add('um-element-hidden');
                dmFormView.classList.remove('um-element-hidden');
            }

            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                displaySystemConfirmationModal("Delete Donor Entry", `Are you sure you want to delete ${localDonorsCache[index].first}?`, async () => {
                    const response = await ipcRenderer.invoke('donors:delete-profile', index);
                    if (response.success) {
                        localDonorsCache = response.updatedList;
                        spawnToast("Donor entry erased completely from disk registry.", "error");
                        rebuildDonorsGridTable();
                    }
                });
            }

            if (printBtn) {
                selectedDonorIndexForPrint = parseInt(printBtn.getAttribute('data-index'));
                triggerUnifiedPrintModalOverlay();
            }
        });
    }

    function displaySystemConfirmationModal(title, text, confirmCallback) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'um-modal-overlay animate-fade-in';
        modalOverlay.innerHTML = `
            <div class="um-modal-card animate-scale-up">
                <div class="um-modal-icon" style="color:#ff3838;">⚠️</div>
                <h3>${title}</h3>
                <p>${text}</p>
                <div class="um-modal-footer">
                    <button id="modalConfirmBtn" class="um-btn-submit" style="background:#ff3838;">Erase Entry</button>
                    <button id="modalCancelBtn" class="um-btn-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        modalOverlay.querySelector('#modalConfirmBtn').addEventListener('click', () => {
            confirmCallback();
            modalOverlay.remove();
        });
        modalOverlay.querySelector('#modalCancelBtn').addEventListener('click', () => modalOverlay.remove());
    }

    function triggerUnifiedPrintModalOverlay() {
        const donor = localDonorsCache[selectedDonorIndexForPrint];
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'um-modal-overlay animate-fade-in';
        modalOverlay.innerHTML = `
            <div class="um-modal-card animate-scale-up" style="max-width: 380px; text-align: left; background:#161b22; color:#fff;">
                <h3 style="text-align: center; margin-bottom: 4px;">🖨️ Print Donor Label</h3>
                <p style="text-align: center; font-size:0.85rem; color:#8b949e; margin-bottom: 20px;">Target Name: <strong>${donor.last} ${donor.first}</strong></p>
                
                <div class="um-input-group" style="margin-bottom: 20px;">
                    <label>Number of Copies to Print</label>
                    <input type="number" id="labelOutputCopies" value="1" min="1" max="20" style="width:100%; padding:10px; box-sizing:border-box; background:#0d1117; color:#fff; border:1px solid #30363d; border-radius:6px; font-size:1rem; font-weight:bold; text-align:center;">
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button id="executeThermalSpoolAction" class="um-btn-submit" style="background:#0078ff; font-weight:bold; padding:12px;">Execute Print Job</button>
                    <button id="abortPrintSpoolAction" class="um-btn-cancel" style="width:100%; text-align:center;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        modalOverlay.querySelector('#abortPrintSpoolAction').addEventListener('click', () => modalOverlay.remove());

        modalOverlay.querySelector('#executeThermalSpoolAction').addEventListener('click', () => {
            const count = parseInt(document.getElementById('labelOutputCopies').value, 10) || 1;
            modalOverlay.remove();
            renderVectorHighDefinitionBarcodeLabel(count);
        });
    }

    function renderVectorHighDefinitionBarcodeLabel(copies) {
        const donor = localDonorsCache[selectedDonorIndexForPrint];
        const safeCopies = parseInt(copies, 10) || 1;
        
        const targetWidthMm  = 40;   
        const targetHeightMm = 25;   
        const barLinesWidth  = 2.0;  
        const barLinesHeight = 45;   
        const headerFontSize = 13;   
        const footerFontSize = 11;   

        const rawNumbersOnly = donor.code.replace(/[^0-9]/g, '');
        const fourDigitNumericId = rawNumbersOnly.slice(-4).padStart(4, '0');

        let printQueueHtmlBuffer = "";

        for (let copy = 1; copy <= safeCopies; copy++) {
            printQueueHtmlBuffer += `
                <div class="thermal-label-break" style="width: ${targetWidthMm}mm; height: ${targetHeightMm}mm; max-width: ${targetWidthMm}mm; max-height: ${targetHeightMm}mm; box-sizing: border-box; padding: 2px 6px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: #fff; color: #000; overflow: hidden; font-family: 'Arial', sans-serif; page-break-after: always;">
                    <div style="font-size: ${headerFontSize}px; font-weight: 900; text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; line-height: ${headerFontSize + 2}px; border-bottom: 1.5px solid #000; padding-bottom: 1px; flex-shrink: 0;">
                        ${donor.last} ${donor.first}
                    </div>
                    <div style="display: flex; justify-content: center; align-items: center; width: 100%; flex-grow: 1; overflow: hidden; margin: 2px 0; padding: 0; background: #fff;">
                        <canvas id="barcode-canvas-copy-${copy}" style="display: block; max-width: 100%; object-fit: contain;"></canvas>
                    </div>
                    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: ${footerFontSize}px; font-weight: bold; border-top: 1px dashed #000; padding-top: 3px; line-height: ${footerFontSize + 2}px; flex-shrink: 0; background: #fff;">
                        <span style="font-family: monospace; font-size: ${footerFontSize + 1}px; white-space: nowrap; letter-spacing: 0.5px;">ID: ${fourDigitNumericId}</span>
                        <span style="background: #000; color: #fff; padding: 1px 6px; font-size: ${footerFontSize}px; border-radius: 2px; font-weight: 900; min-width: 22px; text-align: center; display: inline-block;">${donor.blood}</span>
                    </div>
                </div>
            `;
        }

        let spoolFrame = window.open('', '_blank', `width=480,height=360,scrollbars=yes,resizable=yes`);
        if (!spoolFrame) {
            spawnToast("Print spool window blocked by system configuration.", "error");
            return;
        }

        spoolFrame.document.write(`
            <html>
            <head>
                <title>CTS Spooler</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 20px; background: #525659; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                    .thermal-label-break { background: #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.5); flex-shrink: 0; }
                    @media print {
                        @page { size: ${targetWidthMm}mm ${targetHeightMm}mm; margin: 0 !important; }
                        html, body {
                         background: #fff;
                            margin: 0 !important;
                            padding: 0 !important;
                            width: ${targetWidthMm}mm !important;
                            height: ${targetHeightMm}mm !important;
                            overflow: hidden;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                                                    }
                        .thermal-label-break { 
                             page-break-after: always !important; 
                            page-break-inside: avoid !important;
                            margin: 0 !important; 
                            box-shadow: none !important; 
                            border: none !important;
                            width: ${targetWidthMm}mm !important;
                            height: ${targetHeightMm}mm !important;
                            overflow: hidden;                     
                               }
                    }
                </style>
            </head>
            <body>
                ${printQueueHtmlBuffer}
                <script>
                    window.onload = function() {
                        try {
                            for (let i = 1; i <= ${safeCopies}; i++) {
                                const canvasId = "barcode-canvas-copy-" + i;
                                JsBarcode("#" + canvasId, "${fourDigitNumericId}", {
                                    format: "CODE128C",   
                                    width: ${barLinesWidth},   
                                    height: ${barLinesHeight}, 
                                    displayValue: false, 
                                    margin: 0,           
                                    background: "#fff",
                                    lineColor: "#000"
                                });
                            }
                            setTimeout(function() { window.print(); }, 350);
                        } catch (err) {
                            console.error(err);
                        }
                    };
                </script>
            </body>
            </html>
        `);
        spoolFrame.document.close();
    }

    // 🔍 REAL-TIME INPUT EVENT LISTENERS FOR SEARCH SYNCHRONIZATION
    if (dmSearchInput) dmSearchInput.addEventListener('input', rebuildDonorsGridTable);
    if (dmBloodFilter) dmBloodFilter.addEventListener('change', rebuildDonorsGridTable);

    // Initial Core Sequence Execution Trigger
    async function initializeEngine() {
        try {
            console.log("Starting privilege sync...");
            // 1. Force the system to wait until the role is verified from the backend
            await checkSecurityPrivileges(); 
            
            console.log("Privileges resolved. Syncing donors cache...");
            // 2. Fetch data from disk and build the layout grid
            await syncDonorsFromDatabase();
            
        } catch (error) {
            console.error("Initialization loop crash:", error);
        }
    }

    // Fire the secure start engine sequence
    initializeEngine();



})();