(function () {
    console.log("Central Layout SPA Switcher Engine Initialization: Active.");

    const { ipcRenderer } = require('electron');

    // This is the main frame box where your page views are injected
    const viewportPanel = document.querySelector('.viewport-panel');
    
    /**
     * MODULE ROUTING REGISTRY MAP
     * Maps the module tokens to their physical file paths on your disk storage array.
     */
    const ModuleRoutingRegistry = {
        "overview-dashboard": {
            html: "overview-dashboard.html",
            css: "../css/overview-dashboard.css",
            script: "../renderers/renderers-overview-dashboard.js"
        },
        "user-management": {
            html: "user-manager.html",
            css: "../css/user-manager.css",
            script: "../renderers/renderers-user-manager.js"
        },
        "donors-management": {
            html: "donors-management.html",
            css: "../css/donors-management.css",
            script: "../renderers/renderers-donors-management.js"
        },
        "test-management": {
            html: "testing-approvals.html",
            css: "../css/testing-approvals.css",
            script: "../renderers/renderers-testing-approvals.js"
        },
        "inventory-stock": {
            html: "inventory-stock.html",
            css: "../css/inventory-stock.css",
            script: "../renderers/renderers-inventory-stock.js"
        }
    };

    /**
     * SECURE CENTRAL VIEW INJECTOR ENGINE
     * Clears old page layouts, switches styles, and runs your custom page engines.
     */
    async function injectModuleView(moduleKey) {
        const targetConfig = ModuleRoutingRegistry[moduleKey];
        if (!targetConfig) return;

        try {
            // A. Clear and swap your module CSS files
            const transientStyle = document.getElementById("spa-module-transient-css");
            if (transientStyle) transientStyle.remove();

            const newStyleLink = document.createElement("link");
            newStyleLink.id = "spa-module-transient-css";
            newStyleLink.rel = "stylesheet";
            newStyleLink.href = targetConfig.css;
            document.head.appendChild(newStyleLink);

            // B. Stream HTML markup from backend into your viewport panel box
            const htmlContent = await ipcRenderer.invoke('spa:fetch-module-markup', targetConfig.html);
            if (viewportPanel) viewportPanel.innerHTML = htmlContent;

            // C. Flush old JS engines and run the new script module safely
            const historicalScript = document.getElementById("spa-module-transient-js");
            if (historicalScript) historicalScript.remove();

            const activeModuleScript = document.createElement("script");
            activeModuleScript.id = "spa-module-transient-js";
            activeModuleScript.src = targetConfig.script;
            activeModuleScript.defer = true;
            document.body.appendChild(activeModuleScript);

        } catch (routeError) {
            console.error("SPA execution crash:", routeError);
        }
    }

    /**
     * SIDEBAR VISUAL STATE CLEANER
     * Removes the active styling from old buttons so they don't get stuck glowing together!
     */
    function updateSidebarActiveIndicator(clickedElement) {
        document.querySelectorAll('.menu-item, .submenu-item').forEach(item => {
            item.classList.remove('active');
        });
        clickedElement.classList.add('active');
    }

    // --- INTERACTIVE EVENT LISTENERS BINDINGS ---

    // Link A: Listens for dashboard panel link interactions
    const btnOverviewDashboard = document.querySelector('.sidebar-menu .menu-item:nth-of-type(1)');
    if (btnOverviewDashboard) {
        btnOverviewDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            updateSidebarActiveIndicator(btnOverviewDashboard);
            injectModuleView("overview-dashboard");
        });
    }

    // Link C: Listens for user entry list operations
    const btnUserMgmt = document.getElementById('sub-gestion-users');
    if (btnUserMgmt) {
        btnUserMgmt.addEventListener('click', (e) => {
            e.preventDefault();
            updateSidebarActiveIndicator(btnUserMgmt);
            injectModuleView("user-management");
        });
    }

    // Link B: Listens for blood donation registration panels
    const btnDonorMgmt = document.getElementById('nav-donors-trigger');
    if (btnDonorMgmt) {
        btnDonorMgmt.addEventListener('click', (e) => {
            e.preventDefault();
            updateSidebarActiveIndicator(btnDonorMgmt);
            injectModuleView("donors-management");
        });
    }
// link to test aprovalls
const btnTestMgmt = document.getElementById('nav-test-trigger');
    if (btnTestMgmt) {
        btnTestMgmt.addEventListener('click', (e) => {
            e.preventDefault();
            updateSidebarActiveIndicator(btnTestMgmt);
            injectModuleView("test-management");
        });
    }
 const btnInveMgmt = document.getElementById('nav-inve-trigger');
    if (btnInveMgmt) {
        btnInveMgmt.addEventListener('click', (e) => {
            e.preventDefault();
            updateSidebarActiveIndicator(btnInveMgmt);
            injectModuleView("inventory-stock");
        });
    }

    console.log("Central Layout SPA Switcher Engine Initialization: Complete.");
})();