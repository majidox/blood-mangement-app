window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const handleLogin = () => {
        const user = usernameInput.value;
        const pass = passwordInput.value;

        if (user === "admin" && pass === "12345") {
            loginBtn.style.backgroundColor = "#2e7d32";
            loginBtn.innerText = "Access Granted...";
            
            setTimeout(() => {
                // This line moves the user to the next page
                window.location.href = "dashboard.html";
            }, 500);
        } else {
            usernameInput.value = "";
            passwordInput.value = "";
            

            loginBtn.innerText = "refused";
            loginBtn.style.backgroundColor = "#2f89d3";
             setTimeout(() => {
                // This line moves the user to the next page
                window.location.href = "index.html";
            }, 100);
            
             usernameInput.focus();

    
    
           
            
            
            
        }
    };

    // Trigger on Click
    loginBtn.addEventListener('click', handleLogin);

    // Trigger on Enter Key
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    // Select the donor link by its class or a specific ID
const donorLink = document.querySelector('a[href="donor.html"]');

donorLink.addEventListener('click', (e) => {
    // If you want to prevent default for a moment to run logic:
    // e.preventDefault(); 
    console.log("Redirecting to Donor Management...");
    
    // The browser/Electron will follow the href automatically 
    // unless you called preventDefault.
});
});
