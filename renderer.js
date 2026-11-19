document.addEventListener('DOMContentLoaded', () => {
    const loginGrid = document.getElementById('login-grid');
    const setupPanel = document.getElementById('database-setup-panel');
    const setupTitle = document.getElementById('database-setup-title');
    const setupMessage = document.getElementById('database-setup-message');
    const issueList = document.getElementById('migration-issue-list');
    const loginForm = document.querySelector('form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatusDiv = document.getElementById('login-status');
    const loadingSpinnerDiv = document.getElementById('loading-spinner');
    const wsLink = document.getElementById('wsLink');
    const wsLock = document.getElementById('wsLock');
    const rpLink = document.getElementById('rpLink');
    const rpLock = document.getElementById('rpLock');
    const apiBase = 'http://localhost:3000';

    function showLoadingSpinner(show) {
        loadingSpinnerDiv.style.display = show ? 'block' : 'none';
    }

    function showLoginStatus(message, isError = false) {
        loginStatusDiv.textContent = message;
        loginStatusDiv.style.color = isError ? 'red' : 'green';
        loginStatusDiv.style.display = 'block';
    }

    function updateUIForLoginStatus() {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            wsLink.href = 'workspace.html';
            wsLink.classList.remove('locked');
            wsLock.textContent = '✅';
            rpLink.href = 'reports.html';
            rpLink.classList.remove('locked');
            rpLock.textContent = '✅';
        } else {
            wsLink.removeAttribute('href');
            wsLink.classList.add('locked');
            wsLock.textContent = '🔒';
            rpLink.removeAttribute('href');
            rpLink.classList.add('locked');
            rpLock.textContent = '🔒';
        }
    }

    function showLoginScreen() {
        setupPanel.hidden = true;
        loginGrid.hidden = false;
        updateUIForLoginStatus();
    }

    function showSetupMessage(title, message, isError = false) {
        setupTitle.textContent = title;
        setupMessage.textContent = message;
        setupMessage.classList.toggle('migration-error', isError);
        issueList.replaceChildren();
        setupPanel.hidden = false;
        loginGrid.hidden = true;
    }

    function appendDetail(list, label, value) {
        const detail = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value || 'Not available';
        detail.append(term, description);
        list.appendChild(detail);
    }

    function formatAmount(value) {
        if (value === null || value === undefined || value === '') return 'Not available';
        const amount = Number(value);
        return Number.isFinite(amount) ? `${amount.toLocaleString()} ETB` : 'Not available';
    }

    async function previewPostedDate(input, preview) {
        if (!input.value) {
            preview.textContent = '';
            return;
        }

        try {
            const requestedDate = input.value;
            const response = await fetch(
                `${apiBase}/migration/posted-date-preview?date=${encodeURIComponent(requestedDate)}`
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not preview this date.');
            if (input.value !== requestedDate) return;
            preview.textContent = `Ethiopian date: ${data.ethiopianDate} · Fiscal year: ${data.fiscalYear} E.C.`;
        } catch (error) {
            preview.textContent = error.message;
        }
    }

    function createIssueCard(record) {
        const card = document.createElement('article');
        card.className = 'migration-record-card';

        const title = document.createElement('h2');
        title.className = 'migration-record-title';
        title.textContent = `Purchase ${record.fs_number || record.purchase_id}`;

        const details = document.createElement('dl');
        details.className = 'migration-record-details';
        appendDetail(details, 'Vendor', record.vendor_name);
        appendDetail(details, 'Item', record.item_name);
        appendDetail(
            details,
            'Category / subcategory',
            [record.category_name, record.subcategory_name].filter(Boolean).join(' / ')
        );
        appendDetail(details, 'Purchase date (Gregorian)', record.purchase_date_gregorian);
        appendDetail(details, 'Purchase date (Ethiopian)', record.purchase_date_ethiopian);
        appendDetail(
            details,
            'Fiscal year if using purchase date',
            record.purchase_fiscal_year ? `${record.purchase_fiscal_year} E.C.` : 'Cannot be derived'
        );
        appendDetail(
            details,
            'Quantity',
            record.quantity == null ? null : `${record.quantity} ${record.unit || ''}`.trim()
        );
        appendDetail(details, 'Unit price', formatAmount(record.unit_price));
        appendDetail(details, 'VAT amount', formatAmount(record.vat_amount));
        appendDetail(details, 'Total amount', formatAmount(record.total_amount));
        appendDetail(details, 'FS number', record.fs_number);
        appendDetail(details, 'Record status', record.status);
        appendDetail(details, 'Current posted date', record.posted_date || 'Missing');

        const fallback = document.createElement('p');
        fallback.className = 'migration-record-fallback';
        fallback.textContent = record.purchase_fiscal_year
            ? `If this purchase date were used, this record would be assigned to ${record.purchase_fiscal_year} E.C. The posted date you enter will determine its actual fiscal year.`
            : 'The fiscal year cannot be derived from this purchase date. The posted date you enter will determine the record’s fiscal year.';

        const form = document.createElement('form');
        form.className = 'migration-date-form';
        const field = document.createElement('div');
        field.className = 'form-group';
        const label = document.createElement('label');
        label.className = 'label';
        label.textContent = 'Posted date (Gregorian)';
        const input = document.createElement('input');
        input.className = 'input';
        input.type = 'date';
        input.required = true;
        label.appendChild(input);
        field.appendChild(label);

        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-primary';
        saveButton.type = 'submit';
        saveButton.textContent = 'Save posted date';

        const preview = document.createElement('p');
        preview.className = 'migration-date-preview';
        preview.setAttribute('aria-live', 'polite');
        input.addEventListener('change', () => previewPostedDate(input, preview));

        const status = document.createElement('p');
        status.className = 'migration-record-status';
        status.setAttribute('role', 'status');

        form.append(field, saveButton, preview, status);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!input.reportValidity()) return;

            saveButton.disabled = true;
            status.textContent = 'Saving the date and completing migration…';
            try {
                const response = await fetch(`${apiBase}/migration/posted-date-repairs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        purchaseId: record.purchase_id,
                        postedDate: input.value
                    })
                });
                const data = await response.json();
                if (!response.ok) {
                    if (data.status === 'failed') {
                        showSetupMessage(
                            'Database setup could not finish',
                            data.error || 'The database could not be migrated. Keep the backup and contact support.',
                            true
                        );
                        return;
                    }
                    throw new Error(data.error || 'Could not save this posted date.');
                }

                if (data.status === 'ready') {
                    showSetupMessage(
                        'Fiscal-year setup complete',
                        'All required posted dates are saved. The database is ready; you can now log in.'
                    );
                    window.setTimeout(showLoginScreen, 1200);
                    return;
                }

                card.remove();
                setupMessage.textContent = `${data.remaining} purchase record(s) still need a posted date before fiscal-year setup can finish.`;
            } catch (error) {
                status.textContent = error.message;
                saveButton.disabled = false;
            }
        });

        card.append(title, details, fallback, form);
        return card;
    }

    async function loadPostedDateIssues() {
        const response = await fetch(`${apiBase}/migration/posted-date-issues`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load purchases needing posted dates.');
        return data.records;
    }

    async function checkDatabaseSetup() {
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
            try {
                const response = await fetch(`${apiBase}/migration/status`);
                const data = await response.json();
                if (response.ok && data.status === 'ready') {
                    showLoginScreen();
                    return;
                }
                if (response.ok && data.status === 'needs-posted-date-repair') {
                    let records;
                    try {
                        records = await loadPostedDateIssues();
                    } catch (error) {
                        showSetupMessage('Could not load purchases needing dates', error.message, true);
                        return;
                    }
                    showSetupMessage(
                        'Complete fiscal-year setup',
                        `${records.length} purchase record(s) need a posted date. Enter the date each record was posted to determine its fiscal year.`
                    );
                    records.forEach(record => issueList.appendChild(createIssueCard(record)));
                    return;
                }
                if (response.ok && data.status === 'failed') {
                    showSetupMessage(
                        'Database setup could not finish',
                        data.message || 'The database could not be migrated. Keep the backup and contact support.',
                        true
                    );
                    return;
                }
            } catch (error) {
                setupMessage.textContent = 'Starting the database service…';
            }

            await new Promise(resolve => window.setTimeout(resolve, 400));
        }

        showSetupMessage(
            'Database service is unavailable',
            'The local database service did not start. Restart the application and check its startup log.',
            true
        );
    }

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        showLoadingSpinner(true);
        loginStatusDiv.style.display = 'none';

        try {
            const response = await fetch(`${apiBase}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput.value,
                    password: passwordInput.value
                })
            });
            const data = await response.json();

            if (response.ok) {
                showLoginStatus(data.message, false);
                sessionStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', data.user.role);
            } else {
                showLoginStatus(data.message || 'Login failed', true);
                sessionStorage.setItem('isLoggedIn', 'false');
                localStorage.removeItem('userRole');
            }
        } catch (error) {
            console.error('Error during login:', error);
            showLoginStatus('An error occurred during login.', true);
            sessionStorage.setItem('isLoggedIn', 'false');
        } finally {
            showLoadingSpinner(false);
            updateUIForLoginStatus();
        }
    });

    checkDatabaseSetup();
});
