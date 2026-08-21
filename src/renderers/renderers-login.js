const { ipcRenderer } = require('electron');

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const cardAlert = document.getElementById('cardAlert');
const alertMessage = document.getElementById('alertMessage');
const rememberMeCheckbox = document.getElementById('rememberMe');
const submitBtn = document.getElementById('submitBtn');

// --- 1. REMEMBER CREDENTIALS LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMeCheckbox.checked = true;
        if (passwordInput) passwordInput.focus();
    }
});

// --- 2. SHOW / HIDE PASSWORD TOGGLE ---
togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.textContent = '🙈'; 
    } else {
        passwordInput.type = 'password';
        togglePasswordBtn.textContent = '👁️'; 
    }
});

// --- 3. FORM SUBMISSION & ACTIVE USER SESSION ENGINE ---
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Lock form immediately to stop click spamming
        submitBtn.disabled = true;
        cardAlert.classList.add('hidden'); 

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            alertMessage.textContent = "Please fill in all fields.";
            cardAlert.classList.remove('hidden');
            submitBtn.disabled = false; 
            return;
        }

        try {
            const response = await ipcRenderer.invoke('auth:login', { username, password });

            if (response.success) {
                // --- FIXED & UPGRADED TO LOCALSTORAGE ---
                localStorage.setItem('active_username', username);
                localStorage.setItem('active_role', response.role);

                // Remember username logic based on checkbox state
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('remembered_username', username);
                } else {
                    localStorage.removeItem('remembered_username');
                }

                console.log("Authenticated successfully. Redirecting...");
// 1. Save the logged-in username and role to local memory
    localStorage.setItem('active_username', username);
    localStorage.setItem('active_role', response.role);

    console.log("Session saved! Proceeding to dashboard...");
    // Your main.js will now change windows to dashboard.html automatically


                
                // main.js handles transitioning to preload.html automatically!
                
            } else {
                // Show integrated alert block inside the form layout
                alertMessage.textContent = response.message;
                cardAlert.classList.remove('hidden');
                
                // Anti-spam countdown cooldown
                setTimeout(() => {
                    submitBtn.disabled = false;
                }, 1500);
            }
        } catch (error) {
            console.error("IPC Error:", error);
            alertMessage.textContent = "System Error: Server could not be reached.";
            cardAlert.classList.remove('hidden');
            submitBtn.disabled = false;
        }
    });
}