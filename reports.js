// This file has been refactored to work with the new report.html design.
// Key changes include:
// - All Ethiopian calendar logic has been removed from the client-side.
// - All date conversions are now handled by making async calls to the server.
// - Functions that rely on date conversions (switchView, report generation) are now async.
const { ipcRenderer, shell } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // --- GENERAL & NAVIGATION ELEMENTS ---
    const navButtons = document.querySelectorAll('.nav .btn[data-section]');
    const allSections = document.querySelectorAll('.page-section');
    const defaultMessageSection = document.getElementById('reports-page-default-message');
    document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; });
    document.getElementById('go-to-workspace-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'workspace.html'; });
    const generateSummaryPdfBtn = document.getElementById('generate-summary-pdf-btn'); // Ensure this is defined
    const generateJvPdfBtn = document.getElementById('generate-jv-pdf-btn'); // <-- ADD THIS
    
    // --- DROPDOWN ELEMENTS ---
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const dropdownToggle = document.getElementById('reports-dropdown-btn');
    const dropdown = document.querySelector('.dropdown');
    const managementButton = document.getElementById('management-button');

    // --- VAT REPORT ELEMENTS ---
    const vatReportSection = document.getElementById('vat-report-section');
    const ethiopianMonthSelect = document.getElementById('ethiopian-month-select');
    const ethiopianYearInput = document.getElementById('ethiopian-year-input');
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
    const summaryEthiopianMonthSelect = document.getElementById('summary-ethiopian-month-select');
    const summaryEthiopianYearInput = document.getElementById('summary-ethiopian-year-input');
    const generateSummaryReportBtn = document.getElementById('generate-summary-report-btn');
    const summaryReportTableHead = document.querySelector('#summary-report-table thead tr');
    const summaryReportTableBody = document.querySelector('#summary-report-table tbody');

    // --- YEARLY REPORT ELEMENTS ---
    const yearlyReportSection = document.getElementById('yearly-report-section');
    const yearlySubcategorySelect = document.getElementById('yearly-subcategory-select');
    const yearlyEthiopianYearInput = document.getElementById('yearly-ethiopian-year-input');
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
    const editCategoryBtn = document.getElementById('editCategoryBtn');
    const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
    const editSubcategoryBtn = document.getElementById('editSubcategoryBtn');
    const deleteSubcategoryBtn = document.getElementById('deleteSubcategoryBtn');


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
    
    // --- SUMMARY REPORT STATE ---
    let allUniqueItems = [];
    let currentReportData = [];

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
            const todayStr = new Date().toISOString().split('T')[0];
            const etDate = await fetchEthiopianDate(todayStr);

            if (etDate) {
                const yearInput = targetSectionId === 'vat-report-section' ? ethiopianYearInput : summaryEthiopianYearInput;
                const monthSelect = targetSectionId === 'vat-report-section' ? ethiopianMonthSelect : summaryEthiopianMonthSelect;
                
                yearInput.value = etDate.year;
                monthSelect.value = etDate.month;
                
                const range = await fetchGregorianRange(etDate.year, etDate.month);
                if (range) {
                    if (targetSectionId === 'vat-report-section') {
                        fetchVatReport(range.startDate, range.endDate);
                    } else {
                        fetchSummaryReport(range.startDate, range.endDate);
                    }
                }
            }
        } else if (targetSectionId === 'yearly-report-section') {
            // Load subcategories and set default year to current Ethiopian year
            loadYearlySubcategories();
            const todayStr = new Date().toISOString().split('T')[0];
            fetchEthiopianDate(todayStr).then(etDate => {
                if (etDate) {
                    yearlyEthiopianYearInput.value = etDate.year;
                }
            });
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
        const etYear = parseInt(ethiopianYearInput.value, 10);
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }
        
        const range = await fetchGregorianRange(etYear, etMonth);
        if (range) {
            fetchVatReport(range.startDate, range.endDate);
        }
    });
    generateSummaryPdfBtn?.addEventListener('click', async () => {
        const etYear = parseInt(summaryEthiopianYearInput.value, 10);
        const etMonth = parseInt(summaryEthiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }
        
        const range = await fetchGregorianRange(etYear, etMonth);
        if (!range) {
            showNotification('Could not determine date range to generate PDF.');
            return;
        }

        const url = `http://localhost:3000/export/summary-pdf?startDate=${range.startDate}&endDate=${range.endDate}&etYear=${etYear}&etMonth=${etMonth}`;
        const filename = `Summary_Report_${etYear}-${etMonth}.pdf`;
        
        ipcRenderer.send('print-to-pdf', { url, filename });
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
        const etYear = parseInt(ethiopianYearInput.value, 10);
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please select a valid month and year to export.');
            return;
        }

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
        const etYear = parseInt(summaryEthiopianYearInput.value, 10);
        const etMonth = parseInt(summaryEthiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }
        
        const range = await fetchGregorianRange(etYear, etMonth);
        if (range) {
            fetchSummaryReport(range.startDate, range.endDate);
        }
    });

    // --- YEARLY REPORT LOGIC ---
    async function loadYearlySubcategories() {
        if (!yearlySubcategorySelect) {
            console.error('Yearly subcategory select element not found');
            return;
        }

        try {
            console.log('Fetching subcategories from /subcategories/list...');
            console.log('Element exists:', !!yearlySubcategorySelect);
            const response = await fetch('http://localhost:3000/subcategories/list', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to load subcategories:', response.status, errorText);
                showNotification(`Failed to load subcategories from server: ${response.status}`);
                return;
            }
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            const subcategories = JSON.parse(responseText);
            console.log('Parsed subcategories data:', subcategories);
            console.log('Is array?', Array.isArray(subcategories));
            console.log('Length:', subcategories ? subcategories.length : 'null/undefined');
            
            if (!Array.isArray(subcategories)) {
                console.error('Invalid subcategories data (not an array):', subcategories);
                showNotification('Invalid subcategories data received.');
                return;
            }
            
            const currentVal = yearlySubcategorySelect.value;
            yearlySubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
            
            if (subcategories.length === 0) {
                console.warn('No subcategories found in database');
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No subcategories available - Please add subcategories in Management section';
                option.disabled = true;
                yearlySubcategorySelect.appendChild(option);
            } else {
                let addedCount = 0;
                subcategories.forEach(subcategory => {
                    if (subcategory && subcategory.subcategory_id && subcategory.subcategory_name) {
                        const option = document.createElement('option');
                        option.value = subcategory.subcategory_id;
                        option.textContent = subcategory.subcategory_name;
                        yearlySubcategorySelect.appendChild(option);
                        addedCount++;
                    } else {
                        console.warn('Invalid subcategory entry:', subcategory);
                    }
                });
                console.log(`Added ${addedCount} subcategories to dropdown out of ${subcategories.length} total`);
            }
            
            // Preserve selection if it still exists
            if (currentVal && Array.from(yearlySubcategorySelect.options).some(opt => opt.value === currentVal)) {
                yearlySubcategorySelect.value = currentVal;
            }

            console.log(`Loaded ${subcategories.length} subcategories into yearly report dropdown`);
        } catch (error) {
            console.error('Error loading subcategories:', error);
            showNotification('Network error loading subcategories. Please check server connection.');
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

    // --- YEARLY REPORT LOGIC WITH PAGINATION ---
    let yearlyReportState = {
        subcategoryId: null,
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

    const yearlyReportTableWrapper = document.querySelector('#yearly-report-section .table-wrapper');

    const fetchYearlyReport = async (subcategoryId, startDate, endDate, reset = true) => {
        if (yearlyReportState.isLoading) return;
        
        yearlyReportState.isLoading = true;
        
        if (reset) {
            // Reset state for new report
            yearlyReportState.subcategoryId = subcategoryId;
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
            const url = `http://localhost:3000/reports/yearly?subcategory_id=${subcategoryId}&startDate=${startDate}&endDate=${endDate}&limit=${yearlyReportState.pageSize}&offset=${yearlyReportState.currentOffset}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (response.ok) {
                // Handle paginated response
                const data = result.data || result; // Support both paginated and non-paginated responses
                const hasMore = result.hasMore !== undefined ? result.hasMore : (data.length === yearlyReportState.pageSize);
                
                if (reset && data.length === 0) {
                    yearlyReportTableBody.innerHTML = '<tr><td colspan="11" class="placeholder-cell">No data for the selected subcategory and year.</td></tr>';
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
        // Remove loading indicator if present
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

        // Update summary totals
        yearlySummaryVatAmount.textContent = yearlyReportState.totalVat.toFixed(2);
        yearlySummaryBaseTotal.textContent = yearlyReportState.totalBase.toFixed(2);
        yearlySummaryTotalAmount.textContent = yearlyReportState.totalAmount.toFixed(2);

        // Add loading indicator if there's more data to load
        if (yearlyReportState.hasMore) {
            const loadingRow = yearlyReportTableBody.insertRow();
            loadingRow.className = 'loading-row';
            loadingRow.innerHTML = '<td colspan="11" class="placeholder-cell" style="text-align: center; padding: 1rem;">Loading more records...</td>';
        }
    };

    // Infinite scroll handler for yearly report
    let yearlyScrollTimeout;
    if (yearlyReportTableWrapper) {
        yearlyReportTableWrapper.addEventListener('scroll', () => {
            // Throttle scroll events
            clearTimeout(yearlyScrollTimeout);
            yearlyScrollTimeout = setTimeout(() => {
                const wrapper = yearlyReportTableWrapper;
                const scrollTop = wrapper.scrollTop;
                const scrollHeight = wrapper.scrollHeight;
                const clientHeight = wrapper.clientHeight;
                
                // Load more when user scrolls to within 200px of bottom
                if (scrollTop + clientHeight >= scrollHeight - 200 && 
                    yearlyReportState.hasMore && 
                    !yearlyReportState.isLoading &&
                    yearlyReportState.startDate) {
                    fetchYearlyReport(yearlyReportState.subcategoryId, yearlyReportState.startDate, yearlyReportState.endDate, false);
                }
            }, 100); // Throttle to every 100ms
        });
    }

    generateYearlyReportBtn?.addEventListener('click', async () => {
        const subcategoryId = yearlySubcategorySelect.value;
        const etYear = parseInt(yearlyEthiopianYearInput.value, 10);

        if (!subcategoryId) {
            showNotification('Please select a subcategory.');
            return;
        }

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }

        const range = await fetchGregorianYearRange(etYear);
        if (range) {
            const startDate = `${range.startDate.year}-${String(range.startDate.month).padStart(2, '0')}-${String(range.startDate.day).padStart(2, '0')}`;
            const endDate = `${range.endDate.year}-${String(range.endDate.month).padStart(2, '0')}-${String(range.endDate.day).padStart(2, '0')}`;
            console.log(startDate,endDate)
            fetchYearlyReport(subcategoryId, startDate, endDate, true);
        }
    });
    // Function to format a single date part as YYYY-DD-MM
function formatToYYYYDDMM(datePart) {
    // Helper to ensure month/day is padded with a leading zero if needed
    const pad = (num) => String(num).padStart(2, '0');
    
    if (!datePart) return ''; 
    
    const { day, month, year } = datePart;
    
    const formattedMonth = pad(month);
    const formattedDay = pad(day);
    
    // Format the date as YYYY-DD-MM (Year, then Day, then Month)
    return `${year}-${formattedDay}-${formattedMonth}`;
}

// --- Your Event Listener with Integrated Formatting ---

exportYearlyReportBtn?.addEventListener('click', async () => {
    const subcategoryId = yearlySubcategorySelect.value;
    const etYear = parseInt(yearlyEthiopianYearInput.value, 10);

    if (!subcategoryId) {
        showNotification('Please select a subcategory to export.');
        return;
    }

    if (!etYear || isNaN(etYear)) {
        showNotification('Please enter a valid Ethiopian year to export.');
        return;
    }

    // 1. Fetch the range object
    const range = await fetchGregorianYearRange(etYear);
    
    if (range) {
        console.log("Original Range Object:", range);
        
        // 2. Format the startDate and endDate properties to YYYY-DD-MM
        const formattedStartDate = formatToYYYYDDMM(range.startDate);
        const formattedEndDate = formatToYYYYDDMM(range.endDate);
        
        console.log("Formatted Start Date (YYYY-DD-MM):", formattedStartDate);
        console.log("Formatted End Date (YYYY-DD-MM):", formattedEndDate);
        
        // 3. Use the formatted dates in the URL
        // Example with original dates (7/7/2025 and 6/7/2026):
        // ...&startDate=2025-07-07&endDate=2026-06-07... (Note: day and month are now swapped)
        window.location.href = `http://localhost:3000/export/yearly-report?subcategory_id=${subcategoryId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&etYear=${etYear}`;
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
            if (confirm("Are you sure you want to delete this vendor?")) {
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
        }
    });

    // --- ITEM & CATEGORY MANAGEMENT ---
    async function loadItems(categoryId = null, subcategoryId = null) {
        itemsTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">Loading items...</td></tr>';
        try {
            let url = 'http://localhost:3000/items';
            const params = [];
            if (categoryId) params.push(`category_id=${categoryId}`);
            if (subcategoryId) params.push(`subcategory_id=${subcategoryId}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const response = await fetch(url);
            const items = await response.json();
            itemsTableBody.innerHTML = '';

            if(items.length === 0) {
                 itemsTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">No items found for the selected filter.</td></tr>';
                 return;
            }

            items.forEach(item => {
                itemsTableBody.innerHTML += `
                    <tr data-item-id="${item.item_id}">
                        <td>${item.item_name}</td>
                        <td>${item.category_name}</td>
                        <td>${item.subcategory_name || ''}</td>
                        <td class="is-numeric">${(item.unit_price || 0).toFixed(2)}</td>
                        <td>${item.description || ''}</td>
                        <td class="action-cell">
                           <button class="btn btn-ghost" data-action="delete-item" data-id="${item.item_id}">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } catch (error) {
            itemsTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">Error loading items.</td></tr>';
        }
    }

    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/categories');
            const categories = await response.json();
            
            const currentVal = itemCategorySelect.value;
            itemCategorySelect.innerHTML = '<option value="">Select Category to Filter</option>';

            categories.forEach(category => {
                itemCategorySelect.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
            });
            // Preserve selection if it still exists
            if (Array.from(itemCategorySelect.options).some(opt => opt.value === currentVal)) {
                itemCategorySelect.value = currentVal;
            }
            
        } catch (error) {
            showNotification('Error loading categories.');
        }
    }
    
    async function loadSubcategories(categoryId = null) {
        const currentVal = itemSubcategorySelect.value;
        itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        if (!categoryId) return;
        
        try {
            const response = await fetch(`http://localhost:3000/subcategories/${categoryId}`);
            const subcategories = await response.json();
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

    // --- NEW MODAL OPENER LOGIC ---
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
        subcategoryCategorySelectModal.innerHTML = itemCategorySelect.innerHTML.replace('Select Category to Filter', 'Select Parent Category');
        
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

    // --- EVENT LISTENERS FOR CATEGORY/SUBCATEGORY MANAGEMENT ---
    
    // Filtering Listeners
    itemCategorySelect.addEventListener('change', (e) => {
        const categoryId = e.target.value;
        loadSubcategories(categoryId);
        itemSubcategorySelect.value = ''; // Reset subcategory on category change
        loadItems(categoryId, null);
    });

    itemSubcategorySelect.addEventListener('change', (e) => {
        const subcategoryId = e.target.value;
        if (subcategoryId) {
            loadItems(itemCategorySelect.value, subcategoryId);
        } else {
            loadItems(itemCategorySelect.value, null);
        }
    });

    // Modal Opening Listeners
    openAddCategoryModalBtn.addEventListener('click', () => openCategoryModal('add'));
    openAddSubcategoryModalBtn.addEventListener('click', () => openSubcategoryModal('add'));

    // Edit/Delete Button Listeners
    editCategoryBtn.addEventListener('click', () => {
        const selectedOption = itemCategorySelect.options[itemCategorySelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) {
            showNotification('Please select a category to edit.');
            return;
        }
        openCategoryModal('edit', { id: selectedOption.value, name: selectedOption.text });
    });

    deleteCategoryBtn.addEventListener('click', async () => {
        const categoryId = itemCategorySelect.value;
        if (!categoryId) {
            showNotification('Please select a category to delete.');
            return;
        }
        if (confirm('Are you sure you want to delete this category? This cannot be undone.')) {
            try {
                const response = await fetch(`http://localhost:3000/categories/${categoryId}`, { method: 'DELETE' });
                if (response.ok) {
                    showNotification('Category deleted successfully!');
                    await loadCategories(); // Reload the dropdown
                    itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
                    itemsTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">Select a category to see items.</td></tr>';
                } else {
                    const errorData = await response.json();
                    showNotification(`Failed to delete category: ${errorData.error}`);
                }
            } catch (error) {
                showNotification('Network error while deleting category.');
            }
        }
    });

    editSubcategoryBtn.addEventListener('click', () => {
        const parentId = itemCategorySelect.value;
        const selectedOption = itemSubcategorySelect.options[itemSubcategorySelect.selectedIndex];
        if (!parentId || !selectedOption || !selectedOption.value) {
            showNotification('Please select a category and a subcategory to edit.');
            return;
        }
        openSubcategoryModal('edit', { id: selectedOption.value, name: selectedOption.text, parentId: parentId });
    });

    deleteSubcategoryBtn.addEventListener('click', async () => {
        const subcategoryId = itemSubcategorySelect.value;
        if (!subcategoryId) {
            showNotification('Please select a subcategory to delete.');
            return;
        }
         if (confirm('Are you sure you want to delete this subcategory?')) {
            try {
                const response = await fetch(`http://localhost:3000/subcategories/${subcategoryId}`, { method: 'DELETE' });
                if (response.ok) {
                    showNotification('Subcategory deleted successfully!');
                    await loadSubcategories(itemCategorySelect.value); // Reload subcategories
                    loadItems(itemCategorySelect.value, null); // Refresh items table
                } else {
                    showNotification(`Failed to delete subcategory.`);
                }
            } catch (error) {
                showNotification('Network error while deleting subcategory.');
            }
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
                if (itemCategorySelect.value === category_id) {
                    await loadSubcategories(category_id);
                }
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
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value);
            } else {
                 showNotification(`Failed to add item.`);
            }
        } catch (error) {
            showNotification('Network error while adding item.');
        }
    });

    itemsTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action="delete-item"]');
        if (!button) return;

        const itemId = button.dataset.id;
        if (confirm('Are you sure you want to delete this item?')) {
             try {
                const response = await fetch(`http://localhost:3000/items/${itemId}`, { method: 'DELETE' });
                if (response.ok) {
                    showNotification('Item deleted successfully!');
                    button.closest('tr').remove();
                } else {
                    showNotification(`Failed to delete item.`);
                }
            } catch (error) {
                showNotification('Network error while deleting item.');
            }
        }
    });

});
