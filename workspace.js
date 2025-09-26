document.addEventListener('DOMContentLoaded', () => {
    const addRowBtn = document.getElementById('add-row-btn');
    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');
    // This is a new element from the HTML I provided, let's get it for consistency.
    const summaryVatExclude = document.getElementById('summary-vat-exclude');
    const syncLogsBtn = document.getElementById('sync-logs-btn');

    const populateRowWithData = (data, isEditable = true) => {
        const vatOnChecked = data.vat_amount > 0 ? 'checked' : '';
        const disabledAttr = isEditable ? '' : 'disabled';
        const disabledClass = isEditable ? '' : 'disabled-input';
        const tinNumber = data.tin_number || '';

        let mrcOptions = '';
        // If mrc_number is available in the data, use it; otherwise, default to N/A
        if (data.mrc_number) {
            mrcOptions = `<option value="${data.mrc_number}">${data.mrc_number}</option>`;
        } else {
            mrcOptions = `<option value="N/A">N/A</option>`;
        }

        const displayedBaseTotal = (data.total_amount - data.vat_amount).toFixed(2);
        const displayedTotalVat = data.vat_amount ? data.vat_amount.toFixed(2) : '0.00';
        const displayedSubtotal = data.total_amount ? data.total_amount.toFixed(2) : '0.00';

        return `
            <tr data-purchase-id="${data.purchase_id || ''}">
                <td>
                    <div class="action-buttons-container">
                        ${isEditable ? `
                            <button class="save-row-btn button-base button-primary" aria-label="Save row">
                                <span class="save-icon"></span>
                            </button>
                            <button class="delete-row-btn button-base button-destructive" aria-label="Delete row">
                                <span class="delete-icon"></span>
                            </button>
                        ` : `
                            <button class="edit-row-btn button-base button-secondary" aria-label="Edit row">
                                <span class="edit-icon"></span>
                            </button>
                        `}
                    </div>
                </td>
                <td><input type="text" class="vendor-name-input ${disabledClass}" data-vendor-id="${data.vendor_id || ''}" value="${data.vendor_name || ''}" ${disabledAttr}></td>
                <td><select class="mrc-no-input ${disabledClass}" ${disabledAttr}>${mrcOptions}</select></td>
                <td><input type="text" class="tin-no-input ${disabledClass}" value="${tinNumber}" ${disabledAttr}></td>
                <td><input type="text" class="item-name-input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr}></td>
                <td><input type="date" class="purchase-date-input ${disabledClass}" value="${data.purchase_date ? data.purchase_date.split('T')[0] : ''}" ${disabledAttr}></td>
                <td><input type="text" class="unit-input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr}></td>
                <td><input type="number" class="quantity-input ${disabledClass}" value="${data.quantity || 0}" min="0" ${disabledAttr}></td>
                <td><input type="number" class="unit-price-input ${disabledClass}" value="${data.unit_price ? data.unit_price.toFixed(2) : '0.00'}" min="0" step="0.01" ${disabledAttr}></td>
                <td><input type="number" class="vat-percentage-input ${disabledClass}" value="${data.vat_percentage !== undefined ? data.vat_percentage : 12}" min="0" step="0.01" ${disabledAttr}></td>
                <td><input type="checkbox" class="vat-onoff-input ${disabledClass}" ${vatOnChecked} ${disabledAttr}></td>
                <td class="base-total-display calculated-cell">${displayedBaseTotal}</td>
                <td class="total-vat-display calculated-cell">${displayedTotalVat}</td>
                <td><input type="text" class="fs-number-input ${disabledClass}" value="${data.fs_number || ''}" ${disabledAttr}></td>
                <td class="subtotal-display calculated-cell">${displayedSubtotal}</td>
            </tr>
        `;
    };
    
    // ===================================================================================
    // THIS IS THE MAIN CORRECTED FUNCTION
    // It now creates the correct button structure that matches the new styles.css
    // ===================================================================================
    const createNewRowHTML = () => {
        // This creates an empty, editable row HTML string
        return populateRowWithData({
            purchase_id: '',
            vendor_id: '',
            vendor_name: '',
            mrc_number: 'N/A',
            tin_number: '',
            item_id: '',
            item_name: '',
            purchase_date: '',
            unit: '',
            quantity: 0,
            unit_price: 0.00,
            vat_percentage: 12,
            vat_amount: 0.00,
            total_amount: 0.00,
            fs_number: '',
        }, true); // New rows are always editable
    };

    const attachRowEventListeners = (rowElement) => {
        // Get references to all input elements in the new row, using optional chaining
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

        // Get references to the NEW button elements
        const deleteButton = rowElement.querySelector('.delete-row-btn');
        const saveButton = rowElement.querySelector('.save-row-btn');

        // NEW: Edit button reference
        const editButton = rowElement.querySelector('.edit-row-btn');

        // NEW: Event listener for Edit button
        editButton?.addEventListener('click', () => {
            // Enable all inputs/selects in the row
            rowElement.querySelectorAll('input, select').forEach(input => {
                input.removeAttribute('disabled');
                input.classList.remove('disabled-input');
            });

            // Replace edit button with save and delete buttons
            const actionButtonsContainer = rowElement.querySelector('.action-buttons-container');
            if (actionButtonsContainer) {
                actionButtonsContainer.innerHTML = `
                    <button class="save-row-btn button-base button-primary" aria-label="Save row">
                        <span class="save-icon"></span>
                    </button>
                    <button class="delete-row-btn button-base button-destructive" aria-label="Delete row">
                        <span class="delete-icon"></span>
                    </button>
                `;
                // Re-attach listeners for the new save/delete buttons
                attachRowEventListeners(rowElement); 
            }
        });


        // Autocomplete for Vendor Name
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
            }, 300);
        });

        const itemNameCell = itemNameInput?.parentElement;
        const itemAutocompleteDropdown = document.createElement('div');
        itemAutocompleteDropdown.classList.add('autocomplete-dropdown');
        itemNameCell?.appendChild(itemAutocompleteDropdown);

        let itemTimeout = null;
        itemNameInput?.addEventListener('input', (e) => {
            // IMPORTANT: If a duplicate document.addEventListener('click', ...) exists here, please remove it manually.
            // It has been moved to a global listener outside createNewRow for proper event handling.
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
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (vendorNameCell && !vendorNameCell.contains(e.target)) {
                if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
            }
            if (itemNameCell && !itemNameCell.contains(e.target)) {
                if (itemAutocompleteDropdown) itemAutocompleteDropdown.style.display = 'none';
            }
        });

        const calculateRowTotals = () => {
            const quantity = parseFloat(quantityInput?.value) || 0;
            const unitPrice = parseFloat(unitPriceInput?.value) || 0;
            const vatPercentage = parseFloat(vatPercentageInput?.value) || 0;
            const vatOn = vatOnInput?.checked;

            const baseTotal = quantity * unitPrice;
            
            let totalVat = 0;
            if (vatOn) {
                totalVat = baseTotal * (vatPercentage / 100);
            }
            
            if (baseTotalDisplay) baseTotalDisplay.textContent = baseTotal.toFixed(2);
            if (totalVatDisplay) totalVatDisplay.textContent = totalVat.toFixed(2);
            if (subtotalDisplay) subtotalDisplay.textContent = (baseTotal + totalVat).toFixed(2);

            updateSummaryTotals();
        };

        quantityInput?.addEventListener('input', calculateRowTotals);
        unitPriceInput?.addEventListener('input', calculateRowTotals);
        vatPercentageInput?.addEventListener('input', calculateRowTotals);
        vatOnInput?.addEventListener('change', calculateRowTotals);

        purchaseDateInput?.addEventListener('change', (e) => {
            const isValid = checkEthiopianMonthValidation(e.target.value);
            if (!isValid) {
                e.target.classList.add('date-invalid');
                e.target.closest('td')?.classList.add('date-invalid');
            } else {
                e.target.classList.remove('date-invalid');
                e.target.closest('td')?.classList.remove('date-invalid');
            }
        });

        deleteButton?.addEventListener('click', async () => {
            const purchase_id = rowElement.getAttribute('data-purchase-id');
            if (!purchase_id) {
                showNotification('Cannot delete unsaved row.', 'warning');
                return;
            }

            if (confirm('Are you sure you want to delete this record?')) {
                try {
                    const response = await fetch(`http://localhost:3000/purchase-records/${purchase_id}`, {
                        method: 'DELETE',
                    });
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
        saveButton?.addEventListener('click', async () => {
            const success = await saveSingleRow(rowElement);
            if (success) {
                // No need to clear row inputs anymore, as they become unchangeable
            }
        });

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
        
        if (!vendorName || !itemName || !purchaseDate || !unit || quantity <= 0 || unitPrice <= 0 || !fsNumber || !vendorId || !itemId) {
            showNotification('Please fill all fields, select a vendor/item from suggestions, and ensure numbers are positive.', 'error');
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
                rowElement.classList.remove('unsaved-changes');
                // Disable inputs after successful save
                rowElement.querySelectorAll('input, select').forEach(input => {
                    input.setAttribute('disabled', 'true');
                    input.classList.add('disabled-input');
                });
                rowElement.querySelector('.save-row-btn')?.setAttribute('disabled', 'true');
                rowElement.querySelector('.delete-row-btn')?.setAttribute('disabled', 'true');

                // Replace save/delete with edit button
                const actionButtonsContainer = rowElement.querySelector('.action-buttons-container');
                if (actionButtonsContainer) {
                    actionButtonsContainer.innerHTML = `
                        <button class="edit-row-btn button-base button-secondary" aria-label="Edit row">
                            <span class="edit-icon"></span>
                        </button>
                    `;
                    // Re-attach listeners for the new edit button
                    attachRowEventListeners(rowElement); 
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

    const updateSummaryTotals = () => {
        let totalBaseAmount = 0;
        let totalVatAmount = 0;
        let finalSubtotal = 0;

        document.querySelectorAll('#actions-table tbody tr').forEach(row => {
            const base = parseFloat(row.querySelector('.base-total-display')?.textContent) || 0;
            const vat = parseFloat(row.querySelector('.total-vat-display')?.textContent) || 0;

            totalBaseAmount += base;
            totalVatAmount += vat;
            finalSubtotal += base + vat;
        });

        summaryVatExclude.textContent = totalBaseAmount.toFixed(2);
        summaryTotalVat.textContent = totalVatAmount.toFixed(2);
        summarySubtotal.textContent = finalSubtotal.toFixed(2);
    };

    // --- Navigation and Other Listeners (Unchanged) ---
    document.getElementById('back-to-login-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
    document.getElementById('go-to-reports-btn')?.addEventListener('click', () => { window.location.href = 'reports.html'; });

    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');
    const closeButton = document.querySelector('.close-button');

    // Removed: const confirmationModal = document.getElementById('confirmation-modal'); // New
    // Removed: const confirmLeaveBtn = document.getElementById('confirm-leave-btn'); // New
    // Removed: const confirmStayBtn = document.getElementById('confirm-stay-btn'); // New

    let targetUrl = ''; // To store the URL for navigation

    const showNotification = (message, type = 'info') => {
        // Ensure modal is hidden before showing to clear any previous state
        notificationModal.style.display = 'none'; 
        notificationMessage.textContent = message;
        notificationModal.className = 'notification-modal';
        notificationModal.classList.add(`notification-${type}`);
        notificationModal.style.display = 'flex';

        // Automatically close after 3 seconds, unless it's an error (which needs manual close)
        if (type !== 'error') {
            setTimeout(() => {
                notificationModal.style.display = 'none';
            }, 3000);
        }
    };
    closeButton.addEventListener('click', () => { notificationModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === notificationModal) notificationModal.style.display = 'none'; });
    actionsTableBody.addEventListener('input', (e) => {
        if (e.target.closest('tr')) {
            e.target.closest('tr').classList.add('unsaved-changes');
        }
    });
    // Removed beforeunload listener as it's no longer needed.

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault(); // Prevent browser default (e.g., opening a new tab)
            const newRowHtml = createNewRowHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `<table><tbody>${newRowHtml}</tbody></table>`; // Wrap in table and tbody
            const newRowElement = tempDiv.querySelector('tr');
            if (newRowElement) {
                actionsTableBody.prepend(newRowElement);
                attachRowEventListeners(newRowElement);
            }
        }
        const activeEl = document.activeElement;
        if (!activeEl.matches('input, select')) return;
        const currentRow = activeEl.closest('tr');
        if (!currentRow) return;

        const cells = Array.from(currentRow.querySelectorAll('input, select'));
        const currentIdx = cells.indexOf(activeEl);

        let nextEl = null;
        if (e.key === 'ArrowRight') nextEl = cells[currentIdx + 1];
        if (e.key === 'ArrowLeft') nextEl = cells[currentIdx - 1];
        if (e.key === 'ArrowDown') {
            const nextRow = currentRow.nextElementSibling;
            if (nextRow) nextEl = nextRow.querySelectorAll('input, select')[currentIdx];
        }
        if (e.key === 'ArrowUp') {
            const prevRow = currentRow.previousElementSibling;
            if (prevRow) nextEl = prevRow.querySelectorAll('input, select')[currentIdx];
        }
        if (nextEl) {
            e.preventDefault();
            nextEl.focus();
        }
    });

    // Display current Ethiopian month
    const ethiopianMonthDisplay = document.getElementById('ethiopian-month');
    if (ethiopianMonthDisplay) {
        const today = new Date();
        const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const ethiopianMonths = [
            "Meskerem", "Tikimt", "Hidar", "Tahsas", "Ter", "Yekatit", "Megabit",
            "Miazia", "Genbot", "Sene", "Hamle", "Nehase", "Pagume"
        ];
        ethiopianMonthDisplay.textContent = `(${ethiopianMonths[currentEC.month - 1]} ${currentEC.year} E.C.)`;
    }

    // Global click listener to close autocomplete dropdowns
    document.addEventListener('click', (e) => {
        // Close vendor autocomplete dropdowns
        document.querySelectorAll('.vendor-name-input').forEach(input => {
            const vendorCell = input.parentElement;
            const dropdown = vendorCell.querySelector('.autocomplete-dropdown');
            if (dropdown && !vendorCell.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Close item autocomplete dropdowns
        document.querySelectorAll('.item-name-input').forEach(input => {
            const itemCell = input.parentElement;
            const dropdown = itemCell.querySelector('.autocomplete-dropdown');
            if (dropdown && !itemCell.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });

    const reloadTableData = async () => {
        try {
            const response = await fetch('http://localhost:3000/last-10-purchase-records');
            const records = await response.json();
            if (response.ok && records.length > 0) {
                let allRowsHtml = '';
                records.forEach(record => {
                    allRowsHtml += populateRowWithData(record, false); // Fetch initial records as uneditable
                });
                actionsTableBody.innerHTML = allRowsHtml;

                // Attach event listeners to all newly rendered rows
                document.querySelectorAll('#actions-table tbody tr').forEach(rowElement => {
                    attachRowEventListeners(rowElement);
                });
            } else {
                // If no records, add one empty editable row
                const newRowHtml = createNewRowHTML();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = `<table><tbody>${newRowHtml}</tbody></table>`; // Wrap in table and tbody to ensure tr is parsed correctly
                const newRowElement = tempDiv.querySelector('tr');
                if (newRowElement) {
                    actionsTableBody.appendChild(newRowElement);
                    attachRowEventListeners(newRowElement);
                }
            }
        } catch (error) {
            console.error('Error fetching initial records:', error);
            // Even on error, provide one editable row
            const newRowHtml = createNewRowHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `<table><tbody>${newRowHtml}</tbody></table>`; // Wrap in table and tbody
            const newRowElement = tempDiv.querySelector('tr');
            if (newRowElement) {
                actionsTableBody.appendChild(newRowElement);
                attachRowEventListeners(newRowElement);
            }
        }
    };

    reloadTableData();

    addRowBtn.addEventListener('click', () => {
        const newRowHtml = createNewRowHTML();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `<table><tbody>${newRowHtml}</tbody></table>`; // Wrap in table and tbody
        const newRowElement = tempDiv.querySelector('tr');
        if (newRowElement) {
            actionsTableBody.prepend(newRowElement);
            attachRowEventListeners(newRowElement);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault(); // Prevent browser default (e.g., opening a new tab)
            const newRowHtml = createNewRowHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `<table><tbody>${newRowHtml}</tbody></table>`; // Wrap in table and tbody
            const newRowElement = tempDiv.querySelector('tr');
            if (newRowElement) {
                actionsTableBody.prepend(newRowElement);
                attachRowEventListeners(newRowElement);
            }
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
                // Refresh the table to reflect changes from sync
                reloadTableData(); 
            } else {
                showNotification(`Error syncing logs: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Client-side error during log sync:', error);
            showNotification('An unexpected error occurred during log sync.', 'error');
        }
    });
});


// --- Ethiopian Calendar Helper Functions (Unchanged) ---
function isGregorianLeap(year) { return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0); }
function gcToEc(gYear, gMonth, gDay) {
  let eYear = (gMonth < 9 || (gMonth === 9 && gDay < 11)) ? gYear - 8 : gYear - 7;
  let newYearDay = isGregorianLeap(gYear - 1) ? 12 : 11;
  let gDate = new Date(gYear, gMonth - 1, gDay);
  let ethNewYear = new Date(gYear, 8, newYearDay);
  let daysDiff = Math.floor((gDate - ethNewYear) / (1000 * 60 * 60 * 24));
  let eMonth, eDay;
  if (daysDiff >= 0) {
    eMonth = Math.floor(daysDiff / 30) + 1;
    eDay = (daysDiff % 30) + 1;
  } else {
    let prevNewYearDay = isGregorianLeap(gYear - 2) ? 12 : 11;
    let prevEthNewYear = new Date(gYear - 1, 8, prevNewYearDay);
    daysDiff = Math.floor((gDate - prevEthNewYear) / (1000 * 60 * 60 * 24));
    eMonth = Math.floor(daysDiff / 30) + 1;
    eDay = (daysDiff % 30) + 1;
  }
  return { year: eYear, month: eMonth, day: eDay };
}
function checkEthiopianMonthValidation(gregorianDateString) {
  if (!gregorianDateString) return true;
  const today = new Date();
  const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const selectedDate = new Date(gregorianDateString);
  const selectedEC = gcToEc(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate());
  if (selectedEC.year < currentEC.year) return false;
  if (selectedEC.year === currentEC.year && selectedEC.month < currentEC.month) return false;
  return true;
}