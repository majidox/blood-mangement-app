(function () {
    console.log("Laboratory Master Router Engine Mounted Successfully.");

    const { ipcRenderer } = require('electron');

    // Core Filters inside the scope without duplicates
    let activeHeaderBloodFilter = "all";
    let activeHeaderTodayOnlyFilter = false;

    // 1. Core View State Layout Panels
    const taTableViewState = document.getElementById('taTableViewState');
    const taLabFormState = document.getElementById('taLabFormState');
    const taPassportViewState = document.getElementById('taPassportViewState');
    
    // 2. Global Control Objects
    const taSearchInput = document.getElementById('taSearchInput');
    const taInventoryTableBody = document.getElementById('taInventoryTableBody');
    const taMedicalValidationForm = document.getElementById('taMedicalValidationForm');
    const taPassportReprintBtn = document.getElementById('taPassportReprintBtn');

    // 3. Metric Indicator Counters
    const taCountPending = document.getElementById('taCountPending');
    const taCountApproved = document.getElementById('taCountApproved');
    const taCountRejected = document.getElementById('taCountRejected');

    // 4. Statistics Click Cards (Fast Filters)
    const statCardPendingBtn = document.getElementById('statCardPendingBtn');
    const statCardApprovedBtn = document.getElementById('statCardApprovedBtn');
    const statCardRejectedBtn = document.getElementById('statCardRejectedBtn');

    // 5. Clinical Form Data Selectors
    const taTargetDonorName = document.getElementById('taTargetDonorName');
    const taTargetDonorCode = document.getElementById('taTargetDonorCode');
    const taForwardTyping = document.getElementById('taForwardTyping');
    const taReverseTyping = document.getElementById('taReverseTyping');
    const taBagAnticoagulant = document.getElementById('taBagAnticoagulant');
    const taEligibilityStatus = document.getElementById('taEligibilityStatus');
    const ineligibleReasonWrapper = document.getElementById('ineligibleReasonWrapper');
    const taIneligibleComment = document.getElementById('taIneligibleComment');

    // 6. Passport Profile Fields
    const passBagTitleId = document.getElementById('passBagTitleId');
    const passDonorCode = document.getElementById('passDonorCode');
    const passDonorName = document.getElementById('passDonorName');
    const passDonorPhone = document.getElementById('passDonorPhone');
    const passBloodGroup = document.getElementById('passBloodGroup');
    const passPhenotype = document.getElementById('passPhenotype');
    const passPreservative = document.getElementById('passPreservative');
    const passApprovedDate = document.getElementById('passApprovedDate');
    const passExpiresDate = document.getElementById('passExpiresDate');

    // 7. Core Memory State Registers
    let localGlobalDonorsCache = [];
    let processingTargetDonorIndex = null;
    let targetActivePassportRecord = null;
    let currentActiveFilter = "all"; // Options: "all", "pending", "approved", "ineligible"
    
    // 8. Hardware Barcode Registers
    let hardwareBarcodeStreamBuffer = "";
    let hardwareScannerLastKeystrokeTimestamp = Date.now();

    // Initialize View Layout on Startup
    synchronizeLaboratoryMasterLedger();
    initializeInputAutofocusLoop();
    bindUnifiedNavigationActions();

    const liveSearchField = document.getElementById('taSearchInput');
    if (liveSearchField) {
        liveSearchField.addEventListener('input', () => {
            synchronizeLaboratoryMasterLedger();
        });
    }

    // Direct event bindings for the new header items
    const bloodTypeSelectorDropdown = document.getElementById('taBloodTypeSelector');
    const todayOnlyToggleBtn = document.getElementById('quickFilterTodayBtn');

    if (bloodTypeSelectorDropdown) {
        bloodTypeSelectorDropdown.onchange = () => {
            activeHeaderBloodFilter = bloodTypeSelectorDropdown.value;
            synchronizeLaboratoryMasterLedger();
        };
    }

    if (todayOnlyToggleBtn) {
        todayOnlyToggleBtn.onclick = () => {
            activeHeaderTodayOnlyFilter = !activeHeaderTodayOnlyFilter;
            
            if (activeHeaderTodayOnlyFilter) {
                todayOnlyToggleBtn.style.borderColor = "#58a6ff";
                todayOnlyToggleBtn.style.color = "#58a6ff";
                todayOnlyToggleBtn.style.background = "rgba(88, 166, 255, 0.1)";
            } else {
                todayOnlyToggleBtn.style.borderColor = "#30363d";
                todayOnlyToggleBtn.style.color = "#c9d1d9";
                todayOnlyToggleBtn.style.background = "#0d1117";
            }
            synchronizeLaboratoryMasterLedger();
        };
    }

    /**
     * 🔮 UNIFIED SYSTEM OVERLAY MODAL SYSTEM
     */
    function spawnSystemOverlayAlert(title, text, type = "info") {
        if (!document.getElementById('taSearchInput')) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'um-modal-overlay animate-fade-in';
        let iconColor = "#58a6ff"; 
        let iconSymbol = "ℹ️";
        if (type === "error") { iconColor = "#ff3838"; iconSymbol = "⚠️"; }
        if (type === "success") { iconColor = "#2ea44f"; iconSymbol = "✅"; }

        modalOverlay.innerHTML = `
            <div class="um-modal-card animate-scale-up" style="max-width: 400px; background:#161b22; color:#fff; border: 1px solid #30363d; padding:24px; text-align:center; border-radius:12px;">
                <div class="um-modal-icon" style="color:${iconColor}; font-size:2.5rem; margin-bottom:12px;">${iconSymbol}</div>
                <h3 style="margin:0 0 8px 0; font-size:1.3rem;">${title}</h3>
                <p style="color:#8b949e; font-size:0.92rem; line-height:1.5; margin:0 0 20px 0;">${text}</p>
                <div class="um-modal-footer" style="display:flex; justify-content:center;">
                    <button id="modalDismissBtn" class="btn-primary-action" style="background:${iconColor}; padding:10px 24px; width:100%; border-radius:6px;">Acknowledge</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        modalOverlay.querySelector('#modalDismissBtn').addEventListener('click', () => {
            modalOverlay.remove();
            if (document.getElementById('taSearchInput')) {
                taSearchInput.focus();
            }
        });
    }

    /**
     * 🎯 NEW FIX: Added the missing dynamic routing workspace link handler!
     */
   function routeTargetBiologicalAsset(donorCode) {
        const foundIndex = localGlobalDonorsCache.findIndex(d => String(d.code) === String(donorCode));
        if (foundIndex === -1) {
            console.error("❌ Linkage Failure: Record data missing for code:", donorCode);
            return;
        }

        const targetRecord = localGlobalDonorsCache[foundIndex];
        processingTargetDonorIndex = foundIndex;

        // 🎯 1. SECURITY BLOCK: Pulls the clinical reason comment directly from the database record!
        if (targetRecord.status === "ineligible") {
            // Check if a comment exists, otherwise provide a clean fallback message
            const reasonForQuarantine = targetRecord.comments && targetRecord.comments.trim() !== "" 
                ? targetRecord.comments.trim() 
                : "No clinical comment specified at validation sign-off.";

            spawnSystemOverlayAlert(
                "⚠️ Biological Security Alert", 
                `This unit (Donor: ${targetRecord.code}) has been flagged as INELIGIBLE and quarantined.<br><br><strong>Reason / Clinical Comment:</strong><br>"${reasonForQuarantine}"`, 
                "error"
            );
            return; // Completely blocks loading the form workspace view layout sheet
        }

        // 2. PASSPORT PROFILE ROUTE: If the bag is already approved eligible, open the passport viewer sheet
        if (targetRecord.status === "eligible") {
            targetActivePassportRecord = targetRecord;
            if (passBagTitleId) passBagTitleId.textContent = targetRecord.bagId || "──";
            if (passDonorCode) passDonorCode.textContent = targetRecord.code || "──";
            if (passDonorName) passDonorName.textContent = targetRecord.name || "N/A";
            if (passDonorPhone) passDonorPhone.textContent = targetRecord.phone || "──";
            if (passBloodGroup) passBloodGroup.textContent = targetRecord.verifiedBloodType || targetRecord.blood || "⏳";
            if (passPhenotype) passPhenotype.textContent = targetRecord.phenotypeProfile || "Not Specified";
            if (passPreservative) passPreservative.textContent = targetRecord.bagPreservative || "N/A";
            
            if (passApprovedDate) passApprovedDate.textContent = targetRecord.approvalTimestamp ? new Date(targetRecord.approvalTimestamp).toLocaleDateString('en-GB') : "──";
            if (passExpiresDate) passExpiresDate.textContent = targetRecord.expirationTimestamp ? new Date(targetRecord.expirationTimestamp).toLocaleDateString('en-GB') : "──";

            if (taTableViewState) taTableViewState.classList.add('um-element-hidden');
            if (taPassportViewState) taPassportViewState.classList.remove('um-element-hidden');
        } else {
            // 3. WORKBENCH REGULAR ENTRY ROUTE: Only open for actual "pending" files
            if (taTargetDonorCode) taTargetDonorCode.textContent = targetRecord.code;
            if (taTargetDonorName) taTargetDonorName.textContent = targetRecord.name || "Anonymous Donor";
            if (taForwardTyping) taForwardTyping.value = targetRecord.blood || "";
            if (taReverseTyping) taReverseTyping.value = targetRecord.blood || "";
            if (taEligibilityStatus) {
                taEligibilityStatus.value = "pending";
                taEligibilityStatus.dispatchEvent(new Event('change'));
            }

            if (taTableViewState) taTableViewState.classList.add('um-element-hidden');
            if (taLabFormState) taLabFormState.classList.remove('um-element-hidden');
        }
    }

    /**
     * 📊 DATA SYNCHRONIZATION & GRID COMPLIANCE LAYOUT
     */
    async function synchronizeLaboratoryMasterLedger() {
        try {
            localGlobalDonorsCache = await ipcRenderer.invoke('donors:get-all');
            const totalPending = localGlobalDonorsCache.filter(d => d.status === "pending").length;
            const totalApproved = localGlobalDonorsCache.filter(d => d.status === "eligible").length; 
            const totalRejected = localGlobalDonorsCache.filter(d => d.status === "ineligible").length;

            if (taCountPending) taCountPending.textContent = String(totalPending).padStart(2, '0');
            if (taCountApproved) taCountApproved.textContent = String(totalApproved).padStart(2, '0');
            if (taCountRejected) taCountRejected.textContent = String(totalRejected).padStart(2, '0');

            taInventoryTableBody.innerHTML = "";

            let filteredDataset = localGlobalDonorsCache;
            if (currentActiveFilter === "pending") filteredDataset = localGlobalDonorsCache.filter(d => d.status === "pending");
            if (currentActiveFilter === "approved") filteredDataset = localGlobalDonorsCache.filter(d => d.status === "eligible");
            if (currentActiveFilter === "ineligible") filteredDataset = localGlobalDonorsCache.filter(d => d.status === "ineligible");

            const searchFieldElement = document.getElementById('taSearchInput');
            const searchQuery = searchFieldElement ? searchFieldElement.value.toLowerCase().trim() : "";
            
            // 🎯 FIXED: This now runs cleanly whether the query is filled OR empty!
            if (searchQuery !== "") {
                filteredDataset = filteredDataset.filter(record => {
                    const donorIdStr = record.code ? String(record.code).toLowerCase() : "";
                    const bagIdStr = record.bagId ? String(record.bagId).toLowerCase() : "";
                    return donorIdStr.includes(searchQuery) || bagIdStr.includes(searchQuery);
                });
            }

            if (activeHeaderBloodFilter !== "all") {
                filteredDataset = filteredDataset.filter(record => {
                    const groupType = record.verifiedBloodType || record.blood || "";
                    return groupType.trim().toUpperCase() === activeHeaderBloodFilter.toUpperCase();
                });
            }

            if (activeHeaderTodayOnlyFilter) {
                const todayCalendarString = new Date().toDateString();
                filteredDataset = filteredDataset.filter(record => {
                    const timestamp = record.approvalTimestamp || record.dateString;
                    if (!timestamp) return false;
                    return new Date(timestamp).toDateString() === todayCalendarString;
                });
            }

            filteredDataset.sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (a.status !== "pending" && b.status === "pending") return 1;

                const timeA = a.approvalTimestamp || a.dateString || 0;
                const timeB = b.approvalTimestamp || b.dateString || 0;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
            });

            // 🎯 FIXED: Always updates the registry file count in the header live
            const statusSummaryText = document.getElementById('liveLedgerStatusCounter');
            if (statusSummaryText) {
                statusSummaryText.textContent = `Showing ${filteredDataset.length} matching files`;
            }

            if (filteredDataset.length === 0) {
                taInventoryTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#8b949e; padding:32px;">No laboratory records match active criteria matrix selection.</td></tr>`;
                return; // Safely stops if no rows exist
            }

            filteredDataset.forEach((record) => {
                const tableRow = document.createElement('tr');
                
                if (record.status === "pending") {
                    tableRow.style.background = "rgba(219, 109, 40, 0.03)";
                }

                const hasType = record.verifiedBloodType && record.verifiedBloodType.trim() !== "";
                const bloodDisplayType = hasType ? record.verifiedBloodType : (record.blood || "⏳");
                const assignedBagId = record.bagId || `PENDING-${record.code}`;
                const preservativeType = record.bagPreservative || "N/A";
               
                const approvalTimestampString = record.approvalTimestamp ? new Date(record.approvalTimestamp).toLocaleDateString('en-GB') : "⏳ Pending Entry";
                const expirationTimestampString = record.expirationTimestamp ? new Date(record.expirationTimestamp).toLocaleDateString('en-GB') : "──";

                tableRow.innerHTML = `
                    <td style="font-family: monospace; font-weight: bold; color: #58a6ff;">${assignedBagId}</td>
                    <td style="font-family: monospace;">${record.code}</td>
                    <td>
                        ${hasType || record.blood ? 
                            `<span class="blood-type-badge-large">${bloodDisplayType}</span>` : 
                            `<span style="color: #db6d28; font-style: italic; font-weight: bold;">⏳ Pending Test</span>`
                        }
                    </td>
                    <td>${preservativeType}</td>
                    <td>${approvalTimestampString}</td>
                    <td>${expirationTimestampString}</td>
                    <td><span class="badge-status ${record.status}">${record.status}</span></td>
                    <td>
                        ${record.status === 'eligible' ? `<button class="row-action-btn reprint-trigger" data-code="${record.code}">🖨️ Reprint</button>` : `──`}
                    </td>
                `;

                tableRow.addEventListener('click', (e) => {
                    if (e.target && e.target.classList && e.target.classList.contains('reprint-trigger')) return; 
                    routeTargetBiologicalAsset(record.code);
                });

                const individualPrintBtn = tableRow.querySelector('.reprint-trigger');
                if (individualPrintBtn) {
                    individualPrintBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        spoolHardwareCalibratedBagLabel({
                            bagId: record.bagId,
                            expiresAt: record.expirationTimestamp,
                            bloodGroup: record.verifiedBloodType,
                            phenotype: record.phenotypeProfile,     
                            approvedAt: record.approvalTimestamp     
                        });
                    });
                }

                taInventoryTableBody.appendChild(tableRow);
            });

        } catch (err) {
            console.error("Master processing layout engine sorting error:", err);
        }
    }
    /**
     * 📡 AUTOMATIC HARDWARE SCANNER CAPTURING SYSTEM
     */
    function hardwareScannerKeydownHandler(e) {
        if (!document.getElementById('taSearchInput')) {
            window.removeEventListener('keydown', hardwareScannerKeydownHandler);
            console.log("SPA Cleaner: Dismantled laboratory event streams.");
            return;
        }

        const currentTime = Date.now();
        const timeDifference = currentTime - hardwareScannerLastKeystrokeTimestamp;
        hardwareScannerLastKeystrokeTimestamp = currentTime;

        if (timeDifference > 45) {
            hardwareBarcodeStreamBuffer = "";
        }

        if (e.key !== 'Enter') {
            if (e.key.length === 1) {
                hardwareBarcodeStreamBuffer += e.key;
            }
        } else {
            if (hardwareBarcodeStreamBuffer.length >= 4) {
                processIncomingDonorLookupQuery(hardwareBarcodeStreamBuffer);
                hardwareBarcodeStreamBuffer = ""; 
            }
        }
    }

    window.addEventListener('keydown', hardwareScannerKeydownHandler);
    if (taSearchInput) {
        taSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                processIncomingDonorLookupQuery(taSearchInput.value);
                taSearchInput.value = "";
            }
        });
    }

    function processIncomingDonorLookupQuery(queryString) {
        const extractedDigits = queryString.replace(/[^0-9]/g, '').slice(-4);
        if (!extractedDigits) return;

        const matchedRecord = localGlobalDonorsCache.find(donor => {
            const cleanCode = donor.code.replace(/[^0-9]/g, '');
            return cleanCode.endsWith(extractedDigits);
        });
        if (matchedRecord) {
            routeTargetBiologicalAsset(matchedRecord.code);
        } else {
            spawnSystemOverlayAlert("Lookup Failure", `Asset matching query (*${extractedDigits}) was not found in the laboratory node framework.`, "error");
        }
    }

    /**
     * 💾 SUBMISSION LOGISTICS MANAGEMENT PIPELINE (CRASH PROOF)
     */
    /**
     * 💾 SUBMISSION LOGISTICS MANAGEMENT PIPELINE (CRASH PROOF)
     */
    if (taMedicalValidationForm) {
        taMedicalValidationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('taSubmitFinalDecisionBtn');
            if (submitBtn.disabled) return; 

            // Prevent saving if typing elements don't match
            if (taForwardTyping && taReverseTyping) {
                if (taForwardTyping.value.toLowerCase().trim() !== taReverseTyping.value.toLowerCase().trim()) {
                    spawnSystemOverlayAlert("CRITICAL MEDICAL ERROR", "Forward blood cell grouping does not match Serum Reverse antibody grouping!", "error");
                    return;
                }
            }

            submitBtn.disabled = true;
            submitBtn.innerText = "Saving to Database...";

            try {
                const activeDonor = localGlobalDonorsCache[processingTargetDonorIndex];
                const decisionOutcome = taEligibilityStatus ? taEligibilityStatus.value : "ineligible";

                // 🎯 SAFE LOOKUP: Use optional chaining (?.) so it never crashes if a checkbox is missing
                const phenotypeString = [
                    document.getElementById('pheno_D')?.checked ? "D" : "",
                    document.getElementById('pheno_C')?.checked ? "C" : "",
                    document.getElementById('pheno_c')?.checked ? "c" : "",
                    document.getElementById('pheno_E')?.checked ? "E" : "",
                    document.getElementById('pheno_e')?.checked ? "e" : "",
                    document.getElementById('pheno_K')?.checked ? "K" : ""
                ].join('');

                const approvalDate = new Date();
                let shelfLifeDaysAllocation = 21; 
                if (taBagAnticoagulant && taBagAnticoagulant.value === "CPDA1") shelfLifeDaysAllocation = 35;
                if (taBagAnticoagulant && taBagAnticoagulant.value === "SAGM")  shelfLifeDaysAllocation = 42;

                const calculatedExpiryDate = new Date();
                calculatedExpiryDate.setDate(approvalDate.getDate() + shelfLifeDaysAllocation);

                // Build transmission payload
                const validationPackage = {
                    donorCode: activeDonor.code,
                    statusResult: decisionOutcome, // This will be "ineligible"
                    verifiedBloodType: taForwardTyping ? taForwardTyping.value : "⏳",
                    phenotypeProfile: phenotypeString,
                    bagPreservative: taBagAnticoagulant ? taBagAnticoagulant.value : "N/A",
                    expirationTimestamp: calculatedExpiryDate.toISOString(),
                    approvalTimestamp: approvalDate.toISOString(),
                    comments: decisionOutcome === "ineligible" && taIneligibleComment ? taIneligibleComment.value.trim() : ""
                };

                // Send to Electron Main Process IPC handler
                const backendResponse = await ipcRenderer.invoke('approvals:finalize-test', validationPackage);
                
                if (!document.getElementById('taSearchInput')) return;

                if (backendResponse && backendResponse.success) {
                    let finalPrintJobPayload = null;
                    
                    // Only prepare a label payload if the donor is actually approved eligible
                    if (decisionOutcome === "eligible" && backendResponse.newBagData) {
                        finalPrintJobPayload = {
                            ...backendResponse.newBagData,
                            phenotypeProfile: phenotypeString,
                            phenotype: phenotypeString,     
                            approvedAt: approvalDate.toISOString() 
                        };
                    }
                    
                    // Display specific modal alert based on outcome decision
                    if (decisionOutcome === "eligible") {
                        spawnSystemOverlayAlert("Verification Complete", "Blood unit authorized successfully. Transaction signed off.", "success");
                    } else {
                        spawnSystemOverlayAlert("Unit Quarantined", "Biological unit successfully flagged ineligible and moved to quarantine records.", "error");
                    }
                    
                    const masterModalDismissBtn = document.getElementById('modalDismissBtn');
                    if (masterModalDismissBtn) {
                        const executeFinalWorkflowSteps = async () => { 
                            masterModalDismissBtn.removeEventListener('click', executeFinalWorkflowSteps);
                            
                            // Only print if the unit was approved eligible
                            if (finalPrintJobPayload) {
                                console.log("Spooling automated hardware ticket...");
                                spoolHardwareCalibratedBagLabel(finalPrintJobPayload);
                            }
                            
                            // 🔄 REFRESH FIX: Pull fresh data from database right after saving
                            try {
                                localGlobalDonorsCache = await ipcRenderer.invoke('donors:get-all');
                                console.log("🔄 Frontend cache synchronized successfully after submission.");
                            } catch (fetchErr) {
                                console.error("Failed to re-fetch master ledger entries:", fetchErr);
                            }
                            
                            // Go back to the main list view automatically
                            resetToMainLedgerViewState();
                        };
                        
                        masterModalDismissBtn.addEventListener('click', executeFinalWorkflowSteps);
                    }
                } else {
                    spawnSystemOverlayAlert("Transaction Failed", backendResponse.message || "Unknown database rejection.", "error");
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Finalize Laboratory Sign-Off";
                }

            } catch (err) {
                console.error("Save Pipeline Crash Error Details:", err);
                if (document.getElementById('taSearchInput')) {
                    spawnSystemOverlayAlert("Pipeline Crash", err.message, "error");
                }
                submitBtn.disabled = false;
                submitBtn.innerText = "Finalize Laboratory Sign-Off";
            }
        });
    }

    /**
     * 🖨️ AUTOMATED 45x58mm THERMAL LABEL PRINTER SPOOLER
     */
    function spoolHardwareCalibratedBagLabel(bagData) {
        const targetWidthMm  = 45;
        const targetHeightMm = 58;   

        const bloodGroupStr  = bagData.bloodGroup || "N/A";
        let rawPhenotype     = bagData.phenotypeProfile || bagData.phenotype || "";
        if (Array.isArray(rawPhenotype)) rawPhenotype = rawPhenotype.join('');
        const phenotypeStr   = String(rawPhenotype).trim() !== "" ? String(rawPhenotype).trim() : "Not Documented";
        const assignedBagId  = bagData.bagId || "PENDING";
        
        const approvedDate   = bagData.approvedAt ? new Date(bagData.approvedAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
        const expirationDate = bagData.expiresAt ? new Date(bagData.expiresAt).toLocaleDateString('fr-FR') : "──";

        let printWindowFrame = window.open('', '_blank', `width=500,height=600,scrollbars=yes`);
        if (!printWindowFrame) return;

        printWindowFrame.document.write(`
            <html>
            <head>
                <title>CTS Label Model 2 - Security Setup</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { background: #525659; display: flex; flex-direction: column; align-items: center; padding: 10px; }
                    .thermal-label-break { 
                        background: #fff; width: ${targetWidthMm}mm; height: ${targetHeightMm}mm; padding: 2mm 2.2mm; 
                        display: flex; flex-direction: column; justify-content: space-between;
                        font-family: "Arial Black", "Arial", sans-serif; color: #000; overflow: hidden; position: relative;
                    }
                    .blood-group-box {
                        position: absolute; top: 2mm; right: 2.2mm; background: #000 !important; color: #fff !important;
                        width: 18mm; height: 16mm; display: flex; align-items: center; justify-content: center;
                        font-size: 35px; font-weight: 800; border-radius: 6px; text-align: center;
                        -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    }
                    .header-container { max-width: 62%; }
                    .hospital-title { font-size: 11.5px; font-weight: 900; line-height: 1.1; }
                    .cts-phone { font-size: 10.5px; font-weight: bold; color: #000; margin-top: 0.5mm; font-family: Arial, sans-serif; }
                    .structural-divider-line { width: 100%; border-bottom: 2px solid #000; margin-top: 1mm; }
                    .content-body { display: flex; flex-direction: column; gap: 1.2mm; margin-top: 0.8mm; }
                    .metadata-line { font-size: 12.5px; font-weight: 900; line-height: 1.1; }
                    .dynamic-value { font-weight: 900; font-family: Arial, sans-serif; }
                    .security-redundancy-row { font-size: 12.5px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 0.1px; line-height: 1.1; }
                    .bag-id-line { font-size: 13px; font-weight: 900; line-height: 1.1; }
                    .footer-container { border-top: 1.5px dashed #000; padding-top: 1.2mm; display: flex; flex-direction: column; gap: 1mm; }
                    @media print {
                        @page { size: ${targetWidthMm}mm ${targetHeightMm}mm; margin: 0 !important; }
                        html, body { background: #fff; margin: 0 !important; padding: 0 !important; width: ${targetWidthMm}mm !important; height: ${targetHeightMm}mm !important; overflow: hidden; }
                        .blood-group-box { background: #000 !important; color: #fff !important; }
                    }
                </style>
            </head>
            <body>
                <div class="thermal-label-break">
                    <div class="blood-group-box">${bloodGroupStr}</div>
                    <div class="header-container">
                        <div class="hospital-title">HOPITAL MIXTE<br>DJELFA</div>
                        <div class="cts-phone">CTS HMD</div>
                        <div class="cts-phone"> TEL: 021.41.75.12</div>
                    </div>
                    <div class="structural-divider-line"></div>
                    <div class="content-body">
                        <div class="metadata-line">Phénotype: <span class="dynamic-value">${phenotypeStr}</span></div>
                        <div class="security-redundancy-row">Groupe Sanguin: <span class="dynamic-value">${bloodGroupStr}</span></div>
                        <div class="bag-id-line">N: <span class="dynamic-value">${assignedBagId}</span></div>
                    </div>
                    <div class="footer-container">
                        <div class="metadata-line">Prévelé le: <span class="dynamic-value">${approvedDate}</span></div>
                        <div class="metadata-line">Périmé le: <span class="dynamic-value" style="text-decoration: underline;">${expirationDate}</span></div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { 
                            window.print();
                            window.close(); 
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `);
        printWindowFrame.document.close();
    }
    
    /**
     * 🔄 VIEW CONTROL STATE NAVIGATION UTILITIES
     */
    function resetToMainLedgerViewState() {
        if (taLabFormState) taLabFormState.classList.add('um-element-hidden');
        if (taPassportViewState) taPassportViewState.classList.add('um-element-hidden');
        if (taTableViewState) taTableViewState.classList.remove('um-element-hidden');
        
        processingTargetDonorIndex = null;
        targetActivePassportRecord = null;
        
        synchronizeLaboratoryMasterLedger();
        setTimeout(() => { if (taSearchInput) taSearchInput.focus(); }, 60);
    }

    function bindUnifiedNavigationActions() {
        document.querySelectorAll('.ta-back-to-ledger-btn').forEach(btn => {
            btn.addEventListener('click', resetToMainLedgerViewState);
        });

        // Passport Reprint Action (FIXED: Now passes complete phenotype & approval metadata)
        if (taPassportReprintBtn) {
            taPassportReprintBtn.addEventListener('click', () => {
                if (targetActivePassportRecord) {
                    spoolHardwareCalibratedBagLabel({
                        bagId: targetActivePassportRecord.bagId,
                        expiresAt: targetActivePassportRecord.expirationTimestamp,
                        bloodGroup: targetActivePassportRecord.verifiedBloodType,
                        // 🎯 THE FIX: Pass these down so the print window layout can read them!
                        phenotypeProfile: targetActivePassportRecord.phenotypeProfile,
                        approvedAt: targetActivePassportRecord.approvalTimestamp
                    });
                }
            });
        }

        if (statCardPendingBtn) {
            statCardPendingBtn.addEventListener('click', () => { toggleLedgerFilteringContext("pending"); });
        }
        if (statCardApprovedBtn) {
            statCardApprovedBtn.addEventListener('click', () => { toggleLedgerFilteringContext("approved"); });
        }
        if (statCardRejectedBtn) {
            statCardRejectedBtn.addEventListener('click', () => { toggleLedgerFilteringContext("ineligible"); });
        }

        if (taEligibilityStatus) {
            taEligibilityStatus.addEventListener('change', () => {
                if (taEligibilityStatus.value === "ineligible") {
                    if (ineligibleReasonWrapper) ineligibleReasonWrapper.classList.remove('um-element-hidden');
                    if (taIneligibleComment) taIneligibleComment.setAttribute('required', 'true');
                } else {
                    if (ineligibleReasonWrapper) ineligibleReasonWrapper.classList.add('um-element-hidden');
                    if (taIneligibleComment) taIneligibleComment.removeAttribute('required');
                }
            });
        }
    }

    function toggleLedgerFilteringContext(targetFilter) {
        if (currentActiveFilter === targetFilter) {
            currentActiveFilter = "all";
        } else {
            currentActiveFilter = targetFilter;
        }
        resetToMainLedgerViewState();
    }

    function initializeInputAutofocusLoop() {
        if (taSearchInput) {
            taSearchInput.focus();
            document.addEventListener('click', (e) => {
                if (!e.target) return;
                const targetTagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
                const isInteractive = targetTagName === 'input' || 
                                      targetTagName === 'select' || 
                                      targetTagName === 'textarea' || 
                                      targetTagName === 'button' ||
                                      e.target.closest('button') || 
                                      e.target.closest('.checkbox-pill') ||
                                      e.target.closest('.ta-stat-card');

                const passView = document.getElementById('taPassportViewState');
                const formView = document.getElementById('taLabFormState');
                
                const passHidden = passView ? passView.classList.contains('um-element-hidden') : true;
                const formHidden = formView ? formView.classList.contains('um-element-hidden') : true;

                if (!isInteractive && passHidden && formHidden) {
                    taSearchInput.focus();
                }
            });
        }
    }

})();