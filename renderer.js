document.addEventListener('DOMContentLoaded', () => {
    // --- MODIFIED: Selectors updated for the new link-based cards ---
    const loginForm = document.querySelector('form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatusDiv = document.getElementById('login-status');
    const loadingSpinnerDiv = document.getElementById('loading-spinner');

    // Select the new <a> tags and their lock icons
    const wsLink = document.getElementById('wsLink');
    const wsLock = document.getElementById('wsLock');
    const rpLink = document.getElementById('rpLink');
    const rpLock = document.getElementById('rpLock');

    function showLoadingSpinner(show) {
        if (loadingSpinnerDiv) {
            loadingSpinnerDiv.style.display = show ? 'block' : 'none';
        }
    }

    function showLoginStatus(message, isError = false) {
        loginStatusDiv.textContent = message;
        loginStatusDiv.style.color = isError ? 'red' : 'green';
        loginStatusDiv.style.display = 'block';
    }

    // --- REWRITTEN: Controls the new .locked class and href attribute ---
    function updateUIForLoginStatus() {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            // User is logged in: UNLOCK THE CARDS
            wsLink.href = 'workspace.html';
            wsLink.classList.remove('locked');
            wsLock.textContent = '✅';

            rpLink.href = 'reports.html'; // Assumed filename
            rpLink.classList.remove('locked');
            rpLock.textContent = '✅';
        } else {
            // User is logged out: LOCK THE CARDS
            wsLink.removeAttribute('href');
            wsLink.classList.add('locked');
            wsLock.textContent = '🔒';

            rpLink.removeAttribute('href');
            rpLink.classList.add('locked');
            rpLock.textContent = '🔒';
        }
    }

    // Initial UI update on page load
    updateUIForLoginStatus();

    // The login form submission logic remains the same
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showLoadingSpinner(true);
        loginStatusDiv.style.display = 'none';

        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showLoginStatus(data.message, false);
                sessionStorage.setItem('isLoggedIn', 'true');
            } else {
                showLoginStatus(data.message || 'Login failed', true);
                sessionStorage.setItem('isLoggedIn', 'false');
            }
        } catch (error) {
            console.error('Error during login:', error);
            showLoginStatus('An error occurred during login.', true);
            sessionStorage.setItem('isLoggedIn', 'false');
        } finally {
            showLoadingSpinner(false);
            updateUIForLoginStatus(); // Update UI after every attempt
        }
    });
});