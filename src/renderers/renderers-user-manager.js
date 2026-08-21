(function () {
    console.log("Accented Vibrant User Engine Reloaded and Connected to Live Database.");

    // Access the Electron IPC engine directly since contextIsolation is disabled
    const { ipcRenderer } = require('electron');

    const toggleFormBtn = document.getElementById('toggleFormBtn');
    const umTableView = document.getElementById('umTableView');
    const umFormView = document.getElementById('umFormView');
    const formCancelBtn = document.getElementById('formCancelBtn');
    const hospitalUserForm = document.getElementById('hospitalUserForm');
    const umTableBody = document.getElementById('umTableBody');
    const umSearchInput = document.getElementById('umSearchInput');
    const umRoleFilter = document.getElementById('umRoleFilter');

    const formActionState = document.getElementById('formActionState');
    const editingUserRowIndex = document.getElementById('editingUserRowIndex');

    // UI Toast Elements
    const umToastContainer = document.getElementById('umToastContainer');
    
    // Custom Modal Target Overrides
    const umConfirmModal = document.getElementById('umConfirmModal');
    const umModalTitle = document.getElementById('umModalTitle');
    const umModalMessage = document.getElementById('umModalMessage');
    const umModalConfirmBtn = document.getElementById('umModalConfirmBtn');
    const umModalCancelBtn = document.getElementById('umModalCancelBtn');

    // Password fields
    const uPassword = document.getElementById('uPassword');
    const uRePassword = document.getElementById('uRePassword');
    const ruleMatch = document.getElementById('rule-match');
    const ruleLength = document.getElementById('rule-length');

    let pendingModalAction = null;
    
    // Core memory cache synchronized strictly with main.js data transactions
    let localUsersCache = [];

    // --- 1. ASYNC DATABASE SYNCHRONIZATION ENGINE ---
    async function syncDataFromDatabase() {
        try {
            // Read your current users-database.json via IPC
            localUsersCache = await ipcRenderer.invoke('users:get-all');
            rebuildUserGridTable();
        } catch (err) {
            console.error("IPC Sync Failure:", err);
            spawnToast("Failed to sync personnel data records with database.", "error");
        }
    }

    // Non-Blocking Toast Generator
    function spawnToast(message, type = "success") {
        if (!umToastContainer) return;
        const toast = document.createElement('div');
        toast.className = `um-toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
        umToastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 36000);
    }

    // Custom UI Overlay Dialog Launcher
    function askForConfirmation(title, message, onConfirm) {
        if (!umConfirmModal) return;
        
        // Break out of the workspace container stacking context by moving to document body
        if (umConfirmModal.parentElement !== document.body) {
            document.body.appendChild(umConfirmModal);
        }

        umModalTitle.textContent = title;
        umModalMessage.textContent = message;
        umConfirmModal.classList.remove('um-element-hidden');
        pendingModalAction = onConfirm;
    }

    // Clean up cleanly and return it back to prevent module loading issues later
    function closeConfirmationModal() {
        if (umConfirmModal) {
            umConfirmModal.classList.add('um-element-hidden');
            pendingModalAction = null;
        }
    }

    if (umModalCancelBtn) {
        umModalCancelBtn.addEventListener('click', closeConfirmationModal);
    }

    if (umModalConfirmBtn) {
        umModalConfirmBtn.addEventListener('click', () => {
            if (pendingModalAction) pendingModalAction();
            closeConfirmationModal();
        });
    }

    // Password Live Evaluator Rules
    function evaluatePasswordSecurity() {
        const pVal = uPassword.value;
        const rVal = uRePassword.value;

        if (pVal.length >= 12) {
            ruleLength.className = "compliance-item valid";
            ruleLength.innerHTML = `<span class="chk-bullet">✓</span> Minimum 12 characters verified`;
        } else {
            ruleLength.className = "compliance-item invalid";
            ruleLength.innerHTML = `<span class="chk-bullet">✕</span> Minimum 12 characters required`;
        }

        if (pVal === rVal && pVal.length > 0) {
            ruleMatch.className = "compliance-item valid";
            ruleMatch.innerHTML = `<span class="chk-bullet">✓</span> Passwords match exactly`;
        } else {
            ruleMatch.className = "compliance-item invalid";
            ruleMatch.innerHTML = `<span class="chk-bullet">✕</span> Passwords must match exactly`;
        }
    }

    if (uPassword && uRePassword) {
        uPassword.addEventListener('input', evaluatePasswordSecurity);
        uRePassword.addEventListener('input', evaluatePasswordSecurity);
    }

    // --- 2. DYNAMIC REAL DATABASE GRID RENDERER ---
    function rebuildUserGridTable() {
        if (!umTableBody) return;
        umTableBody.innerHTML = "";

        const searchValue = umSearchInput ? umSearchInput.value.toLowerCase().trim() : "";
        const roleFilterValue = umRoleFilter ? umRoleFilter.value : "all";

        let adminCount = 0;

        localUsersCache.forEach((account, idx) => {
            if (account.grade === 'admin') adminCount++;

        const fullName = `${account.first} ${account.last}`.toLowerCase();
        const matchesSearch = fullName.includes(searchValue) || account.user.toLowerCase().includes(searchValue) || account.code.toLowerCase().includes(searchValue);
        const matchesFilter = (roleFilterValue === "all") || (account.grade === roleFilterValue);

        if (!matchesSearch || !matchesFilter) return;

        const initials = `${account.first.charAt(0)}${account.last.charAt(0)}`.toUpperCase();

        // --- SMART ACTION ROW PROTECTION INTERFACE ---
        // If the username is your protected 'admin', swap action buttons for a secure badge indicator
        const actionContent = (account.user === "admin") 
            ? `<span style="color: #8b949e; font-size: 0.85rem; font-style: italic;">🔒 System Protected</span>`
            : `<div class="um-action-group">
                <button class="um-action-btn edit" data-index="${idx}">✏️</button>
                <button class="um-action-btn delete" data-index="${idx}">❌</button>
               </div>`;

        const tr = document.createElement('tr');
        tr.className = "animate-fade-in";
        tr.innerHTML = `
            <td>
                <div class="um-user-cell">
                    <div class="um-avatar">${initials}</div>
                    <div class="um-user-info">
                        <span class="u-name">${account.first} ${account.last}</span>
                    </div>
                </div>
            </td>
            <td><code class="um-code-id">${account.code}</code></td>
            <td><span class="badge-role ${account.grade}">${account.grade.toUpperCase()}</span></td>
            <td>${actionContent}</td>
        `;
        umTableBody.appendChild(tr);4
        });

        // Pull indicators right out of true database loop lengths
        const totalStaffCounter = document.getElementById('totalStaffCount');
        const totalAdminCounter = document.getElementById('totalAdminCount');
        if (totalStaffCounter) totalStaffCounter.textContent = localUsersCache.length;
        if (totalAdminCounter) totalAdminCounter.textContent = String(adminCount).padStart(2, '0');
    }

    if (toggleFormBtn) {
        toggleFormBtn.addEventListener('click', () => {
            hospitalUserForm.reset();
            formActionState.value = "create";
            document.getElementById('formSubmitBtn').textContent = "Create User";
            evaluatePasswordSecurity();
            toggleFormBtn.classList.add('um-element-hidden');
            umTableView.classList.add('um-element-hidden');
            umFormView.classList.remove('um-element-hidden');
        });
    }

    if (formCancelBtn) {
        formCancelBtn.addEventListener('click', () => {
            umFormView.classList.add('um-element-hidden');
            umTableView.classList.remove('um-element-hidden');
            if (toggleFormBtn) toggleFormBtn.classList.remove('um-element-hidden');
        });
    }

    // --- 3. LIVE DATABASE TRANSACTION CONTROLLERS (ADD / UPDATE) ---
    if (hospitalUserForm) {
        hospitalUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const pwd = uPassword.value;
            const repwd = uRePassword.value;

            if (pwd !== repwd || pwd.length < 12) {
                spawnToast("Form Validation Failed: Check access rules.", "error");
                return;
            }

            const first = document.getElementById('uFirstName').value.trim();
            const last = document.getElementById('uLastName').value.trim();
            const user = document.getElementById('uUsername').value.trim();
            const grade = document.getElementById('uGrade').value;

            const isNew = (formActionState.value === "create");
            const index = isNew ? null : parseInt(editingUserRowIndex.value, 10);

            // Construct payload packet safely for main.js processing
           const payload = { 
                isNew, 
                index, 
                first, 
                last, 
                user, 
                grade,
                password: pwd // Add this line to pass the input password to the backend channel
            };

            if (isNew) {
                // Async database insert
                const response = await ipcRenderer.invoke('users:save-profile', payload);
                if (response.success) {
                    localUsersCache = response.updatedList; // Update grid cache reference
                    spawnToast(`User profile created for ${first} ${last}! Unique ID auto-assigned.`);
                    formCancelBtn.click();
                    rebuildUserGridTable();
                }
            } else {
               askForConfirmation("Confirm Profile Update", `Apply modifications to the system registry for ${first}?`, async () => {
            const result = await ipcRenderer.invoke('users:save-profile', payload);
            if (result.success) {
                localUsersCache = result.updatedList;
                spawnToast(`Profile updated successfully.`);
                formCancelBtn.click();
                rebuildUserGridTable();
            } else {
                // If backend blocked the edit (for admin)
                spawnToast(result.message || "Action denied.", "error");
            }
        });
            }
        });
    }

    // --- 4. LIVE DATABASE REMOVAL DELEGATION CONTROLLER (DELETE) ---
    if (umTableBody) {
        umTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.um-action-btn.edit');
            const deleteBtn = e.target.closest('.um-action-btn.delete');

            if (editBtn) {
                const index = parseInt(editBtn.getAttribute('data-index'));
                const currentData = localUsersCache[index];

                document.getElementById('uFirstName').value = currentData.first;
                document.getElementById('uLastName').value = currentData.last;
                document.getElementById('uUsername').value = currentData.user;
                document.getElementById('uGrade').value = currentData.grade;
                uPassword.value = "FallbackPassword2026";
                uRePassword.value = "FallbackPassword2026";

                formActionState.value = "update";
                editingUserRowIndex.value = index;
                document.getElementById('formSubmitBtn').textContent = "Save Modifications";
                evaluatePasswordSecurity();

                if (toggleFormBtn) toggleFormBtn.classList.add('um-element-hidden');
                umTableView.classList.add('um-element-hidden');
                umFormView.classList.remove('um-element-hidden');
            }

            if (deleteBtn) {
                const index = parseInt(deleteBtn.getAttribute('data-index'));
                const targetUser = localUsersCache[index];
                
                askForConfirmation(
                    "Revoke User Account", 
                    `Warning: This will destroy credential records for ${targetUser.first} ${targetUser.last}. Proceed?`, 
                    async () => {
                        // Clear out listing from disk permanently via index tracking
                        const response = await ipcRenderer.invoke('users:delete-profile', index);
                        if (response.success) {
                            localUsersCache = response.updatedList;
                            spawnToast("Account deleted from registry.", "error");
                            rebuildUserGridTable();
                        }
                    }
                );
            }
        });
    }

    if (umSearchInput) umSearchInput.addEventListener('input', rebuildUserGridTable);
    if (umRoleFilter) umRoleFilter.addEventListener('change', rebuildUserGridTable);

    // Run active data collection check immediately upon loading view viewport modules
    syncDataFromDatabase();
})();