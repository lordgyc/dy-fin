document.addEventListener('DOMContentLoaded', () => {
    // These selectors still work because we updated the HTML IDs to match
    const addRowBtn = document.getElementById('add-row-btn');
    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');
    const summaryVatExclude = document.getElementById('summary-vat-exclude');
    const syncLogsBtn = document.getElementById('sync-logs-btn');

    // ===================================================================================
    // THIS IS THE MAIN MODIFIED FUNCTION
    // It now creates the correct HTML structure and classes to match your new design
    // ===================================================================================
    const populateRowWithData = (data, isEditable = true) => {
        const vatOnChecked = data.vat_amount > 0 ? 'checked' : '';
        const disabledAttr = isEditable ? '' : 'disabled';
        const disabledClass = isEditable ? '' : 'disabled-input';
        const tinNumber = data.tin_number || '';

        let mrcOptions = '';
        if (data.mrc_number) {
            mrcOptions = `<option value="${data.mrc_number}">${data.mrc_number}</option>`;
        } else {
            mrcOptions = `<option value="N/A">N/A</option>`;
        }

        const displayedBaseTotal = (data.total_amount - data.vat_amount).toFixed(2);
        const displayedTotalVat = data.vat_amount ? data.vat_amount.toFixed(2) : '0.00';
        const displayedSubtotal = data.total_amount ? data.total_amount.toFixed(2) : '0.00';

        // NOTE: The class attributes now contain BOTH the old classes for JS selection 
        // AND the new classes for modern styling (e.g., "vendor-name-input input").
        return `
            <tr data-purchase-id="${data.purchase_id || ''}">
                <td class="sticky-col action-cell">
                    ${isEditable ? `
                        <button class="save-row-btn btn btn-icon" title="Save">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        </button>
                        <button class="delete-row-btn btn btn-icon btn-danger" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    ` : `
                        <button class="edit-row-btn btn btn-icon" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                    `}
                </td>
                <td><input type="text" class="vendor-name-input input ${disabledClass}" data-vendor-id="${data.vendor_id || ''}" value="${data.vendor_name || ''}" ${disabledAttr}></td>
                <td><select class="mrc-no-input ${disabledClass}" ${disabledAttr}>${mrcOptions}</select></td>
                <td><input type="text" class="tin-no-input input ${disabledClass}" value="${tinNumber}" ${disabledAttr}></td>
                <td><input type="text" class="item-name-input input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr}></td>
                <td><input type="date" class="purchase-date-input input ${disabledClass}" value="${data.purchase_date ? data.purchase_date.split('T')[0] : ''}" ${disabledAttr}></td>
                <td><input type="text" class="unit-input input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="quantity-input input is-numeric ${disabledClass}" value="${data.quantity || 0}" min="0" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="unit-price-input input is-numeric ${disabledClass}" value="${data.unit_price ? data.unit_price.toFixed(2) : '0.00'}" min="0" step="0.01" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="vat-percentage-input input is-numeric ${disabledClass}" value="${data.vat_percentage !== undefined ? data.vat_percentage : 12}" min="0" step="0.01" ${disabledAttr}></td>
                <td class="is-center"><input type="checkbox" class="vat-onoff-input checkbox ${disabledClass}" ${vatOnChecked} ${disabledAttr}></td>
                <td class="base-total-display is-numeric">${displayedBaseTotal}</td>
                <td class="total-vat-display is-numeric">${displayedTotalVat}</td>
                <td><input type="text" class="fs-number-input input ${disabledClass}" value="${data.fs_number || ''}" ${disabledAttr}></td>
                <td class="subtotal-display is-numeric"><strong>${displayedSubtotal}</strong></td>
            </tr>
        `;
    };
    
    const createNewRowHTML = () => {
        return populateRowWithData({}, true); // New rows are always editable
    };

    const attachRowEventListeners = (rowElement) => {
        const vendorNameInput = rowElement.querySelector('.vendor-name-input');
        const mrcNoInput = rowElement.querySelector('.mrc-no-input');
        const tinNoInput = rowElement.querySelector('.tin-no-input');
        const itemNameInput = rowElement.querySelector('.item-name-input');
        const unitPriceInput = rowElement.querySelector('.unit-price-input');
        const quantityInput = rowElement.querySelector('.quantity-input');
        const vatPercentageInput = rowElement.querySelector('.vat-percentage-input');
        const vatOnInput = rowElement.querySelector('.vat-onoff-input');
        const subtotalDisplay = rowElement.querySelector('.subtotal-display');
        const totalVatDisplay = rowElement.querySelector('.total-vat-display');
        const baseTotalDisplay = rowElement.querySelector('.base-total-display');
        const purchaseDateInput = rowElement.querySelector('.purchase-date-input');
        const deleteButton = rowElement.querySelector('.delete-row-btn');
        const saveButton = rowElement.querySelector('.save-row-btn');
        const editButton = rowElement.querySelector('.edit-row-btn');

        editButton?.addEventListener('click', () => {
            rowElement.querySelectorAll('input, select').forEach(input => {
                input.removeAttribute('disabled');
                input.classList.remove('disabled-input');
            });
            const actionCell = rowElement.querySelector('.action-cell');
            if (actionCell) {
                actionCell.innerHTML = `
                    <button class="save-row-btn btn btn-icon" title="Save">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    </button>
                    <button class="delete-row-btn btn btn-icon btn-danger" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                attachRowEventListeners(rowElement); 
            }
        });

        // --- Autocomplete Logic (UNTOUCHED) ---
        const vendorNameCell = vendorNameInput?.parentElement;
        const autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.classList.add('autocomplete-dropdown');
        vendorNameCell?.appendChild(autocompleteDropdown);
        let timeout = null;
        vendorNameInput?.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const searchTerm = e.target.value;
            if (searchTerm.length < 2) {
                if (autocompleteDropdown) {
                    autocompleteDropdown.innerHTML = '';
                    autocompleteDropdown.style.display = 'none';
                }
                return;
            }
            timeout = setTimeout(async () => {
                try {
                    const response = await fetch(`http://localhost:3000/search-vendors?query=${searchTerm}`);
                    const vendors = await response.json();
                    if (autocompleteDropdown) autocompleteDropdown.innerHTML = '';
                    if (vendors.length > 0) {
                        vendors.forEach(vendor => {
                            const suggestionItem = document.createElement('div');
                            suggestionItem.classList.add('autocomplete-item');
                            suggestionItem.textContent = vendor.vendor_name;
                            suggestionItem.addEventListener('click', () => {
                                if (vendorNameInput) vendorNameInput.value = vendor.vendor_name;
                                if (tinNoInput) tinNoInput.value = vendor.tin_number;
                                if (vendorNameInput) vendorNameInput.setAttribute('data-vendor-id', vendor.vendor_id);
                                if (mrcNoInput) mrcNoInput.innerHTML = '';
                                if (vendor.mrc_numbers && vendor.mrc_numbers.length > 0) {
                                    vendor.mrc_numbers.forEach(mrc => {
                                        const option = document.createElement('option');
                                        option.value = mrc;
                                        option.textContent = mrc;
                                        mrcNoInput.appendChild(option);
                                    });
                                } else if (mrcNoInput) {
                                    const option = document.createElement('option');
                                    option.value = 'N/A';
                                    option.textContent = 'N/A';
                                    mrcNoInput.appendChild(option);
                                }
                                if (autocompleteDropdown) {
                                    autocompleteDropdown.innerHTML = '';
                                    autocompleteDropdown.style.display = 'none';
                                }
                            });
                            autocompleteDropdown.appendChild(suggestionItem);
                        });
                        if (autocompleteDropdown) autocompleteDropdown.style.display = 'block';
                    } else {
                        if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
                    }
                } catch (err) { console.error("Vendor search failed:", err); }
            }, 300);
        });

        const itemNameCell = itemNameInput?.parentElement;
        const itemAutocompleteDropdown = document.createElement('div');
        itemAutocompleteDropdown.classList.add('autocomplete-dropdown');
        itemNameCell?.appendChild(itemAutocompleteDropdown);
        let itemTimeout = null;
        itemNameInput?.addEventListener('input', (e) => {
            clearTimeout(itemTimeout);
            const searchTerm = e.target.value;
            if (searchTerm.length < 2) {
                if (itemAutocompleteDropdown) {
                    itemAutocompleteDropdown.innerHTML = '';
                    itemAutocompleteDropdown.style.display = 'none';
                }
                return;
            }
            itemTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`http://localhost:3000/search-items?query=${searchTerm}`);
                    const items = await response.json();
                    if (itemAutocompleteDropdown) itemAutocompleteDropdown.innerHTML = '';
                    if (items.length > 0) {
                        items.forEach(item => {
                            const suggestionItem = document.createElement('div');
                            suggestionItem.classList.add('autocomplete-item');
                            suggestionItem.textContent = item.item_name;
                            suggestionItem.addEventListener('click', () => {
                                if (itemNameInput) itemNameInput.value = item.item_name;
                                if (unitPriceInput) unitPriceInput.value = item.unit_price.toFixed(2);
                                if (itemNameInput) itemNameInput.setAttribute('data-item-id', item.item_id);
                                if (itemAutocompleteDropdown) {
                                    itemAutocompleteDropdown.innerHTML = '';
                                    itemAutocompleteDropdown.style.display = 'none';
                                }
                                calculateRowTotals();
                            });
                            itemAutocompleteDropdown.appendChild(suggestionItem);
                        });
                        if (itemAutocompleteDropdown) itemAutocompleteDropdown.style.display = 'block';
                    } else {
                        if (itemAutocompleteDropdown) itemAutocompleteDropdown.style.display = 'none';
                    }
                } catch (err) { console.error("Item search failed:", err); }
            }, 300);
        });

        // --- Calculation Logic (UNTOUCHED) ---
        const calculateRowTotals = () => {
            const quantity = parseFloat(quantityInput?.value) || 0;
            const unitPrice = parseFloat(unitPriceInput?.value) || 0;
            const vatPercentage = parseFloat(vatPercentageInput?.value) || 0;
            const vatOn = vatOnInput?.checked;
            const baseTotal = quantity * unitPrice;
            let totalVat = vatOn ? baseTotal * (vatPercentage / 100) : 0;
            if (baseTotalDisplay) baseTotalDisplay.textContent = baseTotal.toFixed(2);
            if (totalVatDisplay) totalVatDisplay.textContent = totalVat.toFixed(2);
            if (subtotalDisplay) subtotalDisplay.innerHTML = `<strong>${(baseTotal + totalVat).toFixed(2)}</strong>`; // Use innerHTML for <strong>
            updateSummaryTotals();
        };

        quantityInput?.addEventListener('input', calculateRowTotals);
        unitPriceInput?.addEventListener('input', calculateRowTotals);
        vatPercentageInput?.addEventListener('input', calculateRowTotals);
        vatOnInput?.addEventListener('change', calculateRowTotals);

        purchaseDateInput?.addEventListener('change', (e) => {
            if (!checkEthiopianMonthValidation(e.target.value)) {
                e.target.classList.add('date-invalid');
            } else {
                e.target.classList.remove('date-invalid');
            }
        });

        // --- Save and Delete Logic (UNTOUCHED, but will now generate new edit button) ---
        deleteButton?.addEventListener('click', async () => {
            const purchase_id = rowElement.getAttribute('data-purchase-id');
            if (!purchase_id) {
                // If it's a new, unsaved row, just remove it from the DOM
                rowElement.remove();
                updateSummaryTotals();
                return;
            }
            if (confirm('Are you sure you want to delete this record?')) {
                try {
                    const response = await fetch(`http://localhost:3000/purchase-records/${purchase_id}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (response.ok) {
                        showNotification(result.message, 'success');
                        rowElement.remove();
                        updateSummaryTotals();
                    } else {
                        showNotification(`Error: ${result.message}`, 'error');
                    }
                } catch (error) {
                    showNotification('An error occurred while deleting the record.', 'error');
                }
            }
        });
        
        saveButton?.addEventListener('click', () => saveSingleRow(rowElement));
        calculateRowTotals();
    };

    const saveSingleRow = async (rowElement) => {
        const vendorNameInput = rowElement.querySelector('.vendor-name-input');
        const vendorName = vendorNameInput?.value;
        const vendorId = vendorNameInput?.getAttribute('data-vendor-id');
        const mrcNo = rowElement.querySelector('.mrc-no-input')?.value;
        const tinNo = rowElement.querySelector('.tin-no-input')?.value;
        const itemNameInput = rowElement.querySelector('.item-name-input');
        const itemName = itemNameInput?.value;
        const itemId = itemNameInput?.getAttribute('data-item-id');
        const purchaseDate = rowElement.querySelector('.purchase-date-input')?.value;
        const unit = rowElement.querySelector('.unit-input')?.value;
        const quantity = parseFloat(rowElement.querySelector('.quantity-input')?.value) || 0;
        const unitPrice = parseFloat(rowElement.querySelector('.unit-price-input')?.value) || 0;
        const vatPercentage = parseFloat(rowElement.querySelector('.vat-percentage-input')?.value) || 0;
        const vatOn = rowElement.querySelector('.vat-onoff-input')?.checked;
        const fsNumber = rowElement.querySelector('.fs-number-input')?.value;
        const baseTotal = quantity * unitPrice;
        let totalVat = vatOn ? baseTotal * (vatPercentage / 100) : 0;
        
        if (!vendorName || !itemName || !purchaseDate || !unit || quantity <= 0 || unitPrice < 0 || !fsNumber || !vendorId || !itemId) {
            showNotification('Please fill all fields, select a vendor/item from suggestions, and ensure quantity is positive.', 'error');
            return false;
        }
        if (!checkEthiopianMonthValidation(purchaseDate)) {
            showNotification('The purchase date must be in the current or a future Ethiopian month.', 'warning');
            return false;
        }

        const recordToSave = {
            vendorId, vendorName, mrcNo, tinNo, itemId, itemName, purchaseDate, unit,
            quantity, unitPrice, vatPercentage, vatOn, totalVat, baseTotal, fsNumber
        };

        try {
            const response = await fetch('http://localhost:3000/save-purchase-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recordToSave),
            });
            const result = await response.json();
            if (response.ok) {
                showNotification(result.message, 'success');
                rowElement.querySelectorAll('input, select').forEach(input => {
                    input.setAttribute('disabled', 'true');
                    input.classList.add('disabled-input');
                });
                const actionCell = rowElement.querySelector('.action-cell');
                if (actionCell) {
                    actionCell.innerHTML = `
                        <button class="edit-row-btn btn btn-icon" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                    `;
                    attachRowEventListeners(rowElement); 
                }
                if (result.purchase_id) {
                    rowElement.dataset.purchaseId = result.purchase_id;
                }
                updateSummaryTotals();
                return true;
            } else {
                showNotification(`Error: ${result.message}`, 'error');
                return false;
            }
        } catch (error) {
            showNotification('An error occurred while saving the record.', 'error');
            return false;
        }
    };

    // --- ALL THE REST OF YOUR JS IS UNTOUCHED ---
    // --- It will work as-is because we updated the HTML and row generation to match it ---

    const updateSummaryTotals = () => {
        let totalBaseAmount = 0;
        let totalVatAmount = 0;
        let finalSubtotal = 0;
        document.querySelectorAll('#actions-table tbody tr').forEach(row => {
            const base = parseFloat(row.querySelector('.base-total-display')?.textContent) || 0;
            const vat = parseFloat(row.querySelector('.total-vat-display')?.textContent) || 0;
            totalBaseAmount += base;
            totalVatAmount += vat;
        });
        finalSubtotal = totalBaseAmount + totalVatAmount;
        summaryVatExclude.textContent = totalBaseAmount.toFixed(2);
        summaryTotalVat.textContent = totalVatAmount.toFixed(2);
        summarySubtotal.innerHTML = `<strong>${finalSubtotal.toFixed(2)}</strong>`;
    };

    document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; });
    document.getElementById('go-to-reports-btn')?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'reports.html'; });

    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');
    const closeButton = document.querySelector('.close-button');

    const showNotification = (message, type = 'info') => {
        notificationModal.style.display = 'none'; 
        notificationMessage.textContent = message;
        notificationModal.className = 'notification-modal';
        notificationModal.classList.add(`notification-${type}`);
        notificationModal.style.display = 'flex';
        if (type !== 'error') {
            setTimeout(() => {
                notificationModal.style.display = 'none';
            }, 3000);
        }
    };
    closeButton.addEventListener('click', () => { notificationModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === notificationModal) notificationModal.style.display = 'none'; });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            notificationModal.style.display = 'none';
        }
    });

    // Global click listener to close autocomplete dropdowns
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            if (!dropdown.parentElement.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });
    
    const reloadTableData = async () => {
        try {
            const response = await fetch('http://localhost:3000/last-10-purchase-records');
            const records = await response.json();
            if (response.ok) {
                actionsTableBody.innerHTML = ''; // Clear existing rows
                if (records.length > 0) {
                    records.forEach(record => {
                        actionsTableBody.innerHTML += populateRowWithData(record, false);
                    });
                    document.querySelectorAll('#actions-table tbody tr').forEach(attachRowEventListeners);
                } else {
                    addRowBtn.click(); // If no records, add one empty row
                }
                updateSummaryTotals();
            } else { addRowBtn.click(); }
        } catch (error) {
            console.error('Error fetching initial records:', error);
            addRowBtn.click();
        }
    };

    reloadTableData();

    addRowBtn.addEventListener('click', () => {
        const newRowHtml = createNewRowHTML();
        // Use insertAdjacentHTML for better performance than innerHTML +=
        actionsTableBody.insertAdjacentHTML('afterbegin', newRowHtml);
        const newRowElement = actionsTableBody.firstElementChild;
        if (newRowElement) {
            attachRowEventListeners(newRowElement);
            newRowElement.querySelector('input')?.focus(); // Focus on the first input
        }
    });

    syncLogsBtn?.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/sync-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (response.ok) {
                showNotification(result.message, 'success');
                reloadTableData(); 
            } else {
                showNotification(`Error syncing logs: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Client-side error during log sync:', error);
            showNotification('An unexpected error occurred during log sync.', 'error');
        }
    });

    const ethiopianMonthDisplay = document.getElementById('ethiopian-month');
    if (ethiopianMonthDisplay) {
        const today = new Date();
        const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const ethiopianMonths = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Ter", "Yekatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehase", "Pagume"];
        ethiopianMonthDisplay.textContent = `(${ethiopianMonths[currentEC.month - 1]} ${currentEC.year} E.C.)`;
    }
});

// --- Ethiopian Calendar Helper Functions (UNTOUCHED) ---
function isGregorianLeap(year) { return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0); }
function gcToEc(gYear, gMonth, gDay) { let eYear = (gMonth < 9 || (gMonth === 9 && gDay < 11)) ? gYear - 8 : gYear - 7; let newYearDay = isGregorianLeap(gYear - 1) ? 12 : 11; let gDate = new Date(gYear, gMonth - 1, gDay); let ethNewYear = new Date(gYear, 8, newYearDay); let daysDiff = Math.floor((gDate - ethNewYear) / (1000 * 60 * 60 * 24)); let eMonth, eDay; if (daysDiff >= 0) { eMonth = Math.floor(daysDiff / 30) + 1; eDay = (daysDiff % 30) + 1; } else { let prevNewYearDay = isGregorianLeap(gYear - 2) ? 12 : 11; let prevEthNewYear = new Date(gYear - 1, 8, prevNewYearDay); daysDiff = Math.floor((gDate - prevEthNewYear) / (1000 * 60 * 60 * 24)); eMonth = Math.floor(daysDiff / 30) + 1; eDay = (daysDiff % 30) + 1; } return { year: eYear, month: eMonth, day: eDay }; }
function checkEthiopianMonthValidation(gregorianDateString) { if (!gregorianDateString) return true; const today = new Date(); const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate()); const selectedDate = new Date(gregorianDateString); const selectedEC = gcToEc(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()); if (selectedEC.year < currentEC.year) return false; if (selectedEC.year === currentEC.year && selectedEC.month < currentEC.month) return false; return true; }