// This file has been refactored to work with the new report.html design.
// Key changes include:
// - All Ethiopian calendar logic has been removed from the client-side.
// - All date conversions are now handled by making async calls to the server.
// - Functions that rely on date conversions (switchView, report generation) are now async.
const { ipcRenderer, shell } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const fiscalYearSelect = document.getElementById('fiscal-year-select');
    const exportFiscalYearCatalogBtn = document.getElementById('export-fiscal-year-catalog-btn');
    const createFiscalYearBtn = document.getElementById('create-fiscal-year-btn');
    const lockFiscalYearBtn = document.getElementById('lock-fiscal-year-btn');
    const createFiscalYearModal = document.getElementById('createFiscalYearModal');
    const createFiscalYearForm = document.getElementById('createFiscalYearForm');
    const newFiscalYearInput = document.getElementById('newFiscalYearInput');
    const createFiscalYearSubmitBtn = document.getElementById('createFiscalYearSubmitBtn');
    const lockFiscalYearModal = document.getElementById('lockFiscalYearModal');
    const lockFiscalYearForm = document.getElementById('lockFiscalYearForm');
    const lockFiscalYearPasswordInput = document.getElementById('lockFiscalYearPasswordInput');
    const lockFiscalYearSubmitBtn = document.getElementById('lockFiscalYearSubmitBtn');
    const fiscalYearStatus = document.getElementById('fiscal-year-status');
    let activeFiscalYearYear = null;
    let activeFiscalYearLocked = false;
    let fiscalYearIdToLock = null;
    const fiscalYearReady = loadFiscalYears();

    async function loadFiscalYears() {
        fiscalYearSelect.disabled = true;
        exportFiscalYearCatalogBtn.disabled = true;
        createFiscalYearBtn.disabled = true;
        lockFiscalYearBtn.disabled = true;
        try {
            const response = await fetch('http://localhost:3000/fiscal-years');
            if (!response.ok) throw new Error('Failed to load fiscal years.');
            const { fiscalYears, activeFiscalYearId } = await response.json();
            fiscalYearSelect.innerHTML = '';
            fiscalYears.forEach(fiscalYear => {
                const option = document.createElement('option');
                option.value = fiscalYear.fiscal_year_id;
                option.dataset.year = fiscalYear.year;
                option.dataset.locked = String(Boolean(fiscalYear.is_locked));
                option.textContent = `${fiscalYear.year} E.C.`;
                fiscalYearSelect.appendChild(option);
            });
            fiscalYearSelect.value = activeFiscalYearId;
            const activeOption = fiscalYearSelect.selectedOptions[0];
            activeFiscalYearYear = Number(activeOption?.dataset.year);
            activeFiscalYearLocked = activeOption?.dataset.locked === 'true';
            document.body.classList.toggle('is-fiscal-year-locked', activeFiscalYearLocked);
            lockFiscalYearBtn.disabled = activeFiscalYearLocked || !activeOption;
            lockFiscalYearBtn.textContent = activeFiscalYearLocked ? 'Locked Permanently' : 'Lock Fiscal Year';
            fiscalYearStatus.textContent = activeFiscalYearLocked
                ? `${activeFiscalYearYear} E.C. is permanently locked. Its catalog and purchase records are read-only. You can now create the next fiscal year from this catalog.`
                : `${activeFiscalYearYear} E.C. is active and open. Permanently lock it before creating the next fiscal year.`;
            if (activeFiscalYearLocked) {
                ['newItemName', 'newItemUnitPrice', 'newItemDescription', 'addItemBtn', 'toggleReassignMode']
                    .forEach(id => {
                        const control = document.getElementById(id);
                        if (control) control.disabled = true;
                    });
                const disableItemActions = () => {
                    document.querySelectorAll('#items-table button').forEach(button => { button.disabled = true; });
                };
                disableItemActions();
                const itemsTableBody = document.querySelector('#items-table tbody');
                if (itemsTableBody) new MutationObserver(disableItemActions).observe(itemsTableBody, { childList: true, subtree: true });
            }
            return true;
        } catch (error) {
            console.error('Error loading fiscal years:', error);
            showNotification('Unable to load fiscal years. Please restart the application and try again.');
            return false;
        } finally {
            fiscalYearSelect.disabled = false;
            exportFiscalYearCatalogBtn.disabled = !fiscalYearSelect.value;
            createFiscalYearBtn.disabled = !fiscalYearSelect.value;
            lockFiscalYearBtn.disabled = activeFiscalYearLocked || !fiscalYearSelect.value;
        }
    }

    fiscalYearSelect?.addEventListener('change', async () => {
        if (!await showConfirmation('Switch the active fiscal year? Unsubmitted form changes will be discarded.', 'Switch Year')) {
            await loadFiscalYears();
            return;
        }
        fiscalYearSelect.disabled = true;
        try {
            const response = await fetch('http://localhost:3000/fiscal-years/active', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fiscal_year_id: fiscalYearSelect.value })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to change fiscal year.');
            window.location.reload();
        } catch (error) {
            showNotification(error.message);
            await loadFiscalYears();
        } finally {
            fiscalYearSelect.disabled = false;
        }
    });

    exportFiscalYearCatalogBtn?.addEventListener('click', () => {
        if (!fiscalYearSelect.value) {
            showNotification('Select a fiscal year before exporting its catalog.');
            return;
        }
        window.location.href = `http://localhost:3000/export/fiscal-year-catalog/${encodeURIComponent(fiscalYearSelect.value)}`;
    });

    createFiscalYearBtn?.addEventListener('click', () => {
        if (!activeFiscalYearLocked) {
            showNotification(`You can't create a new fiscal year while ${activeFiscalYearYear} E.C. is still open. Permanently lock it first.`);
            return;
        }
        newFiscalYearInput.value = String(activeFiscalYearYear + 1);
        openModal(createFiscalYearModal);
        newFiscalYearInput.focus();
    });

    createFiscalYearForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const year = Number(newFiscalYearInput.value);
        if (!Number.isInteger(year) || year < 1) {
            showNotification('Enter a valid Ethiopian fiscal year.');
            return;
        }
        if (!activeFiscalYearLocked) {
            showNotification(`You can't create a new fiscal year while ${activeFiscalYearYear} E.C. is still open. Permanently lock it first.`);
            return;
        }
        createFiscalYearBtn.disabled = true;
        createFiscalYearSubmitBtn.disabled = true;
        try {
            const response = await fetch('http://localhost:3000/fiscal-years', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to create fiscal year.');
            closeModal(createFiscalYearModal);
            window.location.reload();
        } catch (error) {
            showNotification(error.message);
        } finally {
            createFiscalYearBtn.disabled = false;
            createFiscalYearSubmitBtn.disabled = false;
        }
    });

    lockFiscalYearBtn?.addEventListener('click', async () => {
        if (activeFiscalYearLocked || !fiscalYearSelect.value) return;
        const confirmed = await showConfirmation(
            `Permanently lock ${activeFiscalYearYear} E.C.? Its catalog and purchase records cannot be changed, and the app has no unlock option.`,
            'Permanently Lock',
            true
        );
        if (!confirmed) return;
        fiscalYearIdToLock = fiscalYearSelect.value;
        lockFiscalYearPasswordInput.value = '';
        openModal(lockFiscalYearModal);
        lockFiscalYearPasswordInput.focus();
    });

    lockFiscalYearForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const password = lockFiscalYearPasswordInput.value;
        if (!password.trim() || !fiscalYearIdToLock) {
            showNotification('Enter the amendments password to lock the fiscal year.');
            return;
        }
        lockFiscalYearBtn.disabled = true;
        lockFiscalYearSubmitBtn.disabled = true;
        try {
            const response = await fetch(`http://localhost:3000/fiscal-years/${encodeURIComponent(fiscalYearIdToLock)}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to lock fiscal year.');
            closeModal(lockFiscalYearModal);
            await loadFiscalYears();
            showNotification('Fiscal year permanently locked. Its catalog and purchase records are now read-only.');
        } catch (error) {
            showNotification(error.message);
            lockFiscalYearPasswordInput.value = '';
            lockFiscalYearPasswordInput.focus();
        }
        lockFiscalYearSubmitBtn.disabled = false;
        lockFiscalYearBtn.disabled = activeFiscalYearLocked || !fiscalYearSelect.value;
    });

    // --- GENERAL & NAVIGATION ELEMENTS ---
    const navButtons = document.querySelectorAll('.nav .btn[data-section]');
    const allSections = document.querySelectorAll('.page-section');
    const defaultMessageSection = document.getElementById('reports-page-default-message');
    document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; });
    document.getElementById('go-to-workspace-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'workspace.html'; });
    const exportSummaryReportBtn = document.getElementById('export-summary-report-btn'); // Ensure this is defined
    const generateJvPdfBtn = document.getElementById('generate-jv-pdf-btn'); // <-- ADD THIS
    
    // --- DROPDOWN ELEMENTS ---
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const dropdownToggle = document.getElementById('reports-dropdown-btn');
    const dropdown = document.querySelector('.dropdown');
    const managementButton = document.getElementById('management-button');

    // --- VAT REPORT ELEMENTS ---
    const vatReportSection = document.getElementById('vat-report-section');
    const vatReportTitle = document.getElementById('vat-report-title');
    const ethiopianMonthSelect = document.getElementById('ethiopian-month-select');
    const generateVatReportBtn = document.getElementById('generate-vat-report-btn');
    const vatReportTableBody = document.querySelector('#vat-report-table tbody');
    const summaryVatAmount = document.getElementById('summary-vat-amount');
    const summaryBaseTotal = document.getElementById('summary-base-total');
    const summaryTotalAmount = document.getElementById('summary-total-amount');
    const exportVatReportBtn = document.getElementById('export-vat-report-btn');

    // --- JV REPORT ELEMENTS ---
    const jvReportSection = document.getElementById('jv-report-section');
    const singleDateInput = document.getElementById('single-date');
    const generateJvReportBtn = document.getElementById('generate-jv-report-btn');
    const jvReportTableBody = document.querySelector('#jv-report-table tbody');
    const jvReportTableFoot = document.querySelector('#jv-report-table tfoot');

    // --- SUMMARY REPORT ELEMENTS ---
    const summaryReportSection = document.getElementById('summary-report-section');
    const summaryReportTitle = document.getElementById('summary-report-title');
    const summaryEthiopianMonthSelect = document.getElementById('summary-ethiopian-month-select');
    const generateSummaryReportBtn = document.getElementById('generate-summary-report-btn');
    const summaryReportTableHead = document.querySelector('#summary-report-table thead tr');
    const summaryReportTableBody = document.querySelector('#summary-report-table tbody');

    // --- YEARLY REPORT ELEMENTS ---
    const yearlyReportSection = document.getElementById('yearly-report-section');
    const yearlyCategorySelect = document.getElementById('yearly-category-select');
    const yearlySubcategorySelect = document.getElementById('yearly-subcategory-select');
    const yearlyItemSelect = document.getElementById('yearly-item-select');
    const yearlyEthiopianMonthSelect = document.getElementById('yearly-ethiopian-month-select');
    const yearlyReportTitle = document.getElementById('yearly-report-title');
    const generateYearlyReportBtn = document.getElementById('generate-yearly-report-btn');
    const exportYearlyReportBtn = document.getElementById('export-yearly-report-btn');
    const yearlyReportTableBody = document.querySelector('#yearly-report-table tbody');
    const yearlySummaryVatAmount = document.getElementById('yearly-summary-vat-amount');
    const yearlySummaryBaseTotal = document.getElementById('yearly-summary-base-total');
    const yearlySummaryTotalAmount = document.getElementById('yearly-summary-total-amount');

    // --- MANAGEMENT ELEMENTS ---
    const managementSection = document.getElementById('management-section');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // --- VENDOR MANAGEMENT ELEMENTS ---
    const openVendorModalBtn = document.getElementById('openModalBtn');
    const vendorModal = document.getElementById('addVendorModal');
    const vendorForm = document.getElementById('addVendorForm');
    const mrcContainer = document.getElementById('mrcContainer');
    const addMrcBtn = document.getElementById('addMrcBtn');
    const vendorsTableBody = document.querySelector('#vendors-table tbody');

    // --- BACKUP MANAGEMENT ELEMENTS ---
    const backupPathInput = document.getElementById('backupPathInput');
    const browseBackupPathBtn = document.getElementById('browseBackupPathBtn');
    const performBackupBtn = document.getElementById('performBackupBtn');
    const backupStatusMessage = document.getElementById('backupStatusMessage');
    
    // --- ITEM & CATEGORY MANAGEMENT ELEMENTS ---
    const itemsTableBody = document.querySelector('#items-table tbody');
    const itemCategorySelect = document.getElementById('itemCategorySelect');
    const itemSubcategorySelect = document.getElementById('itemSubcategorySelect');
    const newItemNameInput = document.getElementById('newItemName');
    const newItemUnitPriceInput = document.getElementById('newItemUnitPrice');
    const newItemDescriptionInput = document.getElementById('newItemDescription');
    const addItemBtn = document.getElementById('addItemBtn');
    const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
    const deleteSubcategoryBtn = document.getElementById('deleteSubcategoryBtn');
    const itemSearchInput = document.getElementById('itemSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const toggleReassignMode = document.getElementById('toggleReassignMode');
    const showDisabledItemsToggle = document.getElementById('showDisabledItemsToggle');

    // --- CONTEXT MENU & REASSIGN PASSWORD ELEMENTS ---
    const customContextMenu = document.getElementById('customContextMenu');
    const contextMenuTitle = document.getElementById('contextMenuTitle');
    const ctxAddOption = document.getElementById('ctxAddOption');
    const ctxEditOption = document.getElementById('ctxEditOption');
    const ctxDeleteOption = document.getElementById('ctxDeleteOption');
    const ctxAddText = document.getElementById('ctxAddText');
    const ctxEditText = document.getElementById('ctxEditText');
    const ctxDeleteText = document.getElementById('ctxDeleteText');

    const reassignPasswordModal = document.getElementById('reassignPasswordModal');
    const reassignPasswordInput = document.getElementById('reassignPasswordInput');
    const reassignPasswordError = document.getElementById('reassignPasswordError');
    const confirmReassignPasswordBtn = document.getElementById('confirmReassignPasswordBtn');
    const cancelReassignPasswordBtn = document.getElementById('cancelReassignPasswordBtn');
    const closeReassignPassModalBtn = document.getElementById('closeReassignPassModalBtn');


    // --- MODAL ELEMENTS ---
    const allModals = document.querySelectorAll('.modal');
    // Category Modal
    const addCategoryModal = document.getElementById('addCategoryModal');
    const openAddCategoryModalBtn = document.getElementById('openAddCategoryModalBtn');
    const newCategoryNameInputModal = document.getElementById('newCategoryNameModal');
    const addCategoryBtnModal = document.getElementById('addCategoryBtnModal');
    const categoryModalTitle = addCategoryModal.querySelector('h2');
    const categoryEditIdInput = document.createElement('input'); categoryEditIdInput.type = 'hidden'; categoryEditIdInput.id = 'editCategoryId'; addCategoryModal.appendChild(categoryEditIdInput);
    // Subcategory Modal
    const addSubcategoryModal = document.getElementById('addSubcategoryModal');
    const openAddSubcategoryModalBtn = document.getElementById('openAddSubcategoryModalBtn');
    const subcategoryCategorySelectModal = document.getElementById('subcategoryCategorySelectModal');
    const newSubcategoryNameInputModal = document.getElementById('newSubcategoryNameModal');
    const addSubcategoryBtnModal = document.getElementById('addSubcategoryBtnModal');
    const subcategoryModalTitle = addSubcategoryModal.querySelector('h2');
    const subcategoryEditIdInput = document.createElement('input'); subcategoryEditIdInput.type = 'hidden'; subcategoryEditIdInput.id = 'editSubcategoryId'; addSubcategoryModal.appendChild(subcategoryEditIdInput);
    // Notification Modal
    const customNotificationModal = document.getElementById('customNotificationModal');
    const notificationMessage = document.getElementById('notificationMessage');
    const customConfirmationModal = document.getElementById('customConfirmationModal');
    const customConfirmationMessage = document.getElementById('customConfirmationMessage');
    const customConfirmationCancelBtn = document.getElementById('cancelCustomConfirmationBtn');
    const customConfirmationAcceptBtn = document.getElementById('acceptCustomConfirmationBtn');
    const closeCustomConfirmationBtn = document.getElementById('closeCustomConfirmationBtn');
    let resolveCustomConfirmation = null;
    
    // --- SUMMARY REPORT STATE ---
    let allUniqueItems = [];
    let currentReportData = [];

    // ── JV Custom Calendar Picker ────────────────────────────────────────────
    (function initJvCalendar() {
        const wrapper   = document.getElementById('jv-cal-wrapper');
        const input     = document.getElementById('single-date');
        const calendar  = document.getElementById('jv-calendar');
        const grid      = document.getElementById('jv-cal-grid');
        const title     = document.getElementById('jv-cal-title');
        const prevBtn   = document.getElementById('jv-cal-prev');
        const nextBtn   = document.getElementById('jv-cal-next');
        if (!wrapper || !input || !calendar) return;

        const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
        const MONTHS = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

        let postedDates = new Set();  // set of 'YYYY-MM-DD' strings
        let viewYear, viewMonth;       // currently displayed month
        let selectedDate = null;       // 'YYYY-MM-DD'

        // Initialise view to today's month
        const now = new Date();
        viewYear  = now.getFullYear();
        viewMonth = now.getMonth(); // 0-based

        // Fetch all posted dates once
        fetch('http://localhost:3000/posted-dates')
            .then(r => r.json())
            .then(dates => {
                if (Array.isArray(dates)) {
                    dates.forEach(d => postedDates.add(d));
                }
                renderCalendar();
            })
            .catch(() => renderCalendar());

        function pad(n) { return String(n).padStart(2, '0'); }

        function toISO(y, m, d) {
            return `${y}-${pad(m + 1)}-${pad(d)}`;
        }

        function renderCalendar() {
            title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
            grid.innerHTML = '';

            // Day name headers
            DAYS.forEach(d => {
                const el = document.createElement('div');
                el.className = 'jv-cal-day-name';
                el.textContent = d;
                grid.appendChild(el);
            });

            const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

            const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate());

            // Leading empty cells (prev month days)
            for (let i = 0; i < firstDay; i++) {
                const day = daysInPrev - firstDay + 1 + i;
                const cell = makeCell(day, viewYear, viewMonth - 1, true, todayISO);
                grid.appendChild(cell);
            }

            // Current month days
            for (let d = 1; d <= daysInMonth; d++) {
                const cell = makeCell(d, viewYear, viewMonth, false, todayISO);
                grid.appendChild(cell);
            }

            // Trailing cells (next month)
            const total = firstDay + daysInMonth;
            const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
            for (let d = 1; d <= trailing; d++) {
                const cell = makeCell(d, viewYear, viewMonth + 1, true, todayISO);
                grid.appendChild(cell);
            }
        }

        function makeCell(day, year, month, otherMonth, todayISO) {
            const dateObj = new Date(year, month, day);
            const y = dateObj.getFullYear();
            const m = dateObj.getMonth();
            const d = dateObj.getDate();
            const iso = toISO(y, m, d);

            const cell = document.createElement('div');
            cell.className = 'jv-cal-cell';
            if (otherMonth)      cell.classList.add('other-month');
            if (iso === todayISO) cell.classList.add('today');
            if (iso === selectedDate) cell.classList.add('selected');

            // Day number
            const numEl = document.createElement('span');
            numEl.textContent = d;
            cell.appendChild(numEl);

            // Red dot if this date has posted records
            if (postedDates.has(iso)) {
                const dot = document.createElement('div');
                dot.className = 'jv-dot';
                cell.appendChild(dot);
            }

            cell.addEventListener('click', () => {
                selectedDate = iso;
                input.value = iso;
                input.dispatchEvent(new Event('change'));
                closeCalendar();
            });

            return cell;
        }

        function openCalendar()  { calendar.style.display = 'block'; renderCalendar(); }
        function closeCalendar() { calendar.style.display = 'none'; }
        function isOpen()        { return calendar.style.display !== 'none'; }

        // Toggle on input click
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen() ? closeCalendar() : openCalendar();
        });

        // Navigation
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewMonth--;
            if (viewMonth < 0) { viewMonth = 11; viewYear--; }
            renderCalendar();
        });
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewMonth++;
            if (viewMonth > 11) { viewMonth = 0; viewYear++; }
            renderCalendar();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) closeCalendar();
        });

        // Refresh posted dots after a section switch
        document.querySelectorAll('.dropdown-item, #management-button').forEach(btn => {
            btn.addEventListener('click', () => {
                fetch('http://localhost:3000/posted-dates')
                    .then(r => r.json())
                    .then(dates => { if (Array.isArray(dates)) postedDates = new Set(dates); })
                    .catch(() => {});
            });
        });
    })();


    // --- SERVER-SIDE DATE CONVERSION HELPERS ---
    
    /**
     * Fetches the Gregorian date range for a given Ethiopian month and year from the server.
     * @param {number} etYear - The Ethiopian year.
     * @param {number} etMonth - The Ethiopian month.
     * @returns {Promise<{startDate: string, endDate: string}|null>}
     */
    async function fetchGregorianRange(etYear, etMonth) {
        try {
            const response = await fetch(`http://localhost:3000/get-gregorian-range?year=${etYear}&month=${etMonth}`);
            if (!response.ok) {
                showNotification('Failed to fetch date range from server.');
                return null;
            }
            return await response.json();
        } catch (error) {
            showNotification('Network error fetching date range.');
            return null;
        }
    }

    /**
     * Fetches the Ethiopian date for a given Gregorian date string from the server.
     * @param {string} gregorianDateString - The date string in "YYYY-MM-DD" format.
     * @returns {Promise<{year: number, month: number, day: number}|null>}
     */
    async function fetchEthiopianDate(gregorianDateString) {
        try {
            const response = await fetch(`http://localhost:3000/convert-to-ethiopian?date=${gregorianDateString}`);
            if (!response.ok) {
                showNotification('Failed to fetch Ethiopian date from server.');
                return null;
            }
            return await response.json();
        } catch (error) {
            showNotification('Network error fetching Ethiopian date.');
            return null;
        }
    }


    // --- ASYNC NAVIGATION LOGIC ---
    async function switchView(targetSectionId) {
        if (!await fiscalYearReady) return;
        defaultMessageSection.style.display = 'none';
        allSections.forEach(section => section.style.display = 'none');
        
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update active states for nav buttons and dropdown items
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === targetSectionId);
        });
        
        // Update dropdown items active state
        dropdownItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === targetSectionId);
        });
        
        // Update management button active state
        if (managementButton) {
            managementButton.classList.toggle('active', managementButton.dataset.section === targetSectionId);
        }
        
        // Update dropdown toggle text and active state based on active report
        const activeReport = Array.from(dropdownItems).find(item => item.dataset.section === targetSectionId);
        if (activeReport && dropdownToggle) {
            dropdownToggle.innerHTML = `${activeReport.textContent} <span class="dropdown-arrow">▼</span>`;
            dropdownToggle.classList.add('active');
        } else if (dropdownToggle) {
            dropdownToggle.innerHTML = `Reports <span class="dropdown-arrow">▼</span>`;
            dropdownToggle.classList.remove('active');
        }

        // Pre-populate and fetch data for date-based reports
        if (targetSectionId === 'vat-report-section' || targetSectionId === 'summary-report-section') {
            const reportPeriodName = targetSectionId === 'vat-report-section' ? 'VAT Report' : 'Summary Report';
            const reportTitle = targetSectionId === 'vat-report-section' ? vatReportTitle : summaryReportTitle;
            reportTitle.textContent = `${reportPeriodName} - ${activeFiscalYearYear} E.C.`;
            const todayStr = new Date().toISOString().split('T')[0];
            const etDate = await fetchEthiopianDate(todayStr);

            if (etDate) {
                const monthSelect = targetSectionId === 'vat-report-section' ? ethiopianMonthSelect : summaryEthiopianMonthSelect;
                monthSelect.value = etDate.month;
                
                const range = await fetchGregorianRange(activeFiscalYearYear, etDate.month);
                if (range) {
                    if (targetSectionId === 'vat-report-section') {
                        fetchVatReport(range.startDate, range.endDate);
                    } else {
                        fetchSummaryReport(range.startDate, range.endDate);
                    }
                }
            }
        } else if (targetSectionId === 'yearly-report-section') {
            await Promise.all([loadYearlyCategories(), loadYearlySubcategories(), loadYearlyItems()]);
            updateYearlyReportTitle();
            const etDate = await fetchEthiopianDate(new Date().toISOString().split('T')[0]);
            if (etDate) yearlyEthiopianMonthSelect.value = etDate.month;
        } else if (targetSectionId === 'management-section') {
             // Default to the vendor tab when management is opened
            document.querySelector('.tab-button[data-tab="vendor-tab"]').click();
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Toggle dropdown
    dropdownToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // Handle dropdown item clicks
    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.section);
            dropdown.classList.remove('active');
        });
    });

    // Handle management button
    managementButton?.addEventListener('click', () => {
        switchView(managementButton.dataset.section);
    });

    // Handle regular nav buttons (if any remain)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.section);
        });
    });
    
    // --- REFACTORED MODAL HANDLING ---
    function openModal(modalElement, mode = 'add', data = {}) {
        modalElement.style.display = 'flex';
        modalElement.setAttribute('data-mode', mode);

        if (modalElement === vendorModal) {
            vendorForm.reset();
            mrcContainer.innerHTML = '<div class="mrc-input-group"><input type="text" name="mrcNumbers[]" class="input"/></div>';

            if (mode === 'edit') {
                vendorModal.querySelector('#vendorModalTitle').textContent = 'Edit Vendor';
                vendorModal.querySelector('#vendorId').value = data.vendor_id;
                vendorModal.querySelector('#vendorName').value = data.vendor_name;
                vendorModal.querySelector('#tinNumber').value = data.tin_number;
                if (data.mrc_numbers && data.mrc_numbers.length) {
                    mrcContainer.innerHTML = data.mrc_numbers.map(mrc => `
                        <div class="mrc-input-group">
                            <input type="text" name="mrcNumbers[]" class="input" value="${mrc}"/>
                            <button type="button" class="btn btn-ghost btn-remove-mrc">&times;</button>
                        </div>
                    `).join('');
                }
            } else {
                 vendorModal.querySelector('#vendorModalTitle').textContent = 'Add New Vendor';
            }
        }
    }

    function closeModal(modalElement) {
        modalElement.style.display = 'none';
    }

    allModals.forEach(modal => {
        modal.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => closeModal(modal));
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    function finishConfirmation(confirmed) {
        if (!resolveCustomConfirmation) return;
        const resolve = resolveCustomConfirmation;
        resolveCustomConfirmation = null;
        closeModal(customConfirmationModal);
        resolve(confirmed);
    }

    function showConfirmation(message, actionLabel = 'Confirm', isDanger = false) {
        if (resolveCustomConfirmation) return Promise.resolve(false);
        customConfirmationMessage.textContent = message;
        customConfirmationAcceptBtn.textContent = actionLabel;
        customConfirmationAcceptBtn.classList.toggle('btn-danger', isDanger);
        customConfirmationAcceptBtn.classList.toggle('btn-primary', !isDanger);
        customConfirmationModal.style.display = 'flex';

        return new Promise(resolve => {
            resolveCustomConfirmation = resolve;
            customConfirmationCancelBtn.focus();
        });
    }

    customConfirmationAcceptBtn.addEventListener('click', () => finishConfirmation(true));
    customConfirmationCancelBtn.addEventListener('click', () => finishConfirmation(false));
    closeCustomConfirmationBtn.addEventListener('click', () => finishConfirmation(false));
    customConfirmationModal.addEventListener('click', event => {
        if (event.target === customConfirmationModal) finishConfirmation(false);
    });

    function showNotification(message) {
        notificationMessage.textContent = message;
        customNotificationModal.style.display = 'flex';
    }
    
    // --- VAT REPORT LOGIC WITH PAGINATION ---
    let vatReportState = {
        startDate: null,
        endDate: null,
        currentOffset: 0,
        pageSize: 20, // Load 20 records at a time
        isLoading: false,
        hasMore: true,
        totalRecords: 0,
        totalVat: 0,
        totalBase: 0,
        totalAmount: 0
    };

    const vatReportTableWrapper = document.querySelector('#vat-report-section .table-wrapper');

    const fetchVatReport = async (startDate, endDate, reset = true) => {
        if (vatReportState.isLoading) return;
        
        vatReportState.isLoading = true;
        
        if (reset) {
            // Reset state for new report
            vatReportState.startDate = startDate;
            vatReportState.endDate = endDate;
            vatReportState.currentOffset = 0;
            vatReportState.hasMore = true;
            vatReportState.totalVat = 0;
            vatReportState.totalBase = 0;
            vatReportState.totalAmount = 0;
            vatReportTableBody.innerHTML = '';
        }

        try {
            const url = `http://localhost:3000/reports/vat?startDate=${startDate}&endDate=${endDate}&limit=${vatReportState.pageSize}&offset=${vatReportState.currentOffset}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (response.ok) {
                // Handle paginated response
                const data = result.data || result; // Support both paginated and non-paginated responses
                const hasMore = result.hasMore !== undefined ? result.hasMore : (data.length === vatReportState.pageSize);
                
                if (reset && data.length === 0) {
                    vatReportTableBody.innerHTML = '<tr><td colspan="11" class="placeholder-cell">No data for the selected date range.</td></tr>';
                    summaryVatAmount.textContent = '0.00';
                    summaryBaseTotal.textContent = '0.00';
                    summaryTotalAmount.textContent = '0.00';
                    vatReportState.isLoading = false;
                    return;
                }

                renderVatReportChunk(data, reset);
                
                vatReportState.currentOffset += data.length;
                vatReportState.hasMore = hasMore;
                if (result.total !== undefined) {
                    vatReportState.totalRecords = result.total;
                }
            } else {
                showNotification(`Error fetching VAT report: ${result.error}`);
            }
        } catch (error) {
            showNotification('Network error fetching VAT report. Please check server connection.');
        } finally {
            vatReportState.isLoading = false;
        }
    };

    const renderVatReportChunk = (data, reset) => {
        // Remove loading indicator if present
        const loadingRow = vatReportTableBody.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.remove();
        }

        if (reset) {
            vatReportState.totalVat = 0;
            vatReportState.totalBase = 0;
            vatReportState.totalAmount = 0;
        }

        data.forEach(record => {
            const baseTotal = (record.total_amount || 0) - (record.vat_amount || 0);
            
            const date = new Date(record.purchase_date);
            const formattedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const row = vatReportTableBody.insertRow();
            row.innerHTML = `
                <td>${record.tin_number}</td>
                <td>${record.vendor_name}</td>
                <td>${formattedDate}</td>
                <td>${record.mrc_number || ''}</td>
                <td>${record.fs_number || ''}</td>
                <td>${record.item_name}</td>
                <td class="is-numeric">${record.quantity}</td>
                <td class="is-numeric">${(record.unit_price || 0).toFixed(2)}</td>
                <td class="is-numeric">${baseTotal.toFixed(2)}</td>
                <td class="is-numeric">${(record.vat_amount || 0).toFixed(2)}</td>
                <td class="is-numeric">${(record.total_amount || 0).toFixed(2)}</td>
            `;
            
            vatReportState.totalVat += record.vat_amount || 0;
            vatReportState.totalBase += baseTotal;
            vatReportState.totalAmount += record.total_amount || 0;
        });

        // Update summary totals
        summaryVatAmount.textContent = vatReportState.totalVat.toFixed(2);
        summaryBaseTotal.textContent = vatReportState.totalBase.toFixed(2);
        summaryTotalAmount.textContent = vatReportState.totalAmount.toFixed(2);

        // Add loading indicator if there's more data to load
        if (vatReportState.hasMore) {
            const loadingRow = vatReportTableBody.insertRow();
            loadingRow.className = 'loading-row';
            loadingRow.innerHTML = '<td colspan="11" class="placeholder-cell" style="text-align: center; padding: 1rem;">Loading more records...</td>';
        }
    };

    // Infinite scroll handler with throttling
    let scrollTimeout;
    if (vatReportTableWrapper) {
        vatReportTableWrapper.addEventListener('scroll', () => {
            // Throttle scroll events
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const wrapper = vatReportTableWrapper;
                const scrollTop = wrapper.scrollTop;
                const scrollHeight = wrapper.scrollHeight;
                const clientHeight = wrapper.clientHeight;
                
                // Load more when user scrolls to within 200px of bottom
                if (scrollTop + clientHeight >= scrollHeight - 200 && 
                    vatReportState.hasMore && 
                    !vatReportState.isLoading &&
                    vatReportState.startDate) {
                    fetchVatReport(vatReportState.startDate, vatReportState.endDate, false);
                }
            }, 100); // Throttle to every 100ms
        });
    }

    generateVatReportBtn?.addEventListener('click', async () => {
        const etYear = getActiveFiscalReportYear();
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);
        if (etYear === null) return;
        
        const range = await fetchGregorianRange(etYear, etMonth);
        if (range) {
            fetchVatReport(range.startDate, range.endDate);
        }
    });
    exportSummaryReportBtn?.addEventListener('click', async () => {
        const etYear = getActiveFiscalReportYear();
        const etMonth = parseInt(summaryEthiopianMonthSelect.value, 10);
        if (etYear === null) return;

        const range = await fetchGregorianRange(etYear, etMonth);
        if (!range) {
            showNotification('Could not determine date range to export.');
            return;
        }

        const url = `http://localhost:3000/export/summary-report?startDate=${range.startDate}&endDate=${range.endDate}&etYear=${etYear}&etMonth=${etMonth}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `Summary_Report_${etYear}-${String(etMonth).padStart(2, '0')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    generateJvPdfBtn?.addEventListener('click', () => {
        const date = singleDateInput.value;
        if (!date) {
            showNotification("Please select a date first.");
            return;
        }
        const url = `http://localhost:3000/export/jv-pdf?singledate=${date}`;
        const filename = `JV_Report_${date}.pdf`;
        ipcRenderer.send('print-to-pdf', { url, filename });
    });

    // --- PDF PRINTING IPC ---
    ipcRenderer.on('print-to-pdf-complete', (event, { success, path, error }) => {
        if (success) {
            showNotification(`PDF saved successfully to ${path}`);
            // Optionally, open the file
            shell.openPath(path).catch(err => {
                console.error('Failed to open PDF:', err);
                showNotification('PDF saved, but failed to open automatically.');
            });
        } else {
            showNotification(`Failed to save PDF: ${error}`);
        }
    });

    exportVatReportBtn?.addEventListener('click', async () => {
        const etYear = getActiveFiscalReportYear();
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);
        if (etYear === null) return;

        const range = await fetchGregorianRange(etYear, etMonth);
        if (range) {
            window.location.href = `http://localhost:3000/export/vat-report?startDate=${range.startDate}&endDate=${range.endDate}`;
        }
    });

    // --- JV REPORT LOGIC (MODIFIED) ---
    const fetchjvreport = async (singledate) => {
        try {    
            const response = await fetch(`http://localhost:3000/reports/jv?singledate=${singledate}`)
            const reportData = await response.json();
            if (response.ok) renderJVReport(reportData);
            else showNotification(`Error fetching JV report: ${reportData.error}`);
        } catch (error) {
            showNotification('Network error fetching JV report.');
        }
    };
    
    function renderJVReport(data) {
        jvReportTableBody.innerHTML = "";
        jvReportTableFoot.innerHTML = "";
        const { details, totals } = data;

        if (!details || details.length === 0) {
            jvReportTableBody.innerHTML = '<tr><td colspan="5" class="placeholder-cell">No data for the selected date.</td></tr>';
            return;
        }

        details.forEach(record => {
            const baseTotal = record.base_total || 0;
            const birr = Math.floor(baseTotal);
            const cents = Math.round((baseTotal - birr) * 100);
            jvReportTableBody.innerHTML += `
                <tr>
                    <td>${record.item_name}</td>
                    <td class="is-numeric">${birr}</td>
                    <td class="is-numeric">${cents}</td>
                    <td class="is-numeric"></td>
                    <td class="is-numeric"></td>
                </tr>
            `;
        });
        
        const totalVatSum = totals.total_vat || 0;
        const cashTotalSum = totals.grand_total || 0;
        
        const totalVatBirr = Math.floor(totalVatSum);
        const totalVatCents = Math.round((totalVatSum - totalVatBirr) * 100);

        const cashTotalBirr = Math.floor(cashTotalSum);
        const cashTotalCents = Math.round((cashTotalSum - cashTotalBirr) * 100);

        jvReportTableFoot.innerHTML = `
            <tr>
                <td><strong>Total VAT</strong></td>
                <td class="is-numeric"><strong>${totalVatBirr}</strong></td>
                <td class="is-numeric"><strong>${totalVatCents}</strong></td>
                <td class="is-numeric"></td>
                <td class="is-numeric"></td>
            </tr>
            <tr>
                <td><strong>Cash</strong></td>
                <td class="is-numeric"></td>
                <td class="is-numeric"></td>
                <td class="is-numeric"><strong>${cashTotalBirr}</strong></td>
                <td class="is-numeric"><strong>${cashTotalCents}</strong></td>
            </tr>
        `;
    }

    generateJvReportBtn?.addEventListener('click', ()=>{
        if (!singleDateInput.value) {
          showNotification("Please select a date first.");
          return;
        }
        fetchjvreport(singleDateInput.value);
    });
    
    // --- SUMMARY REPORT LOGIC (MODIFIED for scrolling) ---
    async function fetchSummaryReport(startDate, endDate) {
        try {
            const reportResponse = await fetch(`http://localhost:3000/reports/summary?startDate=${startDate}&endDate=${endDate}`);
            const reportData = await reportResponse.json();

            if (!reportResponse.ok) {
                showNotification(`Error fetching Summary report: ${reportData.error || 'Failed to fetch report data'}`);
                return;
            }

            renderSummaryReport(reportData, startDate, endDate);
        } catch (error) {
            showNotification('Network error fetching Summary report.');
        }
    }

function renderSummaryReport(reportData, startDate, endDate) {
    console.log(startDate, endDate);

    summaryReportTableHead.innerHTML = '<th>Date</th>';
    summaryReportTableBody.innerHTML = '';

    const summaryReportTable = document.getElementById('summary-report-table');
    let summaryReportTableFoot = summaryReportTable.querySelector('tfoot');

    if (summaryReportTableFoot) {
        summaryReportTableFoot.innerHTML = '';
    } else {
        summaryReportTableFoot = document.createElement('tfoot');
        summaryReportTable.appendChild(summaryReportTableFoot);
    }

    // --- LOCAL DATE UTILITIES (NO UTC SHIFT) ---
    function toLocalDate(d) {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day); // local date, not UTC
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const allDatesInMonth = [];
    let currentDate = toLocalDate(startDate);
    const lastDate = toLocalDate(endDate);

    // Build date range
    while (currentDate <= lastDate) {
        allDatesInMonth.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const uniqueItems = [...new Set(reportData.map(record => record.item_name))];
    allUniqueItems = uniqueItems.sort();

    // Table header
    allUniqueItems.forEach(item => summaryReportTableHead.innerHTML += `<th>${item}</th>`);
    summaryReportTableHead.innerHTML += `<th class="is-numeric">Total VAT</th>`;

    const columnTotals = { totalVat: 0 };
    allUniqueItems.forEach(item => columnTotals[item] = 0);

    if (!reportData || reportData.length === 0) {
        // No data → render empty rows
        allDatesInMonth.forEach(date => {
            let rowHtml = `<td>${toLocalDate(date).toLocaleDateString()}</td>`;
            allUniqueItems.forEach(() => {
                rowHtml += `<td class="is-numeric">-</td>`;
            });
            rowHtml += `<td class="is-numeric">-</td>`;
            summaryReportTableBody.innerHTML += `<tr>${rowHtml}</tr>`;
        });

        let footerHtml = `<td><strong>Total</strong></td>`;
        allUniqueItems.forEach(() => footerHtml += `<td class="is-numeric"><strong>-</strong></td>`);
        footerHtml += `<td class="is-numeric"><strong>-</strong></td>`;
        summaryReportTableFoot.innerHTML = `<tr>${footerHtml}</tr>`;
        return;
    }

    currentReportData = reportData;

    // Group data by date (dates already stored as 'YYYY-MM-DD')
    const groupedByDate = currentReportData.reduce((acc, record) => {
        const date = record.purchase_date; // already ISO string
        if (!acc[date]) {
            acc[date] = { items: {}, dailyTotalVat: 0 };
        }
        acc[date].items[record.item_name] =
            (acc[date].items[record.item_name] || 0) + record.base_total;
        acc[date].dailyTotalVat += record.total_vat;
        return acc;
    }, {});

    // Render all rows
    allDatesInMonth.forEach(date => {
        const dateData = groupedByDate[date];
        let rowHtml = `<td>${toLocalDate(date).toLocaleDateString()}</td>`;

        if (dateData) {
            allUniqueItems.forEach(item => {
                const baseTotal = dateData.items[item] || 0;
                columnTotals[item] += baseTotal;
                rowHtml += `<td class="is-numeric">${baseTotal > 0 ? baseTotal.toFixed(2) : '-'}</td>`;
            });

            columnTotals.totalVat += dateData.dailyTotalVat;
            rowHtml += `<td class="is-numeric">${dateData.dailyTotalVat > 0 ? dateData.dailyTotalVat.toFixed(2) : '-'}</td>`;
        } else {
            allUniqueItems.forEach(() => {
                rowHtml += `<td class="is-numeric">-</td>`;
            });
            rowHtml += `<td class="is-numeric">-</td>`;
        }

        summaryReportTableBody.innerHTML += `<tr>${rowHtml}</tr>`;
    });

    // Footer totals
    let footerHtml = `<td><strong>Total</strong></td>`;
    allUniqueItems.forEach(item => {
        const total = columnTotals[item];
        footerHtml += `<td class="is-numeric"><strong>${total > 0 ? total.toFixed(2) : '-'}</strong></td>`;
    });

    const grandTotalVat = columnTotals.totalVat;
    footerHtml += `<td class="is-numeric"><strong>${grandTotalVat > 0 ? grandTotalVat.toFixed(2) : '-'}</strong></td>`;

    summaryReportTableFoot.innerHTML = `<tr>${footerHtml}</tr>`;
}

    generateSummaryReportBtn?.addEventListener('click', async () => {
        const etYear = getActiveFiscalReportYear();
        const etMonth = parseInt(summaryEthiopianMonthSelect.value, 10);
        if (etYear === null) return;
        
        const range = await fetchGregorianRange(etYear, etMonth);
        if (range) {
            fetchSummaryReport(range.startDate, range.endDate);
        }
    });

    // --- YEARLY REPORT LOGIC (cascading Category, Subcategory, and Item filters) ---
    let currentYearlyPeriod = 'yearly';
    let yearlyCategories = [];
    let yearlySubcategories = [];
    let yearlyItems = [];

    function updateYearlyReportTitle() {
        const periodName = currentYearlyPeriod === 'monthly' ? 'Monthly' : 'Yearly';
        yearlyReportTitle.textContent = `${periodName} Report - ${activeFiscalYearYear} E.C.`;
    }

    function getActiveFiscalReportYear() {
        if (!Number.isInteger(activeFiscalYearYear) || activeFiscalYearYear < 1) {
            showNotification('Unable to determine the active fiscal year.');
            return null;
        }
        return activeFiscalYearYear;
    }

    document.querySelectorAll('.yearly-period-btn').forEach(button => {
        button.addEventListener('click', () => {
            currentYearlyPeriod = button.dataset.period;
            document.querySelectorAll('.yearly-period-btn').forEach(periodButton => {
                const isActive = periodButton === button;
                periodButton.classList.toggle('active', isActive);
                periodButton.setAttribute('aria-pressed', String(isActive));
            });
            yearlyEthiopianMonthSelect.hidden = currentYearlyPeriod !== 'monthly';
            updateYearlyReportTitle();
            clearYearlyReport();
        });
    });

    yearlyEthiopianMonthSelect?.addEventListener('change', clearYearlyReport);

    function setYearlySelectOptions(select, placeholder, rows, valueKey, labelKey, preserveSelection) {
        const selectedValue = preserveSelection ? select.value : '';
        select.innerHTML = '';
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        select.appendChild(placeholderOption);
        rows.forEach(row => {
            const option = document.createElement('option');
            option.value = row[valueKey];
            option.textContent = row[labelKey];
            select.appendChild(option);
        });
        if (selectedValue && rows.some(row => String(row[valueKey]) === selectedValue)) {
            select.value = selectedValue;
        }
    }

    function updateYearlyItemOptions(preserveSelection = false) {
        const categoryId = yearlyCategorySelect.value;
        const subcategoryId = yearlySubcategorySelect.value;
        const matchingItems = yearlyItems.filter(item =>
            item.category_id === categoryId && item.subcategory_id === subcategoryId
        );
        setYearlySelectOptions(yearlyItemSelect, 'Select Item', matchingItems, 'item_id', 'item_name', preserveSelection);
        yearlyItemSelect.disabled = !subcategoryId || matchingItems.length === 0;
    }

    function updateYearlySubcategoryOptions(preserveSelection = false) {
        const categoryId = yearlyCategorySelect.value;
        const matchingSubcategories = yearlySubcategories.filter(subcategory => subcategory.category_id === categoryId);
        setYearlySelectOptions(yearlySubcategorySelect, 'Select Subcategory', matchingSubcategories, 'subcategory_id', 'subcategory_name', preserveSelection);
        yearlySubcategorySelect.disabled = !categoryId || matchingSubcategories.length === 0;
        updateYearlyItemOptions(preserveSelection);
    }

    function clearYearlyReport() {
        yearlyReportTableBody.innerHTML = '<tr><td colspan="11" class="placeholder-cell">Select a category, subcategory, or item to generate the report for the active fiscal year.</td></tr>';
        yearlySummaryVatAmount.textContent = '0.00';
        yearlySummaryBaseTotal.textContent = '0.00';
        yearlySummaryTotalAmount.textContent = '0.00';
        yearlyReportState.filterId = null;
        yearlyReportState.startDate = null;
    }

    function getYearlyReportFilter() {
        if (yearlyItemSelect.value) return { filterType: 'item', filterId: yearlyItemSelect.value };
        if (yearlySubcategorySelect.value) return { filterType: 'subcategory', filterId: yearlySubcategorySelect.value };
        if (yearlyCategorySelect.value) return { filterType: 'category', filterId: yearlyCategorySelect.value };
        return null;
    }

    yearlyCategorySelect?.addEventListener('change', () => {
        updateYearlySubcategoryOptions();
        clearYearlyReport();
    });
    yearlySubcategorySelect?.addEventListener('change', () => {
        updateYearlyItemOptions();
        clearYearlyReport();
    });
    yearlyItemSelect?.addEventListener('change', clearYearlyReport);

    async function loadYearlyCategories() {
        if (!yearlyCategorySelect) return;
        try {
            const response = await fetch('http://localhost:3000/categories');
            if (!response.ok) throw new Error('Failed to load categories.');
            yearlyCategories = await response.json();
            setYearlySelectOptions(yearlyCategorySelect, 'Select Category', yearlyCategories, 'category_id', 'category_name', true);
            updateYearlySubcategoryOptions(true);
        } catch (e) {
            console.error('Error loading yearly categories:', e);
            showNotification('Unable to load yearly report categories.');
        }
    }

    async function loadYearlySubcategories() {
        if (!yearlySubcategorySelect) return;
        try {
            const response = await fetch('http://localhost:3000/subcategories/list');
            if (!response.ok) throw new Error('Failed to load subcategories.');
            yearlySubcategories = await response.json();
            updateYearlySubcategoryOptions(true);
        } catch (e) {
            console.error('Error loading yearly subcategories:', e);
            showNotification('Unable to load yearly report subcategories.');
        }
    }

    async function loadYearlyItems() {
        if (!yearlyItemSelect) return;
        try {
            const response = await fetch('http://localhost:3000/items?include_disabled=false');
            if (!response.ok) throw new Error('Failed to load items.');
            yearlyItems = await response.json();
            yearlyItems.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));
            updateYearlyItemOptions(true);
        } catch (e) {
            console.error('Error loading yearly items:', e);
            showNotification('Unable to load yearly report items.');
        }
    }

    /**
     * Fetches the Gregorian year range for a given Ethiopian year from the server.
     * @param {number} etYear - The Ethiopian year.
     * @returns {Promise<{startDate: string, endDate: string}|null>}
     */
    async function fetchGregorianYearRange(etYear) {
        try {
            const response = await fetch(`http://localhost:3000/get-gregorian-year-range?year=${etYear}`);
            if (!response.ok) {
                showNotification('Failed to fetch year range from server.');
                return null;
            }
            return await response.json();
        } catch (error) {
            showNotification('Network error fetching year range.');
            return null;
        }
    }

    function formatDateForApi(datePart) {
        const pad = (num) => String(num).padStart(2, '0');
        if (!datePart) return '';
        const { day, month, year } = datePart;
        return `${year}-${pad(month)}-${pad(day)}`;
    }

    async function fetchSelectedYearlyDateRange(etYear) {
        if (currentYearlyPeriod === 'monthly') {
            const etMonth = parseInt(yearlyEthiopianMonthSelect.value, 10);
            if (!Number.isInteger(etMonth) || etMonth < 1 || etMonth > 13) {
                showNotification('Please select a valid Ethiopian month.');
                return null;
            }
            return fetchGregorianRange(etYear, etMonth);
        }

        const range = await fetchGregorianYearRange(etYear);
        if (!range) return null;
        return {
            startDate: formatDateForApi(range.startDate),
            endDate: formatDateForApi(range.endDate)
        };
    }

    // --- YEARLY REPORT LOGIC WITH PAGINATION ---
    let yearlyReportState = {
        filterType: null,
        filterId: null,
        startDate: null,
        endDate: null,
        currentOffset: 0,
        pageSize: 20,
        isLoading: false,
        hasMore: true,
        totalRecords: 0,
        totalVat: 0,
        totalBase: 0,
        totalAmount: 0
    };

    const yearlyReportTableWrapper = document.querySelector('#yearly-report-section .table-wrapper');

    const fetchYearlyReport = async (filterType, filterId, startDate, endDate, reset = true) => {
        if (yearlyReportState.isLoading) return;
        yearlyReportState.isLoading = true;

        if (reset) {
            yearlyReportState.filterType = filterType;
            yearlyReportState.filterId = filterId;
            yearlyReportState.startDate = startDate;
            yearlyReportState.endDate = endDate;
            yearlyReportState.currentOffset = 0;
            yearlyReportState.hasMore = true;
            yearlyReportState.totalVat = 0;
            yearlyReportState.totalBase = 0;
            yearlyReportState.totalAmount = 0;
            yearlyReportTableBody.innerHTML = '';
        }

        try {
            const paramKey = filterType === 'item' ? 'item_id' : (filterType === 'category' ? 'category_id' : 'subcategory_id');
            const url = `http://localhost:3000/reports/yearly?${paramKey}=${filterId}&startDate=${startDate}&endDate=${endDate}&limit=${yearlyReportState.pageSize}&offset=${yearlyReportState.currentOffset}`;
            const response = await fetch(url);
            const result = await response.json();

            if (response.ok) {
                const data = result.data || result;
                const hasMore = result.hasMore !== undefined ? result.hasMore : (data.length === yearlyReportState.pageSize);

                if (reset && data.length === 0) {
                    yearlyReportTableBody.innerHTML = `<tr><td colspan="11" class="placeholder-cell">No data for the selected ${filterType} and year.</td></tr>`;
                    yearlySummaryVatAmount.textContent = '0.00';
                    yearlySummaryBaseTotal.textContent = '0.00';
                    yearlySummaryTotalAmount.textContent = '0.00';
                    yearlyReportState.isLoading = false;
                    return;
                }

                renderYearlyReportChunk(data, reset);

                yearlyReportState.currentOffset += data.length;
                yearlyReportState.hasMore = hasMore;
                if (result.total !== undefined) {
                    yearlyReportState.totalRecords = result.total;
                }
            } else {
                showNotification(`Error fetching Yearly report: ${result.error}`);
            }
        } catch (error) {
            showNotification('Network error fetching Yearly report. Please check server connection.');
        } finally {
            yearlyReportState.isLoading = false;
        }
    };

    const renderYearlyReportChunk = (data, reset) => {
        const loadingRow = yearlyReportTableBody.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.remove();
        }

        if (reset) {
            yearlyReportState.totalVat = 0;
            yearlyReportState.totalBase = 0;
            yearlyReportState.totalAmount = 0;
        }

        data.forEach(record => {
            const baseTotal = (record.total_amount || 0) - (record.vat_amount || 0);
            const date = new Date(record.purchase_date);
            const formattedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const row = yearlyReportTableBody.insertRow();
            row.innerHTML = `
                <td>${record.vendor_name}</td>
                <td>${record.tin_number}</td>
                <td>${record.mrc_number || ''}</td>
                <td>${formattedDate}</td>
                <td>${record.fs_number || ''}</td>  
                <td>${record.item_name}</td>
                <td class="is-numeric">${record.quantity}</td>
                <td class="is-numeric">${(record.unit_price || 0).toFixed(2)}</td>
                <td class="is-numeric">${(record.vat_amount || 0).toFixed(2)}</td>
                <td class="is-numeric">${baseTotal.toFixed(2)}</td>
                <td class="is-numeric">${(record.total_amount || 0).toFixed(2)}</td>
            `;

            yearlyReportState.totalVat += record.vat_amount || 0;
            yearlyReportState.totalBase += baseTotal;
            yearlyReportState.totalAmount += record.total_amount || 0;
        });

        yearlySummaryVatAmount.textContent = yearlyReportState.totalVat.toFixed(2);
        yearlySummaryBaseTotal.textContent = yearlyReportState.totalBase.toFixed(2);
        yearlySummaryTotalAmount.textContent = yearlyReportState.totalAmount.toFixed(2);

        if (yearlyReportState.hasMore) {
            const loadingRow = yearlyReportTableBody.insertRow();
            loadingRow.className = 'loading-row';
            loadingRow.innerHTML = '<td colspan="11" class="placeholder-cell" style="text-align: center; padding: 1rem;">Loading more records...</td>';
        }
    };

    let yearlyScrollTimeout;
    if (yearlyReportTableWrapper) {
        yearlyReportTableWrapper.addEventListener('scroll', () => {
            clearTimeout(yearlyScrollTimeout);
            yearlyScrollTimeout = setTimeout(() => {
                const wrapper = yearlyReportTableWrapper;
                const scrollTop = wrapper.scrollTop;
                const scrollHeight = wrapper.scrollHeight;
                const clientHeight = wrapper.clientHeight;

                if (scrollTop + clientHeight >= scrollHeight - 200 && 
                    yearlyReportState.hasMore && 
                    !yearlyReportState.isLoading &&
                    yearlyReportState.startDate &&
                    yearlyReportState.filterId) {
                    fetchYearlyReport(yearlyReportState.filterType, yearlyReportState.filterId, yearlyReportState.startDate, yearlyReportState.endDate, false);
                }
            }, 100);
        });
    }

    generateYearlyReportBtn?.addEventListener('click', async () => {
        const filter = getYearlyReportFilter();
        if (!filter) {
            showNotification('Please select a category, subcategory, or item.');
            return;
        }

        const etYear = getActiveFiscalReportYear();
        if (etYear === null) return;

        const range = await fetchSelectedYearlyDateRange(etYear);
        if (range) {
            fetchYearlyReport(filter.filterType, filter.filterId, range.startDate, range.endDate, true);
        }
    });

    exportYearlyReportBtn?.addEventListener('click', async () => {
        const filter = getYearlyReportFilter();
        if (!filter) {
            showNotification('Please select a category, subcategory, or item to export.');
            return;
        }

        const etYear = getActiveFiscalReportYear();
        if (etYear === null) return;

        const range = await fetchSelectedYearlyDateRange(etYear);
        if (range) {
            const paramKey = `${filter.filterType}_id`;
            const params = new URLSearchParams({
                [paramKey]: filter.filterId,
                startDate: range.startDate,
                endDate: range.endDate,
                etYear: String(etYear),
                period: currentYearlyPeriod
            });
            if (currentYearlyPeriod === 'monthly') {
                params.set('etMonth', yearlyEthiopianMonthSelect.value);
            }
            window.location.href = `http://localhost:3000/export/yearly-report?${params}`;
        }
    });

        // --- REFACTORED MANAGEMENT LOGIC ---
    
    // Tab Switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if(targetTab === 'vendor-tab') loadVendors();
            if(targetTab === 'items-tab') {
                loadCategories();
                loadItems(); // Initially load with no filters
            }
            if(targetTab === 'backup-tab') {
                // Optionally load last saved path or clear message
                backupStatusMessage.textContent = '';
            }
        });
    });

    // --- BACKUP MANAGEMENT LOGIC ---
    browseBackupPathBtn?.addEventListener('click', () => {
        ipcRenderer.send('select-directory');
    });

    ipcRenderer.on('selected-directory', (event, path) => {
        if (path) {
            backupPathInput.value = path;
        }
    });

            performBackupBtn?.addEventListener('click', async () => {
                const backupPath = backupPathInput.value.trim();
                if (!backupPath) {
                    showNotification('Please specify a backup directory path.');
                    return;
                }

                backupStatusMessage.textContent = 'Performing backup...';
                backupStatusMessage.style.color = 'orange';

                try {
                    const response = await fetch('http://localhost:3000/backup-database', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ backupPath }),
                    });
                    const result = await response.json();
                    if (response.ok) {
                        backupStatusMessage.textContent = `Backup successful: ${result.message}`;
                        backupStatusMessage.style.color = 'green';
                        showNotification(`Backup successful: ${result.message}`);
                    } else {
                        backupStatusMessage.textContent = `Backup failed: ${result.error}`;
                        backupStatusMessage.style.color = 'red';
                        showNotification(`Backup failed: ${result.error}`);
                    }
                } catch (error) {
                    backupStatusMessage.textContent = `Network error during backup: ${error.message}`;
                    backupStatusMessage.style.color = 'red';
                    showNotification(`Network error during backup: ${error.message}`);
                }
            });
            
            // --- BACKUP MANAGEMENT END ---

            // --- VENDOR MANAGEMENT ---
    openVendorModalBtn?.addEventListener('click', () => openModal(vendorModal));

    addMrcBtn.addEventListener('click', () => {
        const newMrcInput = document.createElement('div');
        newMrcInput.className = 'mrc-input-group';
        newMrcInput.innerHTML = `
          <input type="text" name="mrcNumbers[]" class="input" />
          <button type="button" class="btn btn-ghost btn-remove-mrc">&times;</button>
        `;
        mrcContainer.appendChild(newMrcInput);
    });
    
    mrcContainer.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-mrc')) {
            e.target.parentElement.remove();
        }
    });

    vendorForm.addEventListener('submit', async e => {
        e.preventDefault();
        const vendorId = document.getElementById('vendorId').value;
        const formData = {
            vendor_name: document.getElementById('vendorName').value,
            tin_number: document.getElementById('tinNumber').value,
            mrc_numbers: Array.from(document.querySelectorAll('input[name="mrcNumbers[]"]'))
                              .map(input => input.value.trim())
                              .filter(Boolean)
        };

        const isEditing = !!vendorId;
        const url = isEditing ? `http://localhost:3000/updatevendors/${vendorId}` : 'http://localhost:3000/addvendors';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showNotification(`Vendor ${isEditing ? 'updated' : 'added'} successfully!`);
                closeModal(vendorModal);
                loadVendors();
            } else {
                showNotification(`Failed to ${isEditing ? 'update' : 'add'} vendor.`);
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.');
        }
    });

    async function loadVendors() {
        vendorsTableBody.innerHTML = '<tr><td colspan="4" class="placeholder-cell">Loading...</td></tr>';
        try {
            const response = await fetch("http://localhost:3000/vendors");
            const vendors = await response.json();
            vendorsTableBody.innerHTML = "";
            if (vendors.length === 0) {
                vendorsTableBody.innerHTML = '<tr><td colspan="4" class="placeholder-cell">No vendors found. Add one!</td></tr>';
                return;
            }
            vendors.forEach(vendor => {
                const row = vendorsTableBody.insertRow();
                row.dataset.vendorId = vendor.vendor_id;
                // Store all data in dataset for editing
                Object.keys(vendor).forEach(key => {
                    row.dataset[key] = typeof vendor[key] === 'object' ? JSON.stringify(vendor[key]) : vendor[key];
                });
                row.innerHTML = `
                    <td>${vendor.vendor_name}</td>
                    <td>${vendor.tin_number}</td>
                    <td>${(vendor.mrc_numbers || []).join(', ')}</td>
                    <td class="action-cell">
                        <button data-action="edit-vendor" class="btn btn-ghost">Edit</button>
                        <button data-action="delete-vendor" class="btn btn-ghost">Delete</button>
                    </td>
                `;
            });
        } catch (err) {
            vendorsTableBody.innerHTML = `<tr><td colspan="4" class="placeholder-cell">Failed to load vendors.</td></tr>`;
        }
    }

    vendorsTableBody.addEventListener('click', async e => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const action = button.dataset.action;
        const row = button.closest('tr');
        const vendorId = row.dataset.vendorId;

        if (action === 'edit-vendor') {
             // Retrieve data from dataset to populate modal
            const vendorData = {
                vendor_id: vendorId,
                vendor_name: row.dataset.vendor_name,
                tin_number: row.dataset.tin_number,
                mrc_numbers: JSON.parse(row.dataset.mrc_numbers || '[]')
            };
            openModal(vendorModal, 'edit', vendorData);
        }

        if (action === 'delete-vendor') {
            try {
                const response = await fetch(`http://localhost:3000/deletevendors/${vendorId}`, { method: 'DELETE' });
                if (response.ok) {
                    showNotification("Vendor deleted!");
                    row.remove();
                } else {
                    showNotification("Failed to delete vendor.");
                }
            } catch (error) {
                showNotification("An error occurred while deleting.");
            }
        }
    });

    // --- ITEM & CATEGORY MANAGEMENT STATE ---
    let currentLoadedItems = [];
    let allCategoriesCache = [];
    let subcategoriesCache = {};
    let isReassignModeActive = false;
    let itemSearchTimeout = null;

    // --- ITEM & CATEGORY MANAGEMENT ---
    async function loadItems(categoryId = null, subcategoryId = null, searchQuery = '') {
        itemsTableBody.innerHTML = '<tr><td colspan="7" class="placeholder-cell">Loading items...</td></tr>';
        try {
            let url = 'http://localhost:3000/items';
            const params = [];
            if (showDisabledItemsToggle && showDisabledItemsToggle.checked) {
                params.push('include_disabled=1');
            }
            if (categoryId) params.push(`category_id=${categoryId}`);
            if (subcategoryId) params.push(`subcategory_id=${subcategoryId}`);
            if (searchQuery && searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const response = await fetch(url);
            const items = await response.json();
            currentLoadedItems = Array.isArray(items) ? items : [];
            await renderItemsTable(currentLoadedItems);
        } catch (error) {
            itemsTableBody.innerHTML = '<tr><td colspan="7" class="placeholder-cell">Error loading items.</td></tr>';
        }
    }

    async function renderItemsTable(items) {
        itemsTableBody.innerHTML = '';

        if (!items || items.length === 0) {
            itemsTableBody.innerHTML = '<tr><td colspan="7" class="placeholder-cell">No items found for the selected filter or search.</td></tr>';
            return;
        }

        if (isReassignModeActive) {
            if (allCategoriesCache.length === 0) {
                try {
                    const res = await fetch('http://localhost:3000/categories');
                    allCategoriesCache = await res.json();
                } catch (e) {}
            }
            const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))];
            for (const catId of catIds) {
                if (!subcategoriesCache[catId]) {
                    try {
                        const res = await fetch(`http://localhost:3000/subcategories/${catId}`);
                        subcategoriesCache[catId] = await res.json();
                    } catch (err) {
                        subcategoriesCache[catId] = [];
                    }
                }
            }
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.itemId = item.item_id;

            let catDisplay = '';
            let subcatDisplay = '';

            if (isReassignModeActive) {
                let catOptions = '';
                allCategoriesCache.forEach(cat => {
                    const sel = cat.category_id === item.category_id ? 'selected' : '';
                    catOptions += `<option value="${cat.category_id}" ${sel}>${cat.category_name}</option>`;
                });
                catDisplay = `<select class="reassign-cat-select" data-item-id="${item.item_id}">${catOptions}</select>`;

                const availableSubs = subcategoriesCache[item.category_id] || [];
                let subOptions = '<option value="">(None)</option>';
                availableSubs.forEach(sub => {
                    const sel = sub.subcategory_id === item.subcategory_id ? 'selected' : '';
                    subOptions += `<option value="${sub.subcategory_id}" ${sel}>${sub.subcategory_name}</option>`;
                });
                subcatDisplay = `<select class="reassign-subcat-select" data-item-id="${item.item_id}">${subOptions}</select>`;
            } else {
                catDisplay = item.category_name || '';
                subcatDisplay = item.subcategory_name 
                    ? `<span>${item.subcategory_name}</span>`
                    : `<span style="color: var(--text-muted); font-style: italic;">—</span>`;
            }

            const isActive = item.is_active !== 0;
            const statusBadge = isActive
                ? `<span class="badge-status badge-active">Active</span>`
                : `<span class="badge-status badge-disabled">Disabled</span>`;

            const actionBtn = isActive
                ? `<button class="btn btn-ghost btn-danger-hover" data-action="delete-item" data-id="${item.item_id}" title="Disable Item"><i class="fas fa-ban"></i> Disable</button>`
                : `<button class="btn btn-ghost" data-action="toggle-status-item" data-id="${item.item_id}" data-target-status="1" title="Enable Item"><i class="fas fa-check-circle" style="color: #10b981;"></i> Enable</button>`;

            tr.innerHTML = `
                <td><strong>${item.item_name}</strong></td>
                <td>${catDisplay}</td>
                <td>${subcatDisplay}</td>
                <td class="is-numeric">${(item.unit_price || 0).toFixed(2)}</td>
                <td>${item.description || ''}</td>
                <td>${statusBadge}</td>
                <td class="action-cell">${actionBtn}</td>
            `;
            itemsTableBody.appendChild(tr);
        });
    }

    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/categories');
            const categories = await response.json();
            allCategoriesCache = Array.isArray(categories) ? categories : [];
            
            const currentVal = itemCategorySelect.value;
            itemCategorySelect.innerHTML = '<option value="">Select Category to Filter (Right-click for options)</option>';

            allCategoriesCache.forEach(category => {
                itemCategorySelect.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
            });
            if (Array.from(itemCategorySelect.options).some(opt => opt.value === currentVal)) {
                itemCategorySelect.value = currentVal;
            }
            
        } catch (error) {
            showNotification('Error loading categories.');
        }
    }
    
    async function loadSubcategories(categoryId = null) {
        const currentVal = itemSubcategorySelect.value;
        itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory (Right-click to Edit)</option>';
        if (!categoryId) return;
        
        try {
            const response = await fetch(`http://localhost:3000/subcategories/${categoryId}`);
            const subcategories = await response.json();
            subcategoriesCache[categoryId] = subcategories; // Cache subcategories
            subcategories.forEach(sub => {
                itemSubcategorySelect.innerHTML += `<option value="${sub.subcategory_id}">${sub.subcategory_name}</option>`;
            });
            // Preserve selection if it still exists
            if (Array.from(itemSubcategorySelect.options).some(opt => opt.value === currentVal)) {
                itemSubcategorySelect.value = currentVal;
            }
        } catch (error) {
            showNotification('Error loading subcategories.');
        }
    }

    // --- MODAL OPENER LOGIC ---
    function openCategoryModal(mode = 'add', data = {}) {
        addCategoryModal.setAttribute('data-mode', mode);
        newCategoryNameInputModal.value = ''; // Reset
        
        if (mode === 'edit') {
            categoryModalTitle.textContent = 'Edit Category';
            addCategoryBtnModal.textContent = 'Save Changes';
            newCategoryNameInputModal.value = data.name;
            categoryEditIdInput.value = data.id; // Use the hidden input
        } else {
            categoryModalTitle.textContent = 'Add Category';
            addCategoryBtnModal.textContent = 'Add Category';
            categoryEditIdInput.value = '';
        }
        addCategoryModal.style.display = 'flex';
    }
    
    function openSubcategoryModal(mode = 'add', data = {}) {
        addSubcategoryModal.setAttribute('data-mode', mode);
        newSubcategoryNameInputModal.value = ''; // Reset
        
        // Always populate the parent category dropdown from the main page's list
        subcategoryCategorySelectModal.innerHTML = itemCategorySelect.innerHTML.replace('Select Category to Filter (Right-click to Edit)', 'Select Parent Category');
        
        if (mode === 'edit') {
            subcategoryModalTitle.textContent = 'Edit Subcategory';
            addSubcategoryBtnModal.textContent = 'Save Changes';
            newSubcategoryNameInputModal.value = data.name;
            subcategoryCategorySelectModal.value = data.parentId;
            subcategoryEditIdInput.value = data.id; // Use the hidden input
        } else {
            subcategoryModalTitle.textContent = 'Add Subcategory';
            addSubcategoryBtnModal.textContent = 'Add Subcategory';
            // Pre-select the currently active category if available
            subcategoryCategorySelectModal.value = itemCategorySelect.value || '';
            subcategoryEditIdInput.value = '';
        }
        addSubcategoryModal.style.display = 'flex';
    }

    // --- FLOATING CUSTOM CONTEXT MENU FOR CATEGORIES & SUBCATEGORIES ---
    let currentContextTarget = null; // 'category' or 'subcategory'

    function showContextMenu(x, y, targetType) {
        currentContextTarget = targetType;
        if (targetType === 'category') {
            contextMenuTitle.textContent = 'Category Options';
            ctxAddText.textContent = 'Add New Category';
            ctxEditText.textContent = 'Edit Selected Category';
            ctxDeleteText.textContent = 'Delete Selected Category';
        } else {
            contextMenuTitle.textContent = 'Subcategory Options';
            ctxAddText.textContent = 'Add New Subcategory';
            ctxEditText.textContent = 'Edit Selected Subcategory';
            ctxDeleteText.textContent = 'Delete Selected Subcategory';
        }

        const menuWidth = 220;
        const menuHeight = 160;
        const posX = (x + menuWidth > window.innerWidth) ? window.innerWidth - menuWidth - 10 : x;
        const posY = (y + menuHeight > window.innerHeight) ? window.innerHeight - menuHeight - 10 : y;

        customContextMenu.style.left = `${posX}px`;
        customContextMenu.style.top = `${posY}px`;
        customContextMenu.style.display = 'block';
    }

    function hideContextMenu() {
        if (customContextMenu) customContextMenu.style.display = 'none';
    }

    document.addEventListener('click', (e) => {
        if (customContextMenu && !customContextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    itemCategorySelect?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (activeFiscalYearLocked) return;
        showContextMenu(e.clientX, e.clientY, 'category');
    });

    itemSubcategorySelect?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (activeFiscalYearLocked) return;
        showContextMenu(e.clientX, e.clientY, 'subcategory');
    });

    ctxAddOption?.addEventListener('click', () => {
        hideContextMenu();
        if (currentContextTarget === 'category') {
            openCategoryModal('add');
        } else {
            openSubcategoryModal('add');
        }
    });

    ctxEditOption?.addEventListener('click', () => {
        hideContextMenu();
        if (currentContextTarget === 'category') {
            const selectedOption = itemCategorySelect.options[itemCategorySelect.selectedIndex];
            if (!selectedOption || !selectedOption.value) {
                showNotification('Please select a category first to edit it.');
                return;
            }
            openCategoryModal('edit', { id: selectedOption.value, name: selectedOption.text });
        } else {
            const parentId = itemCategorySelect.value;
            const selectedOption = itemSubcategorySelect.options[itemSubcategorySelect.selectedIndex];
            if (!selectedOption || !selectedOption.value) {
                showNotification('Please select a subcategory first to edit it.');
                return;
            }
            openSubcategoryModal('edit', { id: selectedOption.value, name: selectedOption.text, parentId: parentId });
        }
    });

    ctxDeleteOption?.addEventListener('click', () => {
        hideContextMenu();
        if (currentContextTarget === 'category') {
            deleteCategoryBtn?.click();
        } else {
            deleteSubcategoryBtn?.click();
        }
    });

    // --- REASSIGN SUBCATEGORY MODE PASSWORD LOGIC ---
    function openReassignPasswordModal() {
        if (reassignPasswordInput) reassignPasswordInput.value = '';
        if (reassignPasswordError) {
            reassignPasswordError.style.display = 'none';
            reassignPasswordError.textContent = '';
        }
        if (reassignPasswordModal) reassignPasswordModal.style.display = 'flex';
        setTimeout(() => reassignPasswordInput?.focus(), 100);
    }

    function closeReassignPasswordModal() {
        if (reassignPasswordModal) reassignPasswordModal.style.display = 'none';
    }

    toggleReassignMode?.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Uncheck temporarily until password is verified
            e.target.checked = false;
            openReassignPasswordModal();
        } else {
            isReassignModeActive = false;
            renderItemsTable(currentLoadedItems);
            showNotification('Reassign Subcategory Mode disabled.');
        }
    });

    confirmReassignPasswordBtn?.addEventListener('click', verifyReassignPassword);
    reassignPasswordInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyReassignPassword();
        }
    });

    async function verifyReassignPassword() {
        const password = reassignPasswordInput.value.trim();
        try {
            const response = await fetch('http://localhost:3000/verify-amendments-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!response.ok) throw new Error('Incorrect password. Access denied.');
            isReassignModeActive = true;
            if (toggleReassignMode) toggleReassignMode.checked = true;
            closeReassignPasswordModal();
            showNotification('Reassign Subcategory Mode unlocked successfully!');
            renderItemsTable(currentLoadedItems);
        } catch (error) {
            if (reassignPasswordError) {
                reassignPasswordError.textContent = error.message === 'Failed to fetch'
                    ? 'Could not verify the password. Check the server connection.'
                    : error.message;
                reassignPasswordError.style.display = 'block';
            }
            reassignPasswordInput.select();
        }
    }

    cancelReassignPasswordBtn?.addEventListener('click', closeReassignPasswordModal);
    closeReassignPassModalBtn?.addEventListener('click', closeReassignPasswordModal);

    // --- ITEM SEARCH LOGIC ---
    itemSearchInput?.addEventListener('input', (e) => {
        const query = e.target.value;
        if (clearSearchBtn) clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';
        
        clearTimeout(itemSearchTimeout);
        itemSearchTimeout = setTimeout(() => {
            loadItems(itemCategorySelect.value, itemSubcategorySelect.value, query);
        }, 250);
    });

    clearSearchBtn?.addEventListener('click', () => {
        itemSearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        loadItems(itemCategorySelect.value, itemSubcategorySelect.value, '');
    });

    // --- SHOW DISABLED ITEMS TOGGLE ---
    showDisabledItemsToggle?.addEventListener('change', () => {
        loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
    });

    // --- INLINE RE-ASSIGN CATEGORY & SUBCATEGORY CHANGE LISTENER ---
    itemsTableBody.addEventListener('change', async (e) => {
        // Handle Category Change
        if (e.target.classList.contains('reassign-cat-select')) {
            const selectEl = e.target;
            const itemId = selectEl.dataset.itemId;
            const newCategoryId = selectEl.value;
            const item = currentLoadedItems.find(i => i.item_id === itemId);

            selectEl.disabled = true;
            try {
                const response = await fetch(`http://localhost:3000/items/${itemId}/reassign`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_id: newCategoryId, subcategory_id: null })
                });

                if (response.ok) {
                    const newCat = allCategoriesCache.find(c => c.category_id === newCategoryId);
                    if (item) {
                        item.category_id = newCategoryId;
                        item.category_name = newCat ? newCat.category_name : '';
                        item.subcategory_id = null;
                        item.subcategory_name = '';
                    }

                    if (!subcategoriesCache[newCategoryId]) {
                        try {
                            const res = await fetch(`http://localhost:3000/subcategories/${newCategoryId}`);
                            subcategoriesCache[newCategoryId] = await res.json();
                        } catch (err) {
                            subcategoriesCache[newCategoryId] = [];
                        }
                    }

                    const row = selectEl.closest('tr');
                    const subSelect = row ? row.querySelector('.reassign-subcat-select') : null;
                    if (subSelect) {
                        const availableSubs = subcategoriesCache[newCategoryId] || [];
                        let subOptions = '<option value="">(None)</option>';
                        availableSubs.forEach(sub => {
                            subOptions += `<option value="${sub.subcategory_id}">${sub.subcategory_name}</option>`;
                        });
                        subSelect.innerHTML = subOptions;
                        subSelect.value = '';
                    }

                    showNotification(`Category changed for "${item ? item.item_name : 'item'}". Subcategory reset.`);
                } else {
                    const err = await response.json();
                    showNotification(`Failed to reassign category: ${err.error || 'Server error'}`);
                }
            } catch (error) {
                showNotification('Network error while re-assigning category.');
            } finally {
                selectEl.disabled = false;
            }
        }

        // Handle Subcategory Change
        if (e.target.classList.contains('reassign-subcat-select')) {
            const selectEl = e.target;
            const itemId = selectEl.dataset.itemId;
            const newSubcategoryId = selectEl.value || null;
            const item = currentLoadedItems.find(i => i.item_id === itemId);

            selectEl.disabled = true;
            try {
                const response = await fetch(`http://localhost:3000/items/${itemId}/reassign`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_id: item ? item.category_id : undefined, subcategory_id: newSubcategoryId })
                });

                if (response.ok) {
                    showNotification('Item subcategory updated successfully!');
                    if (item) {
                        item.subcategory_id = newSubcategoryId;
                        const catSubs = subcategoriesCache[item.category_id] || [];
                        const match = catSubs.find(s => s.subcategory_id === newSubcategoryId);
                        item.subcategory_name = match ? match.subcategory_name : '';
                    }
                } else {
                    const err = await response.json();
                    showNotification(`Failed to update subcategory: ${err.error || 'Server error'}`);
                }
            } catch (error) {
                showNotification('Network error while re-assigning subcategory.');
            } finally {
                selectEl.disabled = false;
            }
        }
    });

    // --- FILTER LISTENERS ---
    itemCategorySelect.addEventListener('change', (e) => {
        const categoryId = e.target.value;
        loadSubcategories(categoryId);
        itemSubcategorySelect.value = ''; // Reset subcategory on category change
        loadItems(categoryId, null, itemSearchInput ? itemSearchInput.value : '');
    });

    itemSubcategorySelect.addEventListener('change', (e) => {
        const subcategoryId = e.target.value;
        const searchQuery = itemSearchInput ? itemSearchInput.value : '';
        if (subcategoryId) {
            loadItems(itemCategorySelect.value, subcategoryId, searchQuery);
        } else {
            loadItems(itemCategorySelect.value, null, searchQuery);
        }
    });

    // Modal Opening Listeners
    openAddCategoryModalBtn?.addEventListener('click', () => openCategoryModal('add'));
    openAddSubcategoryModalBtn?.addEventListener('click', () => openSubcategoryModal('add'));

    deleteCategoryBtn?.addEventListener('click', async () => {
        const categoryId = itemCategorySelect.value;
        if (!categoryId) {
            showNotification('Please select a category to delete.');
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/categories/${categoryId}`, { method: 'DELETE' });
            if (response.ok) {
                showNotification('Category deleted successfully!');
                delete subcategoriesCache[categoryId];
                await loadCategories(); // Reload the dropdown
                itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory (Right-click for options)</option>';
                loadItems(null, null, itemSearchInput ? itemSearchInput.value : '');
            } else {
                const errorData = await response.json();
                showNotification(`Failed to delete category: ${errorData.error}`);
            }
        } catch (error) {
            showNotification('Network error while deleting category.');
        }
    });

    deleteSubcategoryBtn?.addEventListener('click', async () => {
        const subcategoryId = itemSubcategorySelect.value;
        if (!subcategoryId) {
            showNotification('Please select a subcategory to delete.');
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/subcategories/${subcategoryId}`, { method: 'DELETE' });
            if (response.ok) {
                showNotification('Subcategory deleted successfully!');
                const catId = itemCategorySelect.value;
                delete subcategoriesCache[catId];
                await loadSubcategories(catId); // Reload subcategories
                loadItems(catId, null, itemSearchInput ? itemSearchInput.value : ''); // Refresh items table
            } else {
                const errorData = await response.json();
                showNotification(`Failed to delete subcategory: ${errorData.error || 'Conflict'}`);
            }
        } catch (error) {
            showNotification('Network error while deleting subcategory.');
        }
    });

    // --- MODAL SUBMISSION LOGIC ---
    addCategoryBtnModal.addEventListener('click', async () => {
        const mode = addCategoryModal.getAttribute('data-mode');
        const category_name = newCategoryNameInputModal.value.trim();
        const category_id = categoryEditIdInput.value;

        if (!category_name) {
            showNotification('Category name cannot be empty.');
            return;
        }

        const isEditing = mode === 'edit';
        const url = isEditing ? `http://localhost:3000/categories/${category_id}` : 'http://localhost:3000/categories';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_name })
            });
            if (response.ok) {
                showNotification(`Category ${isEditing ? 'updated' : 'added'} successfully!`);
                closeModal(addCategoryModal);
                await loadCategories();
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
            } else {
                showNotification(`Failed to ${isEditing ? 'update' : 'add'} category.`);
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.');
        }
    });

    addSubcategoryBtnModal.addEventListener('click', async () => {
        const mode = addSubcategoryModal.getAttribute('data-mode');
        const category_id = subcategoryCategorySelectModal.value;
        const subcategory_name = newSubcategoryNameInputModal.value.trim();
        const subcategory_id = subcategoryEditIdInput.value;

        if (!category_id || !subcategory_name) {
            showNotification('Parent category and subcategory name are required.');
            return;
        }

        const isEditing = mode === 'edit';
        const url = isEditing ? `http://localhost:3000/subcategories/${subcategory_id}` : 'http://localhost:3000/subcategories';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id, subcategory_name })
            });
            if (response.ok) {
                showNotification(`Subcategory ${isEditing ? 'updated' : 'added'} successfully!`);
                closeModal(addSubcategoryModal);
                subcategoriesCache = {};
                if (itemCategorySelect.value) {
                    await loadSubcategories(itemCategorySelect.value);
                }
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
            } else {
                showNotification(`Failed to ${isEditing ? 'update' : 'add'} subcategory.`);
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.');
        }
    });
    
    // --- ITEM MANAGEMENT LOGIC ---
    addItemBtn.addEventListener('click', async () => {
        const item_name = newItemNameInput.value.trim();
        const category_id = itemCategorySelect.value;
        const subcategory_id = itemSubcategorySelect.value || null;
        const unit_price = parseFloat(newItemUnitPriceInput.value);
        const description = newItemDescriptionInput.value.trim();

        if (!item_name || !category_id || isNaN(unit_price)) {
            showNotification('Item name, category, and a valid unit price are required.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name, category_id, subcategory_id, unit_price, description })
            });
            if (response.ok) {
                showNotification('Item added successfully!');
                newItemNameInput.value = '';
                newItemUnitPriceInput.value = '';
                newItemDescriptionInput.value = '';
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
            } else {
                 showNotification(`Failed to add item.`);
            }
        } catch (error) {
            showNotification('Network error while adding item.');
        }
    });

    itemsTableBody.addEventListener('click', async (e) => {
        const disableBtn = e.target.closest('button[data-action="delete-item"]');
        if (disableBtn) {
            const itemId = disableBtn.dataset.id;
            try {
                const response = await fetch(`http://localhost:3000/items/${itemId}`, { method: 'DELETE' });
                const resData = await response.json();
                if (response.ok) {
                    showNotification(resData.message || 'Item disabled successfully!');
                    loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
                } else {
                    showNotification(`Failed to disable item: ${resData.error || 'Server error'}`);
                }
            } catch (error) {
                showNotification('Network error while disabling item.');
            }
            return;
        }

        const enableBtn = e.target.closest('button[data-action="toggle-status-item"]');
        if (enableBtn) {
            const itemId = enableBtn.dataset.id;
            try {
                const response = await fetch(`http://localhost:3000/items/${itemId}/toggle-status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: 1 })
                });
                const resData = await response.json();
                if (response.ok) {
                    showNotification(resData.message || 'Item enabled successfully!');
                    loadItems(itemCategorySelect.value, itemSubcategorySelect.value, itemSearchInput ? itemSearchInput.value : '');
                } else {
                    showNotification(`Failed to enable item: ${resData.error || 'Server error'}`);
                }
            } catch (error) {
                showNotification('Network error while enabling item.');
            }
            return;
        }
    });

});
