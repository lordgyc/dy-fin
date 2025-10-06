// This file has been refactored to work with the new report.html design.
// Key changes include:
// - Updated element selectors to match new IDs and classes.
// - New navigation logic based on `data-section` attributes.
// - Updated modal handling for the new modal structure.
// - Dynamic HTML generation now uses new CSS classes (e.g., 'btn', 'input').
// - Event listeners have been modernized to use event delegation where appropriate.

document.addEventListener('DOMContentLoaded', () => {
    // --- GENERAL & NAVIGATION ELEMENTS ---
    const navButtons = document.querySelectorAll('.nav .btn[data-section]');
    const allSections = document.querySelectorAll('.page-section');
    const defaultMessageSection = document.getElementById('reports-page-default-message');
    document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; });
    document.getElementById('go-to-workspace-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'workspace.html'; });
    
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
    const summaryPaginationControls = document.querySelector('.summary-pagination-controls');
    const prevSummaryPageBtn = document.getElementById('prev-summary-page-btn');
    const nextSummaryPageBtn = document.getElementById('next-summary-page-btn');
    const summaryPageInfo = document.getElementById('summary-page-info');

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
    
    // --- ITEM & CATEGORY MANAGEMENT ELEMENTS ---
    const itemsTableBody = document.querySelector('#items-table tbody');
    const itemCategorySelect = document.getElementById('itemCategorySelect');
    const itemSubcategorySelect = document.getElementById('itemSubcategorySelect');
    const newItemNameInput = document.getElementById('newItemName');
    const newItemUnitPriceInput = document.getElementById('newItemUnitPrice');
    const newItemDescriptionInput = document.getElementById('newItemDescription');
    const addItemBtn = document.getElementById('addItemBtn');

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
    let currentPage = 0;
    const itemsPerPage = 10;
    let allUniqueItems = [];
    let currentReportData = [];

    // --- ETHIOPIAN CALENDAR CONVERSION UTILITY ---
    const calendarUtil = {
        toEthiopian: (gregorianDate) => {
            const date = gregorianDate instanceof Date ? gregorianDate : new Date();
            const gregYear = date.getFullYear();
            const gregMonth = date.getMonth() + 1;
            const gregDay = date.getDate();

            let ethYear = gregYear - 8;
            const isGregLeap = (gregYear % 4 === 0 && gregYear % 100 !== 0) || (gregYear % 400 === 0);

            // Ethiopian new year starts on Sep 11 (or 12 on a leap year)
            const ethNewYearDay = isGregLeap ? 12 : 11;
            
            if (gregMonth > 9 || (gregMonth === 9 && gregDay >= ethNewYearDay)) {
                ethYear += 1;
            }

            // Calculate day number in Gregorian year
            const dayOfYear = Math.floor((date - new Date(gregYear, 0, 0)) / (1000 * 60 * 60 * 24));
            
            let ethDay, ethMonth;
            if (date >= new Date(gregYear, 8, ethNewYearDay)) {
                const daysSinceNewYear = dayOfYear - (isGregLeap ? 254 : 253);
                ethMonth = Math.ceil(daysSinceNewYear / 30);
                ethDay = daysSinceNewYear % 30 || 30;
            } else {
                const daysSinceNewYear = dayOfYear + (isGregLeap ? 112 : 113);
                ethMonth = Math.ceil(daysSinceNewYear / 30);
                ethDay = daysSinceNewYear % 30 || 30;
            }
            return { etYear: ethYear, etMonth, etDay };
        },

        getGregorianRangeForEthiopianMonth: (etYear, etMonth) => {
            const isEthLeap = (etYear + 1) % 4 === 0;
            const gregYear = etYear + 7;
            
            // Start of Ethiopian Year in Gregorian Calendar
            const newYearDay = new Date(gregYear, 8, 11); // September is month 8
            if ((gregYear + 1) % 4 === 0) newYearDay.setDate(12);

            const startOffset = (etMonth - 1) * 30;
            const startDate = new Date(newYearDay.getTime());
            startDate.setDate(newYearDay.getDate() + startOffset);
            
            let daysInMonth = 30;
            if (etMonth === 13) {
                daysInMonth = isEthLeap ? 6 : 5;
            }
            
            const endDate = new Date(startDate.getTime());
            endDate.setDate(startDate.getDate() + daysInMonth - 1);

            const formatDate = (d) => d.toISOString().split('T')[0];
            
            return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate)
            };
        }
    };

    // --- REFACTORED NAVIGATION LOGIC ---
    function switchView(targetSectionId) {
        // Hide default message and all sections
        defaultMessageSection.style.display = 'none';
        allSections.forEach(section => section.style.display = 'none');
        
        // Show the target section
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update active button state
        navButtons.forEach(btn => {
            if (btn.dataset.section === targetSectionId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Trigger initial data load for specific sections
        if (targetSectionId === 'management-section') {
            // Default to vendor tab
            document.querySelector('.tab-button[data-tab="vendor-tab"]').click();
        } else if (targetSectionId === 'vat-report-section') {
            // Set default to current Ethiopian month and year, then fetch
            const { etYear, etMonth } = calendarUtil.toEthiopian(new Date());
            ethiopianYearInput.value = etYear;
            ethiopianMonthSelect.value = etMonth;
            const { startDate, endDate } = calendarUtil.getGregorianRangeForEthiopianMonth(etYear, etMonth);
            fetchVatReport(startDate, endDate);
        } else if (targetSectionId === 'summary-report-section') {
            // Set default to current Ethiopian month and year, then fetch
            const { etYear, etMonth } = calendarUtil.toEthiopian(new Date());
            summaryEthiopianYearInput.value = etYear;
            summaryEthiopianMonthSelect.value = etMonth;
            const { startDate, endDate } = calendarUtil.getGregorianRangeForEthiopianMonth(etYear, etMonth);
            fetchSummaryReport(startDate, endDate);
        }
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.section);
        });
    });
    
    // --- REFACTORED MODAL HANDLING ---
    function openModal(modalElement, mode = 'add', data = {}) {
        modalElement.style.display = 'flex'; // Use flex for new modal centering
        modalElement.setAttribute('data-mode', mode);

        if (modalElement === vendorModal) {
            vendorForm.reset();
             // Clear dynamic MRCs
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
    
    // --- VAT REPORT LOGIC ---
    const fetchVatReport = async (startDate, endDate) => {
        try {
            const response = await fetch(`http://localhost:3000/reports/vat?startDate=${startDate}&endDate=${endDate}`);
            const reportData = await response.json();
            if (response.ok) renderVatReport(reportData);
            else showNotification(`Error fetching VAT report: ${reportData.error}`);
        } catch (error) {
            showNotification('Network error fetching VAT report. Please check server connection.');
        }
    };
    
    const renderVatReport = (data) => {
        vatReportTableBody.innerHTML = '';
        if (data.length === 0) {
            vatReportTableBody.innerHTML = '<tr><td colspan="11" class="placeholder-cell">No data for the selected date range.</td></tr>';
            summaryVatAmount.textContent = '0.00';
            summaryBaseTotal.textContent = '0.00';
            summaryTotalAmount.textContent = '0.00';
            return;
        }

        let totalVat = 0, totalBase = 0, totalAmount = 0;
        data.forEach(record => {
            const baseTotal = (record.total_amount || 0) - (record.vat_amount || 0);
            const row = vatReportTableBody.insertRow();
            row.innerHTML = `
                <td>${record.vendor_name}</td>
                <td>${record.tin_number}</td>
                <td>${record.mrc_number || 'N/A'}</td>
                <td>${new Date(record.purchase_date).toLocaleDateString()}</td>
                <td>${record.item_name}</td>
                <td class="is-numeric">${record.quantity}</td>
                <td class="is-numeric">${(record.unit_price || 0).toFixed(2)}</td>
                <td class="is-numeric">${record.vat_percentage || 0}%</td>
                <td class="is-numeric">${(record.vat_amount || 0).toFixed(2)}</td>
                <td class="is-numeric">${baseTotal.toFixed(2)}</td>
                <td class="is-numeric">${(record.total_amount || 0).toFixed(2)}</td>
            `;
            totalVat += record.vat_amount || 0;
            totalBase += baseTotal;
            totalAmount += record.total_amount || 0;
        });

        summaryVatAmount.textContent = totalVat.toFixed(2);
        summaryBaseTotal.textContent = totalBase.toFixed(2);
        summaryTotalAmount.textContent = totalAmount.toFixed(2);
    };

    generateVatReportBtn?.addEventListener('click', () => {
        const etYear = parseInt(ethiopianYearInput.value, 10);
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }
        
        const { startDate, endDate } = calendarUtil.getGregorianRangeForEthiopianMonth(etYear, etMonth);
        fetchVatReport(startDate, endDate);
    });

    exportVatReportBtn?.addEventListener('click', () => {
        const etYear = parseInt(ethiopianYearInput.value, 10);
        const etMonth = parseInt(ethiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please select a valid month and year to export.');
            return;
        }

        const { startDate, endDate } = calendarUtil.getGregorianRangeForEthiopianMonth(etYear, etMonth);
        window.location.href = `http://localhost:3000/export/vat-report?startDate=${startDate}&endDate=${endDate}`;
    });

    // --- JV REPORT LOGIC ---
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

        if (data.length === 0) {
            jvReportTableBody.innerHTML = '<tr><td colspan="3" class="placeholder-cell">No data for the selected date.</td></tr>';
            return;
        }

        let totalVatSum = 0;
        let cashTotalSum = 0;

        data.forEach(record => {
            const baseTotal = record.base_total || 0;
            const totalVat = record.total_vat || 0;
            const grandTotal = record.grand_total || 0;
            
            jvReportTableBody.innerHTML += `
                <tr>
                    <td>${record.item_name}</td>
                    <td class="is-numeric">${Math.round(baseTotal)}</td>
                    <td class="is-numeric"></td>
                </tr>
            `;
            totalVatSum += totalVat;
            cashTotalSum += grandTotal;
        });
        
        jvReportTableFoot.innerHTML = `
            <tr>
                <td><strong>Total VAT</strong></td>
                <td class="is-numeric"><strong>${Math.round(totalVatSum)}</strong></td>
                <td class="is-numeric"></td>
            </tr>
            <tr>
                <td><strong>Cash</strong></td>
                <td class="is-numeric"></td>
                <td class="is-numeric"><strong>${Math.round(cashTotalSum)}</strong></td>
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
    
    // --- SUMMARY REPORT LOGIC ---
     async function fetchSummaryReport(startDate, endDate) {
        try {
            const response = await fetch(`http://localhost:3000/reports/summary?startDate=${startDate}&endDate=${endDate}`);
            const reportData = await response.json();
            if (response.ok) renderSummaryReport(reportData);
            else showNotification(`Error fetching Summary report: ${reportData.error}`);
        } catch (error) {
            showNotification('Network error fetching Summary report.');
        }
    }

    function renderSummaryReport(reportData) {
        summaryReportTableHead.innerHTML = '<th>Date</th>';
        summaryReportTableBody.innerHTML = '';

        if (!reportData || reportData.length === 0) {
            summaryReportTableBody.innerHTML = '<tr><td colspan="1" class="placeholder-cell">No data available.</td></tr>';
            summaryPaginationControls.style.display = 'none';
            return;
        }

        currentReportData = reportData;
        allUniqueItems = [...new Set(reportData.map(record => record.item_name))].sort();
        currentPage = 0;
        renderSummaryPage(currentPage);
        summaryPaginationControls.style.display = 'flex';
    }

    function renderSummaryPage(page) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, allUniqueItems.length);
        const itemsToDisplay = allUniqueItems.slice(startIndex, endIndex);

        // Build header
        summaryReportTableHead.innerHTML = '<th>Date</th>';
        itemsToDisplay.forEach(item => summaryReportTableHead.innerHTML += `<th>${item}</th>`);
        summaryReportTableHead.innerHTML += `<th class="is-numeric">Total VAT</th>`;

        // Group data by date
        summaryReportTableBody.innerHTML = '';
        const groupedByDate = currentReportData.reduce((acc, record) => {
            const date = record.purchase_date;
            if (!acc[date]) {
                acc[date] = { items: {}, dailyTotalVat: 0 };
            }
            acc[date].items[record.item_name] = (acc[date].items[record.item_name] || 0) + record.base_total;
            acc[date].dailyTotalVat += record.total_vat;
            return acc;
        }, {});

        // Build rows
        Object.keys(groupedByDate).sort().forEach(date => {
            const dateData = groupedByDate[date];
            let rowHtml = `<td>${new Date(date).toLocaleDateString()}</td>`;
            
            itemsToDisplay.forEach(item => {
                const baseTotal = dateData.items[item] || 0;
                rowHtml += `<td class="is-numeric">${baseTotal.toFixed(2)}</td>`;
            });

            rowHtml += `<td class="is-numeric">${dateData.dailyTotalVat.toFixed(2)}</td>`;
            summaryReportTableBody.innerHTML += `<tr>${rowHtml}</tr>`;
        });

        // Update pagination controls
        const totalPages = Math.ceil(allUniqueItems.length / itemsPerPage);
        summaryPageInfo.textContent = `Page ${page + 1} of ${totalPages}`;
        prevSummaryPageBtn.disabled = page === 0;
        nextSummaryPageBtn.disabled = page >= totalPages - 1;
    }

    generateSummaryReportBtn?.addEventListener('click', () => {
        const etYear = parseInt(summaryEthiopianYearInput.value, 10);
        const etMonth = parseInt(summaryEthiopianMonthSelect.value, 10);

        if (!etYear || isNaN(etYear)) {
            showNotification('Please enter a valid Ethiopian year.');
            return;
        }
        
        const { startDate, endDate } = calendarUtil.getGregorianRangeForEthiopianMonth(etYear, etMonth);
        fetchSummaryReport(startDate, endDate);
    });

    prevSummaryPageBtn?.addEventListener('click', () => { if (currentPage > 0) renderSummaryPage(--currentPage); });
    nextSummaryPageBtn?.addEventListener('click', () => { if (currentPage < Math.ceil(allUniqueItems.length / itemsPerPage) - 1) renderSummaryPage(++currentPage); });


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
                loadItems();
            }
        });
    });

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

    // --- ITEM & CATEGORY MANAGEMENT (LOGIC IS THE SAME, JUST HOOKED UP) ---
    // (This entire section is mostly copied from your old JS as the logic is sound)

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
                 itemsTableBody.innerHTML = '<tr><td colspan="6" class="placeholder-cell">No items found.</td></tr>';
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
            
            // Populate select elements
            subcategoryCategorySelectModal.innerHTML = '<option value="">Select Category</option>';
            itemCategorySelect.innerHTML = '<option value="">Select Category</option>';

            categories.forEach(category => {
                subcategoryCategorySelectModal.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
                itemCategorySelect.innerHTML += `<option value="${category.category_id}">${category.category_name}</option>`;
            });
        } catch (error) {
            showNotification('Error loading categories.');
        }
    }
    
    async function loadSubcategories(categoryId = null) {
        itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
        if (!categoryId) return;
        
        try {
            const response = await fetch(`http://localhost:3000/subcategories/${categoryId}`);
            const subcategories = await response.json();
            subcategories.forEach(sub => {
                itemSubcategorySelect.innerHTML += `<option value="${sub.subcategory_id}">${sub.subcategory_name}</option>`;
            });
        } catch (error) {
            showNotification('Error loading subcategories.');
        }
    }
    
    itemCategorySelect.addEventListener('change', (e) => loadSubcategories(e.target.value));
    
    // Placeholder CRUD functions for Items/Categories, to be fully implemented if needed
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