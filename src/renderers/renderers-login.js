window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('rememberMe');

    // --- 1. AUTO-FILL LOGIC ---
    // Check if we have a saved username when the page loads
    const savedUser = localStorage.getItem('rememberedUser');
    if (savedUser) {
        usernameInput.value = savedUser;
        rememberCheckbox.checked = true;
        passwordInput.focus(); // Focus password since username is done
    } else {
        usernameInput.focus(); // Standard focus
    }

    // --- 2. THE LOGIN HANDLER ---
    const handleLogin = () => {
        const user = usernameInput.value;
        const pass = passwordInput.value;

        if (user === "admin" && pass === "12345") {
            // SUCCESS
            loginBtn.style.backgroundColor = "#2e7d32";
            loginBtn.innerText = "Access Granted...";

            // Handle "Remember Me" storage
            if (rememberCheckbox.checked) {
                localStorage.setItem('rememberedUser', user);
            } else {
                localStorage.removeItem('rememberedUser');
            }

            setTimeout(() => {
                window.location.href = "../views/dashboard.html";
            }, 500);

        } else {
            // FAILURE
            usernameInput.value = "";
            passwordInput.value = "";
            loginBtn.innerText = "Access Refused";
            loginBtn.style.backgroundColor = "#d32f2f"; // Changed to Red for error

            setTimeout(() => {
                loginBtn.innerText = "Login";
                loginBtn.style.backgroundColor = "#2f89d3";
                usernameInput.focus();
            }, 1000);
        }
    };

    // Attach the handler to the button
    loginBtn.addEventListener('click', handleLogin);
    
    // Also allow "Enter" key to trigger login
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});

    /*function togle password */

const togglePassword = document.getElementById('togglePassword');
const password = document.getElementById('password');

if (togglePassword && password) {
    togglePassword.addEventListener('click', function () {
        // 1. Toggle the type attribute
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);

        // 2. Toggle the icon appearance
        this.classList.toggle('bx-show');
        this.classList.toggle('bx-hide');
        
        // 3. Keep focus on the input so the user can keep typing
        password.focus();
    });
}

 
