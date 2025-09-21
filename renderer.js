document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-panel form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatusDiv = document.getElementById('login-status');
    const loadingSpinnerDiv = document.getElementById('loading-spinner');
    const workspaceButton = document.querySelector('.nav-button:nth-child(1)');
    const reportsButton = document.querySelector('.nav-button:nth-child(2)');

    // Function to show/hide loading spinner
    function showLoadingSpinner(show) {
        loadingSpinnerDiv.style.display = show ? 'block' : 'none';
    }

    // Function to display login status messages
    function showLoginStatus(message, isError = false) {
        loginStatusDiv.textContent = message;
        loginStatusDiv.style.color = isError ? 'red' : 'green';
        loginStatusDiv.style.display = 'block';
    }

    // Function to update UI based on login status
    function updateUIForLoginStatus() {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            workspaceButton.removeAttribute('disabled');
            reportsButton.removeAttribute('disabled');
            workspaceButton.style.opacity = '1';
            reportsButton.style.opacity = '1';
        } else {
            workspaceButton.setAttribute('disabled', 'true');
            reportsButton.setAttribute('disabled', 'true');
            workspaceButton.style.opacity = '0.5';
            reportsButton.style.opacity = '0.5';
        }
    }

    // Initial UI update on page load
    updateUIForLoginStatus();

    // Handle login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showLoadingSpinner(true);
        loginStatusDiv.style.display = 'none';

        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showLoginStatus(data.message, false);
                sessionStorage.setItem('isLoggedIn', 'true');
                updateUIForLoginStatus();
                // No immediate redirect
            } else {
                showLoginStatus(data.message || 'Login failed', true);
                sessionStorage.setItem('isLoggedIn', 'false');
                updateUIForLoginStatus();
            }
        } catch (error) {
            console.error('Error during login:', error);
            showLoginStatus('An error occurred during login.', true);
            sessionStorage.setItem('isLoggedIn', 'false');
            updateUIForLoginStatus();
        } finally {
            showLoadingSpinner(false);
        }
    });

    // Handle Workspace button click
    workspaceButton.addEventListener('click', () => {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            window.location.href = 'workspace.html';
        } else {
            showLoginStatus('Please log in to access the Workspace.', true);
        }
    });

    // Handle Reports button click
    reportsButton.addEventListener('click', () => {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            window.location.href = 'reports.html';
        } else {
            showLoginStatus('Please log in to access Reports.', true);
        }
    });
});
