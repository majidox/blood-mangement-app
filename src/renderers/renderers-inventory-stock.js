(function () {
    console.log("Inventory Master Frontend Engine Operational.");

    const { ipcRenderer } = require('electron');

    // 1. Core UI Element DOM Selectors
    const tabBloodStock = document.getElementById('tabBloodStock');
    const tabSerology = document.getElementById('tabSerology');
    const headersBloodStock = document.getElementById('headersBloodStock');
    const headersSerologyStock = document.getElementById('headersSerologyStock');
    const inventoryMasterTableBody = document.getElementById('inventoryMasterTableBody');
    const liveRecentMovementsFeed = document.getElementById('liveRecentMovementsFeed');
    const reagentIngestionPanel = document.getElementById('reagentIngestionPanel');
    const manualReagentForm = document.getElementById('manualReagentForm');
    
    // 🧪 Serology Sub-Tabs DOM Selectors
    const subTabActive = document.getElementById('subTabActive');
    const subTabExpired = document.getElementById('subTabExpired');
    const subTabConsumed = document.getElementById('subTabConsumed');

    // 🩸 NEW: Blood Bags Sub-Tabs DOM Selectors
    const bloodTabActive = document.getElementById('bloodTabActive');
    const bloodTabQuarantine = document.getElementById('bloodTabQuarantine');
    const bloodTabDistributed = document.getElementById('bloodTabDistributed');

    // Filters and Inputs
    const filterCriteriaType = document.getElementById('filterCriteriaType');
    const filterCriteriaLocation = document.getElementById('filterCriteriaLocation');
    const inventorySearchField = document.getElementById('inventorySearchField');

    // 2. Local State Tracker Registers
    let currentActiveView = "blood"; 
    let currentSortRule = "newest"; 
    let currentSerologySubTab = "active"; 
    let currentBloodSubTab = "active"; 

    // Boot up UI Event Listeners
    initializeInventoryUI();

    function initializeInventoryUI() {
        // Master Tab click listeners
        if (tabBloodStock) tabBloodStock.addEventListener('click', () => switchInventoryView("blood"));
        if (tabSerology) tabSerology.addEventListener('click', () => switchInventoryView("serology"));

        // 🧪 Serology Sub-Tab click listeners
        if (subTabActive) subTabActive.addEventListener('click', () => switchSerologySubTab("active"));
        if (subTabExpired) subTabExpired.addEventListener('click', () => switchSerologySubTab("expired"));
        if (subTabConsumed) subTabConsumed.addEventListener('click', () => switchSerologySubTab("consumed"));

        // 🩸 NEW: Blood Sub-Tab click listeners
        if (bloodTabActive) bloodTabActive.addEventListener('click', () => switchBloodSubTab("active"));
        if (bloodTabQuarantine) bloodTabQuarantine.addEventListener('click', () => switchBloodSubTab("quarantine"));
        if (bloodTabDistributed) bloodTabDistributed.addEventListener('click', () => switchBloodSubTab("distributed"));

        // Live input filters monitoring events
        if (filterCriteriaType) filterCriteriaType.addEventListener('change', () => fetchAndRenderAllUI());
        if (filterCriteriaLocation) filterCriteriaLocation.addEventListener('change', () => fetchAndRenderAllUI());
        if (inventorySearchField) inventorySearchField.addEventListener('input', () => fetchAndRenderAllUI());

        // Reagent Manual Entry Form Submission Listener
        if (manualReagentForm) {
            manualReagentForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const reagentData = {
                    kitName: document.getElementById('inputKitName').value.trim(),
                    batchLotNo: document.getElementById('inputBatchLot').value.trim(),
                    availableQty: parseInt(document.getElementById('inputQty').value, 10),
                    testsPerUnit: parseInt(document.getElementById('inputTestsPerUnit').value, 10),
                    deductionPerBag: parseInt(document.getElementById('inputDeductionPerBag').value, 10),
                    currentAppCount: parseInt(document.getElementById('inputTestsPerUnit').value, 10), 
                    expiryDate: document.getElementById('inputExpiryDate').value, 
                    storageLocation: "Reagent Cabinet Shelf-3"
                };

                const result = await ipcRenderer.invoke('inventory:add-reagent', reagentData);

                if (result && result.success) {
                    manualReagentForm.reset();
                    fetchAndRenderAllUI();
                } else {
                    console.error("Failed to commit reagent batch entry records.");
                }
            });
        }

        // Run primary page build loop
        fetchAndRenderAllUI();

        const bloodTypeCards = [
            { id: 'count-A-pos', type: 'A+' }, { id: 'status-A-pos', type: 'A+' },
            { id: 'count-A-neg', type: 'A-' }, { id: 'status-A-neg', type: 'A-' },
            { id: 'count-B-pos', type: 'B+' }, { id: 'status-B-pos', type: 'B+' },
            { id: 'count-B-neg', type: 'B-' }, { id: 'status-B-neg', type: 'B-' },
            { id: 'count-O-pos', type: 'O+' }, { id: 'status-O-pos', type: 'O+' },
            { id: 'count-O-neg', type: 'O-' }, { id: 'status-O-neg', type: 'O-' },
            { id: 'count-AB-pos', type: 'AB+' }, { id: 'status-AB-pos', type: 'AB+' },
            { id: 'count-AB-neg', type: 'AB-' }, { id: 'status-AB-neg', type: 'AB-' }
        ];

        bloodTypeCards.forEach(card => {
            const el = document.getElementById(card.id);
            if (el) {
                el.parentElement.style.cursor = 'pointer';
                el.parentElement.addEventListener('click', () => {
                    if (filterCriteriaType) {
                        filterCriteriaType.value = card.type;
                        fetchAndRenderAllUI();
                    }
                });
            }
        });
    }

    /**
     * 🔄 MASTER TAB SWITCHER STATE CONTROLLER
     */
    /**
     * 🔄 MASTER TAB SWITCHER STATE CONTROLLER
     */
    function switchInventoryView(targetView) {
        if (currentActiveView === targetView) return;
        currentActiveView = targetView;

        const serologySubTabsWrapper = document.getElementById('serologySubTabsWrapper');
        const bloodSubTabsWrapper = document.getElementById('bloodSubTabsWrapper'); 
        const bloodTypeSummaryGrid = document.getElementById('bloodTypeSummaryGrid'); // ◄--- Selector for the grid row

        if (targetView === "blood") {
            if (tabBloodStock) tabBloodStock.classList.add('active');
            if (tabSerology) tabSerology.classList.remove('active');
            if (headersBloodStock) headersBloodStock.classList.remove('d-none');
            if (headersSerologyStock) headersSerologyStock.classList.add('d-none');
            if (filterCriteriaType) filterCriteriaType.classList.remove('d-none'); 
            if (reagentIngestionPanel) reagentIngestionPanel.classList.add('d-none');
            
            if (bloodSubTabsWrapper) bloodSubTabsWrapper.classList.remove('d-none');
            if (serologySubTabsWrapper) serologySubTabsWrapper.classList.add('d-none');
            
            // 🩸 SHOW the blood summary grid row on the blood tab
            if (bloodTypeSummaryGrid) bloodTypeSummaryGrid.classList.remove('d-none');
        } else {
            if (tabSerology) tabSerology.classList.add('active');
            if (tabBloodStock) tabBloodStock.classList.remove('active');
            if (headersSerologyStock) headersSerologyStock.classList.remove('d-none');
            if (headersBloodStock) headersBloodStock.classList.add('d-none');
            if (filterCriteriaType) filterCriteriaType.classList.add('d-none'); 
            if (reagentIngestionPanel) reagentIngestionPanel.classList.remove('d-none');
            
            if (bloodSubTabsWrapper) bloodSubTabsWrapper.classList.add('d-none');
            if (serologySubTabsWrapper) serologySubTabsWrapper.classList.remove('d-none');
            
            // 🧪 HIDE the blood summary grid row completely on the serology tab
            if (bloodTypeSummaryGrid) bloodTypeSummaryGrid.classList.add('d-none');
        }

        fetchAndRenderAllUI();
    }

    /**
     * 🗂️ 🧪 SEROLOGY SUB-TAB SWITCHER STATE CONTROLLER
     */
    function switchSerologySubTab(targetSubTab) {
        if (currentSerologySubTab === targetSubTab) return;
        currentSerologySubTab = targetSubTab;

        const subTabs = [subTabActive, subTabExpired, subTabConsumed];
        subTabs.forEach(tab => { if (tab) tab.classList.remove('active'); });

        if (targetSubTab === "active" && subTabActive) subTabActive.classList.add('active');
        if (targetSubTab === "expired" && subTabExpired) subTabExpired.classList.add('active');
        if (targetSubTab === "consumed" && subTabConsumed) subTabConsumed.classList.add('active');

        fetchAndRenderAllUI();
    }

    /**
     * 🗂️ 🩸 NEW: BLOOD SUB-TAB SWITCHER STATE CONTROLLER
     */
    function switchBloodSubTab(targetSubTab) {
        if (currentBloodSubTab === targetSubTab) return;
        currentBloodSubTab = targetSubTab;

        const bloodTabs = [bloodTabActive, bloodTabQuarantine, bloodTabDistributed];
        bloodTabs.forEach(tab => { if (tab) tab.classList.remove('active'); });

        if (targetSubTab === "active" && bloodTabActive) bloodTabActive.classList.add('active');
        if (targetSubTab === "quarantine" && bloodTabQuarantine) bloodTabQuarantine.classList.add('active');
        if (targetSubTab === "distributed" && bloodTabDistributed) bloodTabDistributed.classList.add('active');

        fetchAndRenderAllUI();
    }

    function updateBloodTypeSummaryGrid(rawBloodBags) {
        const counts = {
            "A+": 0, "A-": 0, "B+": 0, "B-": 0,
            "O+": 0, "O-": 0, "AB+": 0, "AB-": 0
        };

        rawBloodBags.forEach(bag => {
            const isDistributed = (bag.runtimeState === 'distributed');
            const isExpired = bag.expirationTimestamp ? (new Date(bag.expirationTimestamp) - new Date() <= 0) : false;
            const isTestIneligible = (bag.status === 'ineligible');

            if (!isDistributed && !isTestIneligible && !isExpired) {
                const type = bag.verifiedBloodType;
                if (counts.hasOwnProperty(type)) {
                    counts[type]++;
                }
            }
        });

        const elementMap = {
            "A+": { countId: "count-A-pos", statusId: "status-A-pos" },
            "A-": { countId: "count-A-neg", statusId: "status-A-neg" },
            "B+": { countId: "count-B-pos", statusId: "status-B-pos" },
            "B-": { countId: "count-B-neg", statusId: "status-B-neg" },
            "O+": { countId: "count-O-pos", statusId: "status-O-pos" },
            "O-": { countId: "count-O-neg", statusId: "status-O-neg" },
            "AB+": { countId: "count-AB-pos", statusId: "status-AB-pos" },
            "AB-": { countId: "count-AB-neg", statusId: "status-AB-neg" }
        };

        Object.keys(elementMap).forEach(type => {
            const currentCount = counts[type];
            const uiElements = elementMap[type];
            
            const countEl = document.getElementById(uiElements.countId);
            const statusEl = document.getElementById(uiElements.statusId);

            if (countEl) countEl.textContent = currentCount;

            if (statusEl) {
                statusEl.className = "badge";
                
                if (currentCount === 0) {
                    statusEl.textContent = "Empty";
                    statusEl.classList.add("bg-dark", "text-muted", "border", "border-secondary");
                } else if (currentCount <= 5) {
                    statusEl.textContent = "Critical";
                    statusEl.classList.add("bg-danger", "text-white");
                } else if (currentCount <= 10) {
                    statusEl.textContent = "Warning";
                    statusEl.classList.add("bg-warning", "text-dark");
                } else {
                    statusEl.textContent = "Optimal";
                    statusEl.classList.add("bg-primary", "text-white");
                }
            }
        });
    }

    /**
     * 📊 UNIFIED DATA FETCH & MULTI-CRITERIA FILTER ENGINE
     */
    async function fetchAndRenderAllUI() {
        try {
            const rawStock = await ipcRenderer.invoke('inventory:get-data', { 
                viewType: currentActiveView, 
                sortBy: currentSortRule 
            }) || [];

            if (currentActiveView === "blood") {
                updateBloodTypeSummaryGrid(rawStock);
            }

            const rawMovements = await ipcRenderer.invoke('inventory:get-movements') || [];

            if (inventoryMasterTableBody) inventoryMasterTableBody.innerHTML = "";
            if (liveRecentMovementsFeed) liveRecentMovementsFeed.innerHTML = "";

            const typedSearchKeyword = inventorySearchField ? inventorySearchField.value.trim().toLowerCase() : "";
            const selectedTypeFilter = filterCriteriaType ? filterCriteriaType.value : "all";
            const selectedLocationFilter = filterCriteriaLocation ? filterCriteriaLocation.value : "all";

            let processedDataRows = rawStock.filter(item => {
                if (!item) return false;
                
                let matchesSearch = true;
                if (typedSearchKeyword !== "") {
                    if (currentActiveView === "blood") {
                        matchesSearch = (item.bagId || '').toLowerCase().includes(typedSearchKeyword);
                    } else {
                        matchesSearch = (item.kitName || '').toLowerCase().includes(typedSearchKeyword) || 
                                        (item.batchLotNo || '').toLowerCase().includes(typedSearchKeyword);
                    }
                }

                let matchesType = (selectedTypeFilter === "all" || (currentActiveView === "blood" && item.verifiedBloodType === selectedTypeFilter));
                let matchesLocation = (selectedLocationFilter === "all");

                if (!matchesSearch || !matchesType || !matchesLocation) return false;

                if (currentActiveView === "serology") {
                    const quantity = parseInt(item.availableQty, 10) || 0;
                    
                    let isExpired = false;
                    if (item.expiryDate && item.expiryDate.trim() !== "") {
                        const expiryDateObj = new Date(item.expiryDate);
                        if (!isNaN(expiryDateObj.getTime())) {
                            isExpired = (expiryDateObj - new Date()) <= 0;
                        }
                    }

                    if (currentSerologySubTab === "expired") {
                        return isExpired; 
                    } else if (currentSerologySubTab === "consumed") {
                        return (quantity === 0 && !isExpired); 
                    } else {
                        return (quantity > 0 && !isExpired); 
                    }
                }

                if (currentActiveView === "blood") {
                    const isDistributed = (item.runtimeState === 'distributed');
                    const isExpired = item.expirationTimestamp ? (new Date(item.expirationTimestamp) - new Date() <= 0) : false;
                    const isTestIneligible = (item.status === 'ineligible');

                    if (currentBloodSubTab === 'active') {
                        return !isDistributed && !isTestIneligible && !isExpired;
                    }
                    if (currentBloodSubTab === 'quarantine') {
                        return !isDistributed && (isTestIneligible || isExpired);
                    }
                    if (currentBloodSubTab === 'distributed') {
                        return isDistributed;
                    }
                }

                return true;
            });

            if (!inventoryMasterTableBody) return;

            if (processedDataRows.length === 0) {
                // Fixed: set to 7 columns to cover the new Actions layout column perfectly
                inventoryMasterTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No matching assets found in current warehouse parameters.</td></tr>`;
            } else {
                processedDataRows.forEach(item => {
                    if (currentActiveView === "blood") {
                        let actionButtonHtml = "";
                        if (currentBloodSubTab === 'active') {
                            actionButtonHtml = `
                                <button class="btn btn-sm btn-outline-primary btn-checkout-bag" 
                                        data-id="${item.bagId || ''}" 
                                        style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
                                    📦 Issue
                                </button>
                            `;
                        } else {
                            actionButtonHtml = `<span class="text-muted small">-</span>`;
                        }

                        inventoryMasterTableBody.innerHTML += `
                            <tr>
                                <td style="width: 15%; color: #58a6ff; font-weight: bold; padding-left: 12px; text-align: left;">${item.bagId || ''}</td>
                                <td style="width: 12%; text-align: left;"><span class="blood-type-label-badge">${item.verifiedBloodType || ''}</span></td>
                                <td style="width: 18%; text-align: left;"><code class="text-info">${item.phenotypeProfile || ''}</code></td>
                                <td style="width: 12%; text-align: left;">${item.volume || 0} mL</td>
                                <td style="width: 18%; text-align: left;">${item.storageLocation || 'Main Cold Chain Vault'}</td>
                                <td style="width: 13%; position: relative; text-align: left; white-space: nowrap;">
                                    <span style="color: #ff7b72; background: rgba(248, 81, 73, 0.1); border: 1px solid rgba(248, 81, 73, 0.2); padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem; display: inline-block; width: 95px; text-align: center;">
                                        ${item.stockStatus || 'Available'}
                                    </span>
                                </td>
                                <td style="width: 12%; text-align: center;">
                                    ${actionButtonHtml}
                                </td>
                            </tr>`;
                    }
                });
            }

            // ⚡ FIXED PLACE: Added checkout listeners right after table rows are added to DOM
            // ⚡ CLEAN DATA ACTION BINDINGS (No UI Alerts / Alerts Removed)
            document.querySelectorAll('.btn-checkout-bag').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const targetBagId = e.target.getAttribute('data-id');
                    
                    try {
                        // Directly move the bag to distributed via database state
                        const response = await ipcRenderer.invoke('inventory:distribute-bag', {
                            bagId: targetBagId,
                            destination: "Distributed Archive"
                        });

                        if (response && response.success) {
                            // Instantly refresh so it routes cleanly into your 'Issued & Distributed' sub-tab
                            fetchAndRenderAllUI();
                        } else {
                            console.warn(`Database skipped distribution update for asset: ${targetBagId}`);
                        }
                    } catch (ipcErr) {
                        console.error("IPC Sync Fail: Fallback logged to avoid app freeze.", ipcErr);
                    }
                });
            });

            if (!liveRecentMovementsFeed) return;

            if (rawMovements.length === 0) {
                liveRecentMovementsFeed.innerHTML = `<p class="text-muted small text-center p-3">System activity stream idle.</p>`;
            } else {
                rawMovements.forEach(log => {
                    let statusColorIndicator = log.type === "addition" ? "🟢" : "🔴";
                    let logTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent';
                    liveRecentMovementsFeed.innerHTML += `
                        <div class="movement-item-log p-2 mb-2 rounded bg-dark border-secondary">
                            <div class="small fw-bold text-white-50">${statusColorIndicator} ${log.description || ''}</div>
                            <div class="item-timestamp text-muted d-flex justify-content-between mt-1" style="font-size: 0.7rem;">
                                <span>By: ${log.performedBy || 'System'}</span>
                                <span>${logTime}</span>
                            </div>
                        </div>`;
                });
            }
        } catch (error) {
            console.error("❌ Renderer IPC Error: Check your backend handlers.", error);
        }
    }
})();