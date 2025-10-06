document.addEventListener('DOMContentLoaded', () => {
    // Main action buttons
    const addRowBtn = document.getElementById('add-row-btn');
    const syncLogsBtn = document.getElementById('sync-logs-btn');
    const mainActionButtons = document.getElementById('main-action-buttons');

    // Table elements
    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');
    const summaryVatExclude = document.getElementById('summary-vat-exclude');

    // View Posted feature elements
    const viewPostedBtn = document.getElementById('view-posted-btn');
    const postedDateControls = document.getElementById('posted-date-controls');
    const postedDatePicker = document.getElementById('posted-date-picker');
    const loadPostedBtn = document.getElementById('load-posted-btn');
    const backToWorkspaceBtn = document.getElementById('back-to-workspace-btn');

    const setupCalculationListeners = (targetRow) => {
        const isSub = targetRow.classList.contains('sub-row');
        const qtyInput = targetRow.querySelector(isSub ? '.sub-quantity' : '.quantity-input');
        const priceInput = targetRow.querySelector(isSub ? '.sub-unit-price' : '.unit-price-input');
        const vatPctInput = targetRow.querySelector(isSub ? '.sub-vat-percentage' : '.vat-percentage-input');
        const vatOnInput = targetRow.querySelector(isSub ? '.sub-vat-onoff' : '.vat-onoff-input');
        
        [qtyInput, priceInput, vatPctInput, vatOnInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => calculateRowTotals(targetRow));
                input.addEventListener('change', () => calculateRowTotals(targetRow));
            }
        });
    };

    const populateRowWithData = (data, isEditable = true) => {
        const vatOnChecked = data.purchase_id ? (data.vat_percentage > 0) : true;

        const disabledAttr = isEditable ? '' : 'disabled';
        const disabledClass = isEditable ? '' : 'disabled-input';
        const tinNumber = data.tin_number || '';
        let mrcOptions = '';
        if (data.mrc_number) {
            mrcOptions = `<option value="${data.mrc_number}">${data.mrc_number}</option>`;
        } else {
            mrcOptions = `<option value="N/A">N/A</option>`;
        }

        const quantity = data.quantity || 0;
        const unitPrice = data.unit_price || 0;
        const vatPercentage = data.vat_percentage !== undefined ? data.vat_percentage : 15;
        const baseTotal = quantity * unitPrice;
        const calculatedVatAmount = vatOnChecked ? (baseTotal * (vatPercentage / 100)) : 0;
        const subtotal = baseTotal + calculatedVatAmount;

        return `
            <tr data-purchase-id="${data.purchase_id || ''}" class="main-row">
                <td class="sticky-col action-cell">
                    ${isEditable ? `
                        <button class="save-row-btn btn btn-icon" title="Save"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
                        <button class="delete-row-btn btn btn-icon btn-danger" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    ` : `
                        <span style="color: var(--text-muted);">Posted</span>
                    `}
                </td>
                <td><input type="text" class="vendor-name-input input ${disabledClass}" data-vendor-id="${data.vendor_id || ''}" value="${data.vendor_name || ''}" ${disabledAttr}></td>
                <td><select class="mrc-no-input ${disabledClass}" ${disabledAttr}>${mrcOptions}</select></td>
                <td><input type="text" class="tin-no-input input ${disabledClass}" value="${tinNumber}" ${disabledAttr}></td>
                <td><input type="date" class="purchase-date-input input ${disabledClass}" value="${data.purchase_date ? data.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]}" ${disabledAttr}></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="text" class="fs-number-input input ${disabledClass}" value="${data.fs_number || ''}" ${disabledAttr}>
                        <button class="add-items-btn btn btn-icon" title="Add Sub-Item" style="padding: 4px; min-width: 24px; height: 24px;" ${disabledAttr}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
                    </div>
                </td>
                <td><input type="text" class="item-name-input input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr}></td>
                <td><input type="text" class="unit-input input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="quantity-input input is-numeric ${disabledClass}" value="${quantity}" min="0" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="unit-price-input input is-numeric ${disabledClass}" value="${unitPrice.toFixed(2)}" min="0" step="0.01" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="vat-percentage-input input is-numeric ${disabledClass}" value="${vatPercentage}" min="0" step="0.01" ${disabledAttr}></td>
                <td class="is-center"><input type="checkbox" class="vat-onoff-input checkbox ${disabledClass}" ${vatOnChecked ? 'checked' : ''} ${disabledAttr}></td>
                <td class="base-total-display is-numeric">${baseTotal.toFixed(2)}</td>
                <td class="total-vat-display is-numeric">${calculatedVatAmount.toFixed(2)}</td>
                <td class="subtotal-display is-numeric"><strong>${subtotal.toFixed(2)}</strong></td>
            </tr>
        `;
    };

    const createNewRowHTML = () => populateRowWithData({}, true);

    const isDateInCurrentEthiopianMonth = (gregorianDateString) => {
        if (!gregorianDateString) return false;
        const today = new Date();
        const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
        
        const selectedDate = new Date(gregorianDateString);
        const selectedEC = gcToEc(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate());

        return selectedEC.year === currentEC.year && selectedEC.month === currentEC.month;
    };

    const calculateRowTotals = (rowElement) => {
        const isSubRow = rowElement.classList.contains('sub-row');
        
        let mainRow = isSubRow ? rowElement.previousElementSibling : rowElement;
        while(mainRow && !mainRow.classList.contains('main-row')){
            mainRow = mainRow.previousElementSibling;
        }
        const dateInput = mainRow?.querySelector('.purchase-date-input');
        const isDateValid = isDateInCurrentEthiopianMonth(dateInput?.value);

        const quantity = parseFloat(rowElement.querySelector(isSubRow ? '.sub-quantity' : '.quantity-input')?.value) || 0;
        const unitPrice = parseFloat(rowElement.querySelector(isSubRow ? '.sub-unit-price' : '.unit-price-input')?.value) || 0;
        const vatPercentage = parseFloat(rowElement.querySelector(isSubRow ? '.sub-vat-percentage' : '.vat-percentage-input')?.value) || 0;
        const vatOn = rowElement.querySelector(isSubRow ? '.sub-vat-onoff' : '.vat-onoff-input')?.checked;
        
        let baseTotal = quantity * unitPrice;
        let totalVat = 0;
        if (vatOn) {
            const vatAmount = baseTotal * (vatPercentage / 100);
            if (!isDateValid) {
                baseTotal += vatAmount;
                totalVat = 0;
            } else {
                totalVat = vatAmount;
            }
        }

        const subtotal = baseTotal + totalVat;

        const baseTotalDisplay = rowElement.querySelector(isSubRow ? '.sub-base-total-display' : '.base-total-display');
        const totalVatDisplay = rowElement.querySelector(isSubRow ? '.sub-vat-total-display' : '.total-vat-display');
        const subtotalDisplay = rowElement.querySelector('.subtotal-display');
        
        if (baseTotalDisplay) baseTotalDisplay.textContent = baseTotal.toFixed(2);
        if (totalVatDisplay) totalVatDisplay.textContent = totalVat.toFixed(2);
        if (subtotalDisplay) subtotalDisplay.innerHTML = `<strong>${subtotal.toFixed(2)}</strong>`;
        
        updateSummaryTotals();
    };
    
    const updateSummaryTotals = () => {
        let totalBaseAmount = 0;
        let totalVatAmount = 0;
        document.querySelectorAll('#actions-table tbody tr').forEach(row => {
            const baseDisplay = row.querySelector('.base-total-display, .sub-base-total-display');
            const vatDisplay = row.querySelector('.total-vat-display, .sub-vat-total-display');
            totalBaseAmount += parseFloat(baseDisplay?.textContent) || 0;
            totalVatAmount += parseFloat(vatDisplay?.textContent) || 0;
        });
        const finalSubtotal = totalBaseAmount + totalVatAmount;
        summaryVatExclude.textContent = totalBaseAmount.toFixed(2);
        summaryTotalVat.textContent = totalVatAmount.toFixed(2);
        summarySubtotal.innerHTML = `<strong>${finalSubtotal.toFixed(2)}</strong>`;
    };

    const attachRowEventListeners = (rowElement, isEditable = true) => {
        if (isEditable) {
            setupCalculationListeners(rowElement);
            
            if (rowElement.classList.contains('main-row')) {
                const dateInput = rowElement.querySelector('.purchase-date-input');
                dateInput?.addEventListener('input', () => {
                    const isValid = isDateInCurrentEthiopianMonth(dateInput.value);
                    dateInput.classList.toggle('date-invalid', !isValid);
                    
                    calculateRowTotals(rowElement);
                    let nextRow = rowElement.nextElementSibling;
                    while(nextRow && nextRow.classList.contains('sub-row')) {
                        calculateRowTotals(nextRow);
                        nextRow = nextRow.nextElementSibling;
                    }
                });
                dateInput.dispatchEvent(new Event('input'));
            }
        }

        const additemBtn = rowElement.querySelector('.add-items-btn');
       
        function populateSubitemRow(parentRow, data = {}, isSubEditable = true) {
            const subRow = document.createElement('tr');
            subRow.classList.add('sub-row');
            const quantity = data.quantity || 0;
            const unitPrice = data.unit_price || 0;
            const vatPercentage = data.vat_percentage !== undefined ? data.vat_percentage : 15;
            const vatOn = data.purchase_id ? (data.vat_amount > 0 || data.vatOn) : true;
            
            const baseTotal = quantity * unitPrice;
            const totalVat = vatOn ? baseTotal * (vatPercentage / 100) : 0;
            const subtotal = baseTotal + totalVat;
            
            const disabledAttr = isSubEditable ? '' : 'disabled';
            const disabledClass = isSubEditable ? '' : 'disabled-input';

            // *** FIX START: Corrected the number of empty <td> placeholders ***
            subRow.innerHTML = `
                <td class="sticky-col sub-row-actions is-center">
                    ${isSubEditable ? `<button class="remove-sub-row btn btn-icon btn-danger" title="Remove Item"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
                </td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td><input type="text" placeholder="Sub-item name..." class="sub-item-name input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr} /></td>
                <td><input type="text" placeholder="Unit" class="sub-unit input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr} /></td>
                <td class="is-numeric"><input type="number" placeholder="0" class="sub-quantity input is-numeric ${disabledClass}" min="0" value="${quantity}" ${disabledAttr} /></td>
                <td class="is-numeric"><input type="number" placeholder="0.00" class="sub-unit-price input is-numeric ${disabledClass}" min="0" step="0.01" value="${unitPrice.toFixed(2)}" ${disabledAttr} /></td>
                <td class="is-numeric"><input type="number" placeholder="15" class="sub-vat-percentage input is-numeric ${disabledClass}" min="0" step="0.01" value="${vatPercentage}" ${disabledAttr} /></td>
                <td class="is-center"><input type="checkbox" class="sub-vat-onoff checkbox ${disabledClass}" ${vatOn ? 'checked' : ''} ${disabledAttr} /></td>
                <td class="is-numeric sub-base-total-display">${baseTotal.toFixed(2)}</td>
                <td class="is-numeric sub-vat-total-display">${totalVat.toFixed(2)}</td>
                <td class="is-numeric subtotal-display"><strong>${subtotal.toFixed(2)}</strong></td>
            `;
            // *** FIX END ***

            let lastSubRow = parentRow;
            let nextSibling = parentRow.nextElementSibling;
            while(nextSibling && nextSibling.classList.contains('sub-row')) {
                lastSubRow = nextSibling;
                nextSibling = nextSibling.nextElementSibling;
            }

            lastSubRow.insertAdjacentElement('afterend', subRow);
            
            if (isSubEditable) {
                setupCalculationListeners(subRow);
                
                const removeBtn = subRow.querySelector('.remove-sub-row');
                removeBtn.addEventListener('click', () => {
                    subRow.remove();
                    updateSummaryTotals();
                });

                const subItemInput = subRow.querySelector('.sub-item-name');
                const itemCell = subItemInput.parentElement;
                const subAutocompleteDropdown = document.createElement('div');
                subAutocompleteDropdown.classList.add('autocomplete-dropdown');
                itemCell?.appendChild(subAutocompleteDropdown);
                let subItemTimeout = null;

                subItemInput.addEventListener('input', (e) => {
                    clearTimeout(subItemTimeout);
                    const searchTerm = e.target.value;
                    if (searchTerm.length < 2) {
                        subAutocompleteDropdown.style.display = 'none';
                        return;
                    }
                    subItemTimeout = setTimeout(async () => {
                        try {
                            const response = await fetch(`http://localhost:3000/search-items?query=${searchTerm}`);
                            const items = await response.json();
                            subAutocompleteDropdown.innerHTML = '';
                            if (items.length > 0) {
                                items.forEach(item => {
                                    const suggestionItem = document.createElement('div');
                                    suggestionItem.classList.add('autocomplete-item');
                                    suggestionItem.textContent = item.item_name;
                                    suggestionItem.addEventListener('click', () => {
                                        subItemInput.value = item.item_name;
                                        subItemInput.setAttribute('data-item-id', item.item_id);
                                        subRow.querySelector('.sub-unit-price').value = item.unit_price ? item.unit_price.toFixed(2) : '0.00';
                                        subAutocompleteDropdown.style.display = 'none';
                                        calculateRowTotals(subRow);
                                    });
                                    subAutocompleteDropdown.appendChild(suggestionItem);
                                });
                                subAutocompleteDropdown.style.display = 'block';
                            } else {
                                subAutocompleteDropdown.style.display = 'none';
                            }
                        } catch (err) { console.error("Item search failed:", err); }
                    }, 300);
                });
            }
            calculateRowTotals(subRow);
            return subRow;
        }

        window.populateSubitemRow = populateSubitemRow;

        additemBtn?.addEventListener('click', () => {
            populateSubitemRow(rowElement, {}, true);
        });
    
        if (isEditable) {
            const deleteButton = rowElement.querySelector('.delete-row-btn');
            const saveButton = rowElement.querySelector('.save-row-btn');
            
            deleteButton?.addEventListener('click', async () => {
                const purchase_id = rowElement.getAttribute('data-purchase-id');
                if (confirm('Are you sure you want to delete this record and all its sub-items?')) {
                     const subRowsToDelete = [];
                     let nextRow = rowElement.nextElementSibling;
                     while (nextRow && nextRow.classList.contains('sub-row')) {
                        const subPurchaseId = nextRow.getAttribute('data-purchase-id');
                        if(subPurchaseId) subRowsToDelete.push(subPurchaseId);
                        nextRow = nextRow.nextElementSibling;
                     }

                    if (!purchase_id) {
                        rowElement.remove();
                        let next;
                        while ((next = rowElement.nextElementSibling) && next.classList.contains('sub-row')) {
                            next.remove();
                        }
                        updateSummaryTotals();
                        return;
                    }

                    try {
                        const allIdsToDelete = [purchase_id, ...subRowsToDelete];
                        const response = await fetch(`http://localhost:3000/purchase-records`, { 
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ purchase_ids: allIdsToDelete })
                        });
                        if (response.ok) {
                            rowElement.remove();
                             let next;
                             while ((next = rowElement.nextElementSibling) && next.classList.contains('sub-row')) {
                                 next.remove();
                             }
                            updateSummaryTotals();
                            showNotification('Record(s) deleted successfully.', 'success');
                        } else {
                            const result = await response.json();
                            showNotification(`Error: ${result.message}`, 'error');
                        }
                    } catch (error) {
                        showNotification('An error occurred while deleting.', 'error');
                    }
                }
            });
            
            saveButton?.addEventListener('click', () => saveSingleRow(rowElement));

            const vendorNameInput = rowElement.querySelector('.vendor-name-input');
            if(vendorNameInput) {
                const tinNoInput = rowElement.querySelector('.tin-no-input');
                const mrcNoInput = rowElement.querySelector('.mrc-no-input');
                const vendorNameCell = vendorNameInput.parentElement;
                const autocompleteDropdown = document.createElement('div');
                autocompleteDropdown.classList.add('autocomplete-dropdown');
                vendorNameCell?.appendChild(autocompleteDropdown);
                let timeout = null;
                vendorNameInput.addEventListener('input', (e) => {
                    clearTimeout(timeout);
                    const searchTerm = e.target.value;
                    if (searchTerm.length < 2) {
                        autocompleteDropdown.style.display = 'none';
                        return;
                    }
                    timeout = setTimeout(async () => {
                        try {
                            const response = await fetch(`http://localhost:3000/search-vendors?query=${searchTerm}`);
                            const vendors = await response.json();
                            autocompleteDropdown.innerHTML = '';
                            if (vendors.length > 0) {
                                vendors.forEach(vendor => {
                                    const item = document.createElement('div');
                                    item.classList.add('autocomplete-item');
                                    item.textContent = vendor.vendor_name;
                                    item.addEventListener('click', () => {
                                        vendorNameInput.value = vendor.vendor_name;
                                        tinNoInput.value = vendor.tin_number;
                                        vendorNameInput.setAttribute('data-vendor-id', vendor.vendor_id);
                                        mrcNoInput.innerHTML = vendor.mrc_numbers?.map(mrc => `<option value="${mrc}">${mrc}</option>`).join('') || '<option value="N/A">N/A</option>';
                                        autocompleteDropdown.style.display = 'none';
                                    });
                                    autocompleteDropdown.appendChild(item);
                                });
                                autocompleteDropdown.style.display = 'block';
                            } else {
                                autocompleteDropdown.style.display = 'none';
                            }
                        } catch (err) { console.error("Vendor search failed:", err); }
                    }, 300);
                });
            }
            
            const itemNameInput = rowElement.querySelector('.item-name-input');
            if(itemNameInput) {
                const unitPriceInput = rowElement.querySelector('.unit-price-input');
                const itemNameCell = itemNameInput.parentElement;
                const itemAutocompleteDropdown = document.createElement('div');
                itemAutocompleteDropdown.classList.add('autocomplete-dropdown');
                itemNameCell?.appendChild(itemAutocompleteDropdown);
                let itemTimeout = null;
                itemNameInput.addEventListener('input', (e) => {
                    clearTimeout(itemTimeout);
                    const searchTerm = e.target.value;
                    if (searchTerm.length < 2) {
                        itemAutocompleteDropdown.style.display = 'none';
                        return;
                    }
                    itemTimeout = setTimeout(async () => {
                        try {
                            const response = await fetch(`http://localhost:3000/search-items?query=${searchTerm}`);
                            const items = await response.json();
                            itemAutocompleteDropdown.innerHTML = '';
                            if (items.length > 0) {
                                items.forEach(item => {
                                    const suggestion = document.createElement('div');
                                    suggestion.classList.add('autocomplete-item');
                                    suggestion.textContent = item.item_name;
                                    suggestion.addEventListener('click', () => {
                                        itemNameInput.value = item.item_name;
                                        unitPriceInput.value = item.unit_price ? item.unit_price.toFixed(2) : '0.00';
                                        itemNameInput.setAttribute('data-item-id', item.item_id);
                                        itemAutocompleteDropdown.style.display = 'none';
                                        calculateRowTotals(rowElement);
                                    });
                                    itemAutocompleteDropdown.appendChild(suggestion);
                                });
                                itemAutocompleteDropdown.style.display = 'block';
                            } else {
                                itemAutocompleteDropdown.style.display = 'none';
                            }
                        } catch (err) { console.error("Item search failed:", err); }
                    }, 300);
                });
            }
        }
        
        calculateRowTotals(rowElement);
    };

    const saveSingleRow = async (rowElement) => {
        const vendorNameInput = rowElement.querySelector('.vendor-name-input');
        const vendorId = vendorNameInput?.getAttribute('data-vendor-id');
        const vendorName = vendorNameInput?.value;
        const mrcNo = rowElement.querySelector('.mrc-no-input')?.value;
        const tinNo = rowElement.querySelector('.tin-no-input')?.value;
        const purchaseDate = rowElement.querySelector('.purchase-date-input')?.value;
        const fsNumber = rowElement.querySelector('.fs-number-input')?.value;
        const status = 'saved';

        const extractRecord = (row, isSub = false) => {
            const isDateValid = isDateInCurrentEthiopianMonth(purchaseDate);
            const quantity = parseFloat(row.querySelector(isSub ? '.sub-quantity' : '.quantity-input')?.value) || 0;
            const unitPrice = parseFloat(row.querySelector(isSub ? '.sub-unit-price' : '.unit-price-input')?.value) || 0;
            const vatOn = row.querySelector(isSub ? '.sub-vat-onoff' : '.vat-onoff-input')?.checked;
            
            const originalVatPercentage = parseFloat(row.querySelector(isSub ? '.sub-vat-percentage' : '.vat-percentage-input')?.value) || 0;
            const vatPercentageToSave = vatOn ? originalVatPercentage : 0;

            let base_total = quantity * unitPrice;
            let vat_amount = 0;

            if (vatOn) {
                const calculated_vat = base_total * (originalVatPercentage / 100);
                if (!isDateValid) {
                    base_total += calculated_vat;
                } else {
                    vat_amount = calculated_vat;
                }
            }

            const total_amount = base_total + vat_amount;
            const commonData = { vendorId, vendorName, mrcNo, tinNo, purchaseDate, fsNumber, status, base_total, vat_amount, total_amount };
            
            if (isSub) {
                const itemNameInput = row.querySelector('.sub-item-name');
                return {
                    ...commonData,
                    purchaseId: row.getAttribute('data-purchase-id'),
                    itemId: itemNameInput?.getAttribute('data-item-id'),
                    itemName: itemNameInput?.value,
                    unit: row.querySelector('.sub-unit')?.value,
                    quantity, unitPrice, vatPercentage: vatPercentageToSave, vatOn,
                };
            } else {
                const itemNameInput = row.querySelector('.item-name-input');
                return {
                    ...commonData,
                    purchaseId: row.getAttribute('data-purchase-id'),
                    itemId: itemNameInput?.getAttribute('data-item-id'),
                    itemName: itemNameInput?.value,
                    unit: row.querySelector('.unit-input')?.value,
                    quantity, unitPrice, vatPercentage: vatPercentageToSave, vatOn,
                };
            }
        };
    
        const recordsToSave = [];
        const mainRecord = extractRecord(rowElement, false);
        if (mainRecord.itemName) {
            recordsToSave.push(mainRecord);
        }
    
        let nextRow = rowElement.nextElementSibling;
        while (nextRow && nextRow.classList.contains('sub-row')) {
            const subRecord = extractRecord(nextRow, true);
            if (subRecord.itemName) {
                recordsToSave.push(subRecord);
            }
            nextRow = nextRow.nextElementSibling;
        }
    
        if (recordsToSave.length === 0) {
            showNotification('Cannot save an empty row. Please add at least one item.', 'warning');
            return false;
        }
    
        for (const record of recordsToSave) {
            if (!record.vendorName || !record.itemName || !record.purchaseDate || record.quantity <= 0 || !record.vendorId || !record.itemId) {
                showNotification(`Validation failed for "${record.itemName}". Please fill all required fields, select a vendor/item from suggestions, and ensure quantity is positive.`, 'error');
                return false;
            }
        }
    
        try {
            const response = await fetch('http://localhost:3000/save-purchase-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recordsToSave)
            });
            const result = await response.json();
            if (response.ok) {
                showNotification(result.message, 'success');
                reloadTableData(); 
            } else {
                showNotification(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            showNotification('An error occurred while saving.', 'error');
            console.error("Save error:", error);
        }
    };
    
    addRowBtn.addEventListener('click', () => {
        actionsTableBody.insertAdjacentHTML('afterbegin', createNewRowHTML());
        const newRowElement = actionsTableBody.firstElementChild;
        if (newRowElement) {
            attachRowEventListeners(newRowElement, true);
            newRowElement.querySelector('input')?.focus();
        }
    });
    syncLogsBtn.addEventListener('click', async () => {
    try {
        // Debug: Log the table element
        const table = document.querySelector('#actions-table');
        console.log('Table element:', table);

        if (!table) {
            showNotification("Actions table not found in DOM.", "error");
            return;
        }

        const tbody = table.querySelector('tbody');
        console.log('Tbody element:', tbody);

        if (!tbody) {
            showNotification("Table body not found.", "error");
            return;
        }

        const rows = document.querySelectorAll('#actions-table tbody tr[data-purchase-id]');
        console.log('Matching rows found:', rows.length);
        console.log('All rows in tbody:', tbody.querySelectorAll('tr').length);

        // Log first few rows for inspection
        Array.from(rows).slice(0, 3).forEach((row, index) => {
            console.log(`Row ${index}:`, row.outerHTML);
        });

        const unpostedIds = Array.from(rows)
            .map(row => row.getAttribute('data-purchase-id'))
            .filter(id => id); 

        console.log('Extracted unpostedIds:', unpostedIds);

        let postingSuccess = false;
        if (unpostedIds.length > 0) {
            const postResponse = await fetch('http://localhost:3000/change-from-saved-to-posted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchase_ids: unpostedIds })
            });

            const postResult = await postResponse.json();

            if (!postResponse.ok) {
                showNotification(`Failed to mark as posted: ${postResult.error || postResult.message || "Unknown error"}`, "error");
                // Still continue to sync logs even if posting fails
            } else {
                showNotification("Records successfully marked as posted!", "success");
                postingSuccess = true;
            }
        } else {
            console.log('No unposted records to mark - skipping posting step');
            // Optionally show a neutral message: showNotification("No records to post. Proceeding with log sync.", "info");
        }

        // Always perform log sync, regardless of posting
        showNotification("Syncing logs with Telegram...", "info");

        const syncResponse = await fetch('http://localhost:3000/sync-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
            // No body required for /sync-logs endpoint
        });

        const syncResult = await syncResponse.json();

        if (!syncResponse.ok) {
            showNotification(`Log sync failed: ${syncResult.error || syncResult.details || "Unknown error"}`, "error");
            if (postingSuccess) reloadTableData();
            return;
        }

        showNotification(syncResult.message, "success");

        if (postingSuccess) {
            reloadTableData();
        }

    } catch (err) {
        showNotification("ERROR WHILE POSTING OR SYNCING LOGS. CHECK NETWORK", "error");
        console.error(err);
    }
});
    const reloadTableData = async () => {
        try {
            const response = await fetch('http://localhost:3000/saved-purchase-records');
            const records = await response.json();
            actionsTableBody.innerHTML = '';
            
            if (response.ok && records.length > 0) {
                const groupedByFsNumber = records.reduce((acc, record) => {
                    const key = record.fs_number || `no-fs-${record.purchase_id}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(record);
                    return acc;
                }, {});

                Object.values(groupedByFsNumber).forEach(group => {
                    const mainRecord = group[0];
                    actionsTableBody.insertAdjacentHTML('beforeend', populateRowWithData(mainRecord, true));
                    const mainRowElement = actionsTableBody.lastElementChild;
                    attachRowEventListeners(mainRowElement, true);

                    if (group.length > 1) {
                        group.slice(1).forEach(subRecord => {
                            const subRowElement = window.populateSubitemRow(mainRowElement, subRecord, true);
                            subRowElement.setAttribute('data-purchase-id', subRecord.purchase_id);
                        });
                    }
                });
            } else { 
                addRowBtn.click(); 
            }
            updateSummaryTotals();
        } catch (error) {
            console.error('Error fetching initial records:', error);
            addRowBtn.click();
        }
    };

    const loadPostedData = async (date) => {
        try {
            const response = await fetch(`http://localhost:3000/posted-purchase-records?date=${date}`);
            const records = await response.json();
            actionsTableBody.innerHTML = '';

            if (response.ok) {
                if (records.length > 0) {
                    const groupedByFsNumber = records.reduce((acc, record) => {
                        const key = record.fs_number || `no-fs-${record.purchase_id}`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(record);
                        return acc;
                    }, {});

                    Object.values(groupedByFsNumber).forEach(group => {
                        const mainRecord = group[0];
                        actionsTableBody.insertAdjacentHTML('beforeend', populateRowWithData(mainRecord, false));
                        const mainRowElement = actionsTableBody.lastElementChild;
                        attachRowEventListeners(mainRowElement, false);

                        if (group.length > 1) {
                            group.slice(1).forEach(subRecord => {
                                const subRowElement = window.populateSubitemRow(mainRowElement, subRecord, false);
                                subRowElement.setAttribute('data-purchase-id', subRecord.purchase_id);
                            });
                        }
                    });
                } else {
                    actionsTableBody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 1rem;">No records were posted on this date.</td></tr>`;
                }
            } else {
                throw new Error(records.error || 'Failed to fetch posted records.');
            }
            updateSummaryTotals();
        } catch (error) {
            console.error('Error fetching posted records:', error);
            showNotification(error.message, 'error');
        }
    };
    
    viewPostedBtn.addEventListener('click', () => {
        postedDateControls.style.display = 'flex';
        viewPostedBtn.style.display = 'none';
    });

    loadPostedBtn.addEventListener('click', () => {
        const selectedDate = postedDatePicker.value;
        if (!selectedDate) {
            showNotification('Please select a date to load posted records.', 'warning');
            return;
        }
        loadPostedData(selectedDate);
        mainActionButtons.style.display = 'none';
        postedDateControls.style.display = 'none';
        backToWorkspaceBtn.style.display = 'inline-block';
    });

    backToWorkspaceBtn.addEventListener('click', () => {
        reloadTableData();
        mainActionButtons.style.display = 'inline-flex';
        backToWorkspaceBtn.style.display = 'none';
        viewPostedBtn.style.display = 'inline-block';
        postedDateControls.style.display = 'none';
    });

    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');
    const closeButton = document.querySelector('.close-button');
    const showNotification = (message, type = 'info') => {
        notificationMessage.textContent = message;
        notificationModal.className = 'notification-modal';
        notificationModal.classList.add(`notification-${type}`);
        notificationModal.style.display = 'flex';
        if (type !== 'error' && type !== 'warning') {
            setTimeout(() => { notificationModal.style.display = 'none'; }, 3000);
        }
    };
    closeButton.addEventListener('click', () => { notificationModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === notificationModal) notificationModal.style.display = 'none'; });
    document.addEventListener('keydown', (e) => { if (e.key === "Escape") notificationModal.style.display = 'none'; });
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            if (!dropdown.parentElement.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });

    const ethiopianMonthDisplay = document.getElementById('ethiopian-month');
    if (ethiopianMonthDisplay) {
        const today = new Date();
        const currentEC = gcToEc(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const ethiopianMonths = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Ter", "Yekatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehase", "Pagume"];
        ethiopianMonthDisplay.textContent = `(${ethiopianMonths[currentEC.month - 1]} ${currentEC.year} E.C.)`;
    }

    document.addEventListener('keydown', (e) => {
        if (backToWorkspaceBtn.style.display === 'inline-block') return;

        const activeElement = document.activeElement;
        if (e.ctrlKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            addRowBtn.click();
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            const focusedRow = activeElement.closest('tr');
            if (focusedRow && actionsTableBody.contains(focusedRow)) {
                let mainRow = focusedRow.classList.contains('main-row') ? focusedRow : focusedRow.previousElementSibling;
                while(mainRow && !mainRow.classList.contains('main-row')) {
                    mainRow = mainRow.previousElementSibling;
                }
                if(mainRow) window.populateSubitemRow(mainRow);
            }
        }
        const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        if (!isArrowKey || !activeElement.matches('.input, .checkbox')) {
            return;
        }
        e.preventDefault();
        const currentCell = activeElement.closest('td');
        const currentRow = currentCell.closest('tr');
        const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
        let nextElement = null;
        if (e.key === 'ArrowUp') {
            const prevRow = currentRow.previousElementSibling;
            if (prevRow) {
                const targetCell = prevRow.children[cellIndex];
                nextElement = targetCell?.querySelector('.input, .checkbox');
            }
        } else if (e.key === 'ArrowDown') {
            const nextRow = currentRow.nextElementSibling;
            if (nextRow && nextRow.tagName === 'TR') {
                const targetCell = nextRow.children[cellIndex];
                nextElement = targetCell?.querySelector('.input, .checkbox');
            }
        } else if (e.key === 'ArrowLeft') {
            let prevCell = currentCell.previousElementSibling;
            while(prevCell) {
                nextElement = prevCell.querySelector('.input, .checkbox');
                if(nextElement) break;
                prevCell = prevCell.previousElementSibling;
            }
        } else if (e.key === 'ArrowRight') {
             let nextCell = currentCell.nextElementSibling;
            while(nextCell) {
                nextElement = nextCell.querySelector('.input, .checkbox');
                if(nextElement) break;
                nextCell = nextCell.nextElementSibling;
            }
        }
        if (nextElement) {
            nextElement.focus();
            if (nextElement.type === 'text' || nextElement.type === 'number') {
                nextElement.select();
            }
        }
    });

    if (postedDatePicker) {
        postedDatePicker.value = new Date().toISOString().split('T')[0];
    }
    
    reloadTableData();
});

function isGregorianLeap(year) { return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0); }
function gcToEc(gYear, gMonth, gDay) { let eYear = (gMonth < 9 || (gMonth === 9 && gDay < 11)) ? gYear - 8 : gYear - 7; let newYearDay = isGregorianLeap(gYear - 1) ? 12 : 11; let gDate = new Date(gYear, gMonth - 1, gDay); let ethNewYear = new Date(gYear, 8, newYearDay); let daysDiff = Math.floor((gDate - ethNewYear) / (1000 * 60 * 60 * 24)); let eMonth, eDay; if (daysDiff >= 0) { eMonth = Math.floor(daysDiff / 30) + 1; eDay = (daysDiff % 30) + 1; } else { let prevNewYearDay = isGregorianLeap(gYear - 2) ? 12 : 11; let prevEthNewYear = new Date(gYear - 1, 8, prevNewYearDay); daysDiff = Math.floor((gDate - prevEthNewYear) / (1000 * 60 * 60 * 24)); eMonth = Math.floor(daysDiff / 30) + 1; eDay = (daysDiff % 30) + 1; } return { year: eYear, month: eMonth, day: eDay }; }