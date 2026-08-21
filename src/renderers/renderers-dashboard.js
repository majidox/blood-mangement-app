try {
    const { webFrame } = require('electron');
    webFrame.setZoomLevel(0); // Resets to 100% standard scaling
    webFrame.setVisualZoomLevelLimits(1, 1); // Disables pinch-to-zoom or accidental mouse-wheel zooms
    console.log("Dashboard zoom factor successfully locked to 100%.");
} catch (error) {
    console.error("Failed to force register webFrame zoom constraint:", error);
}

const { webFrame } = require('electron');

// --- 1. FORCE RESET ELECTRON WINDOW ZOOM ---
try {
    webFrame.setZoomLevel(0); // Lock view at crisp 100% resolution baseline
    webFrame.setVisualZoomLevelLimits(1, 1); // Turn off unexpected pinches
    console.log("System view scaling locked to 100%.");
} catch (zoomError) {
    console.error("Zoom engine optimization skipped:", zoomError);
}

// --- MAIN RUNNER ENGINE (Runs safely after HTML structures exist) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 2. DYNAMIC DATABASE USER CONFIGURATION
    // ==========================================================================
    const loggedUsername = localStorage.getItem('active_username') || "Guest User";
    const loggedRole = localStorage.getItem('active_role') || "Staff";

    const navUsernameEl = document.querySelector('.username');
    const navRoleEl = document.querySelector('.role-tag');
    const sidebarRoleBadge = document.getElementById('user-role');
    const adminSection = document.querySelector('.admin-only-menu');

    // Display true user details on screen
    if (navUsernameEl) navUsernameEl.textContent = loggedUsername;
    if (navRoleEl) navRoleEl.textContent = loggedRole.charAt(0).toUpperCase() + loggedRole.slice(1);
    if (sidebarRoleBadge) sidebarRoleBadge.textContent = loggedRole.toUpperCase();

    // Security Gate: Toggle administration panel visibility based on database role
    if (adminSection) {
        if (loggedRole.toLowerCase() === 'admin') {
            adminSection.classList.remove('hidden');
            console.log("Administrative security check passed. Control panel accessible.");
        } else {
            adminSection.classList.add('hidden');
        }
    }

    // ==========================================================================
    // 3. FACEBOOK-STYLE NOTIFICATION ACTIONS
    // ==========================================================================
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const unreadItems = document.querySelectorAll('.notif-item.unread');

    if (notificationBell && notificationDropdown) {
        // Toggle box open/closed on click
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });

        // Close dropdown instantly if user clicks outside the menu context
        window.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && e.target !== notificationBell) {
                notificationDropdown.classList.add('hidden');
            }
        });
    }

    // Clear alert badges on read confirmation click
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            unreadItems.forEach(item => item.classList.remove('unread'));
            if (notifBadge) notifBadge.style.display = 'none';
        });
    }

    // ==========================================================================
    // 4. EASTER EGG: ABOUT APP INTERACTIVE LIGHTBOX
    // ==========================================================================
    const versionClickTarget = document.querySelector('.version-row');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('closeAboutBtn');

    if (versionClickTarget && aboutModal) {
        versionClickTarget.style.cursor = 'pointer';
        
        // Open Credits View
        versionClickTarget.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
        });

        // Close Credits View via 'X' button
        if (closeAboutBtn) {
            closeAboutBtn.addEventListener('click', () => {
                aboutModal.classList.add('hidden');
            });
        }

        // Close Credits View via clicking black glass background layer
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });
    }

    // ==========================================================================
    // 5. SESSION DISCONNECT FLOW
    // ==========================================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear identity tokens from computer memory on session end
            localStorage.removeItem('active_username');
            localStorage.removeItem('active_role');
            console.log("Active token destroyed. Retracting to authentication gateway.");
            window.location.href = 'login.html';
        });
    }

    // ==========================================================================
    // 6. SIDEBAR SUB-MENU DROPDOWN MECHANICS
    // ==========================================================================
    const adminMenuTrigger = document.getElementById('adminMenuTrigger');
    const adminSubMenu = document.getElementById('adminSubMenu');

    if (adminMenuTrigger && adminSubMenu) {
        adminMenuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle open style class on the button (rotates caret arrow)
            adminMenuTrigger.classList.toggle('open');
            
            // Toggle visibility class on sub-menu div
            adminSubMenu.classList.toggle('submenu-hidden');
        });
    }

    // ==========================================================================
    // 7. SINGLE PAGE APPLICATION MODULE INJECTOR ENGINE
    // ==========================================================================
    
});
async function refreshDashboardStats() {
    try {
        const stats = await ipcRenderer.invoke('dashboard:get-stats');
        
        // Update the DOM elements with real numbers
        document.getElementById('stat-donors').textContent = stats.totalDonors.toLocaleString();
        document.getElementById('stat-approved').textContent = stats.approvedBags.toLocaleString();
        document.getElementById('stat-stock').textContent = stats.activeStock.toLocaleString();
        document.getElementById('stat-dispatched').textContent = stats.dispatchedThisMonth.toLocaleString();
        
        console.log("Dashboard stats synchronized with database.");
    } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
    }
}

// Call this function when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    refreshDashboardStats();
    
    // ... rest of your existing DOMContentLoaded code (Login, Menu, etc.)
});