document.addEventListener('DOMContentLoaded', () => {
    // Main action buttons
    // START: Real-time Sync Status Indicator Setup
    const setupSyncIndicator = () => {
        const indicatorHTML = `
            <div id="sync-status-indicator" class="sync-indicator-hidden">
                <div class="sync-spinner"></div>
                <span id="sync-message" class="sync-message"></span>
                <button id="close-sync-indicator" class="close-sync-indicator">&times;</button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', indicatorHTML);

        const indicatorCSS = `
            :root {
                --success-color: #28a745;
                --danger-color: #dc3545;
                --info-color-dark: #33374a;
            }
            #sync-status-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                padding: 12px 18px;
                border-radius: 8px;
                background-color: var(--info-color-dark);
                color: white;
                z-index: 10000;
                opacity: 0;
                transform: translateX(100%);
                transition: opacity 0.4s ease, transform 0.4s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 250px;
            }
            #sync-status-indicator.sync-indicator-visible {
                opacity: 1;
                transform: translateX(0);
            }
            .sync-spinner {
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #fff;
                width: 18px;
                height: 18px;
                animation: spin 1s linear infinite;
                margin-right: 12px;
                display: none;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            #sync-status-indicator.loading .sync-spinner {
                display: block;
            }
            #sync-status-indicator.success {
                background-color: var(--success-color);
            }
            #sync-status-indicator.error {
                background-color: var(--danger-color);
            }
            .close-sync-indicator {
                background: none;
                border: none;
                color: white;
                font-size: 22px;
                margin-left: 15px;
                cursor: pointer;
                line-height: 1;
                padding: 0;
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = indicatorCSS;
        document.head.appendChild(styleSheet);

        document.getElementById('close-sync-indicator').addEventListener('click', () => {
            document.getElementById('sync-status-indicator').classList.remove('sync-indicator-visible');
        });
    };

    setupSyncIndicator();

    const syncIndicator = document.getElementById('sync-status-indicator');
    const syncMessage = document.getElementById('sync-message');

    const showSyncStatus = (message, state = 'loading') => {
        syncMessage.textContent = message;
        syncIndicator.className = 'sync-indicator-visible';
        syncIndicator.classList.add(state);
    };

    const hideSyncStatus = () => {
        syncIndicator.classList.remove('sync-indicator-visible');
    };
    // END: Real-time Sync Status Indicator Setup
    const addRowBtn = document.getElementById('add-row-btn');
    const syncLogsBtn = document.getElementById('sync-logs-btn');
    const mainActionButtons = document.getElementById('main-action-buttons');

    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');
    const summaryVatExclude = document.getElementById('summary-vat-exclude');

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
        const mrcNumber = data.mrc_number || 'N/A'; // *** MODIFICATION: Default MRC value
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
                        <button class="save-row-btn btn btn-icon" title="Save (Ctrl+S)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
                        <button class="delete-row-btn btn btn-icon btn-danger" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    ` : `<span style="color: var(--text-muted);">Posted</span>`}
                </td>
                <td><input type="text" class="vendor-name-input input ${disabledClass}" data-vendor-id="${data.vendor_id || ''}" value="${data.vendor_name || ''}" ${disabledAttr}></td>
                <td><input type="text" class="mrc-no-input input ${disabledClass}" value="${mrcNumber}" readonly ${disabledAttr}></td>
                <td><input type="text" class="tin-no-input input ${disabledClass}" value="${tinNumber}" ${disabledAttr}></td>
                <td><input type="date" class="purchase-date-input input ${disabledClass}" value="${data.purchase_date ? data.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0]}" ${disabledAttr}></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="text" class="fs-number-input input ${disabledClass}" value="${data.fs_number || ''}" ${disabledAttr}>
                        <button class="add-items-btn btn btn-icon" title="Add Sub-Item (Ctrl+I)" style="padding: 4px; min-width: 24px; height: 24px;" ${disabledAttr}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
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
    const showConfirmationModal = (message) => {
    return new Promise(resolve => {
        // Create modal elements
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'confirmation-modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.id = 'confirmation-modal-content';
        
        modalContent.innerHTML = `
            <p id="confirmation-modal-message">${message}</p>
            <div id="confirmation-modal-buttons">
                <button id="cancel-btn">Cancel</button>
                <button id="confirm-btn">Delete</button>
            </div>
        `;

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        // Handlers to resolve the promise and remove the modal
        const handleConfirm = () => {
            document.body.removeChild(modalOverlay);
            resolve(true);
        };

        const handleCancel = () => {
            document.body.removeChild(modalOverlay);
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        // Optional: Allow closing with the Escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
};
    const isDateInCurrentEthiopianMonth = async (gregorianDateString) => {
        if (!gregorianDateString) return false;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            
            const [todayResponse, selectedDateResponse] = await Promise.all([
                fetch(`http://localhost:3000/convert-to-ethiopian?date=${todayStr}`),
                fetch(`http://localhost:3000/convert-to-ethiopian?date=${gregorianDateString}`)
            ]);

            if (!todayResponse.ok || !selectedDateResponse.ok) return false;

            const currentEC = await todayResponse.json();
            const selectedEC = await selectedDateResponse.json();

            return selectedEC.year === currentEC.year && selectedEC.month === currentEC.month;
        } catch (error) {
            console.error("Date validation fetch failed:", error);
            return false; // Fail safely
        }
    };

    const calculateRowTotals = async (rowElement) => {
        const isSubRow = rowElement.classList.contains('sub-row');
        
        let mainRow = isSubRow ? rowElement.previousElementSibling : rowElement;
        while(mainRow && !mainRow.classList.contains('main-row')){
            mainRow = mainRow.previousElementSibling;
        }
        const dateInput = mainRow?.querySelector('.purchase-date-input');
        
        // This is now an async operation
        const isDateValid = await isDateInCurrentEthiopianMonth(dateInput?.value);

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
                dateInput?.addEventListener('input', async () => {
                    const isValid = await isDateInCurrentEthiopianMonth(dateInput.value);
                    dateInput.classList.toggle('date-invalid', !isValid);
                    
                    // Recalculate for main row and all its sub-rows
                    await calculateRowTotals(rowElement);
                    let nextRow = rowElement.nextElementSibling;
                    while(nextRow && nextRow.classList.contains('sub-row')) {
                        await calculateRowTotals(nextRow);
                        nextRow = nextRow.nextElementSibling;
                    }
                });
                // Trigger initial validation and calculation
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

            subRow.innerHTML = `
                <td class="sticky-col sub-row-actions is-center">
                    ${isSubEditable ? `<button class="remove-sub-row btn btn-icon btn-danger" title="Remove Item"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
                </td>
                <td></td><td></td><td></td><td></td><td></td>
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
                setupAutocomplete(subItemInput, 'item', subRow);
                subItemInput.focus();
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
            
          // REPLACE the old deleteButton listener with this new one
deleteButton?.addEventListener('click', async () => {
    const isConfirmed = await showConfirmationModal('Are you sure you want to delete this record and all its sub-items?');

    if (isConfirmed) {
        const purchase_id = rowElement.getAttribute('data-purchase-id');
        const subRowsToDelete = [];
        let nextRow = rowElement.nextElementSibling;
        while (nextRow && nextRow.classList.contains('sub-row')) {
            const subPurchaseId = nextRow.getAttribute('data-purchase-id');
            if (subPurchaseId) subRowsToDelete.push(subPurchaseId);
            nextRow = nextRow.nextElementSibling;
        }

        // If there's no purchase_id, it's a new row that hasn't been saved.
        // Just remove it from the DOM.
        if (!purchase_id) {
            let next;
            while ((next = rowElement.nextElementSibling) && next.classList.contains('sub-row')) {
                next.remove();
            }
            rowElement.remove();
            updateSummaryTotals();
            return;
        }

        // If it has been saved, send a request to the server.
        try {
            const allIdsToDelete = [purchase_id, ...subRowsToDelete].filter(Boolean);
            const response = await fetch(`http://localhost:3000/purchase-records`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchase_ids: allIdsToDelete })
            });
            if (response.ok) {
                reloadTableData();
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

            setupAutocomplete(rowElement.querySelector('.vendor-name-input'), 'vendor', rowElement);
            setupAutocomplete(rowElement.querySelector('.item-name-input'), 'item', rowElement);
            setupMrcDropdown(rowElement.querySelector('.mrc-no-input'), rowElement); // *** MODIFICATION: Setup MRC dropdown
        }
        
        calculateRowTotals(rowElement);
    };

    const setupAutocomplete = (inputElement, type, rowElement) => {
        const cell = inputElement.parentElement;
        if (!cell) return;
        const dropdown = document.createElement('div');
        dropdown.classList.add('autocomplete-dropdown');
        cell.appendChild(dropdown);
        let timeout = null;
        let activeIndex = -1;

        const handleSelection = (selectedItem, moveFocus = false) => {
            dropdown.style.display = 'none';
            if (type === 'vendor') {
                inputElement.value = selectedItem.vendor_name;
                inputElement.setAttribute('data-vendor-id', selectedItem.vendor_id);
                rowElement.querySelector('.tin-no-input').value = selectedItem.tin_number || '';
                const mrcInput = rowElement.querySelector('.mrc-no-input');
                const mrcNumbers = selectedItem.mrc_numbers || [];
                mrcInput.dataset.mrcNumbers = JSON.stringify(mrcNumbers);
                mrcInput.value = mrcNumbers[0] || 'N/A';
                if (moveFocus) mrcInput.focus(); // Move focus to MRC input
            } else if (type === 'item') {
                const isSub = rowElement.classList.contains('sub-row');
                inputElement.value = selectedItem.item_name;
                inputElement.setAttribute('data-item-id', selectedItem.item_id);
                rowElement.querySelector(isSub ? '.sub-unit-price' : '.unit-price-input').value = selectedItem.unit_price ? selectedItem.unit_price.toFixed(2) : '0.00';
                calculateRowTotals(rowElement);
                if (moveFocus) rowElement.querySelector(isSub ? '.sub-unit-input' : '.unit-input')?.focus();
            }
        };
        
        inputElement.addEventListener('keydown', (e) => {
            if (dropdown.style.display !== 'block') return;
            const items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % items.length;
                else if (e.key === 'ArrowUp') activeIndex = (activeIndex - 1 + items.length) % items.length;
                else if (e.key === 'Enter') {
                    if (activeIndex > -1) items[activeIndex].click();
                    return;
                }
                items.forEach((item, index) => item.classList.toggle('highlighted', index === activeIndex));
            }
        });

        inputElement.addEventListener('input', (e) => {
            clearTimeout(timeout);
            activeIndex = -1;
            const searchTerm = e.target.value;
            if (searchTerm.length < 2) {
                dropdown.style.display = 'none';
                return;
            }
            timeout = setTimeout(async () => {
                try {
                    const endpoint = type === 'vendor' ? 'search-vendors' : 'search-items';
                    const response = await fetch(`http://localhost:3000/${endpoint}?query=${searchTerm}`);
                    const results = await response.json();
                    dropdown.innerHTML = '';
                    if (results.length > 0) {
                        results.forEach(result => {
                            const item = document.createElement('div');
                            item.classList.add('autocomplete-item');
                            item.textContent = type === 'vendor' ? result.vendor_name : result.item_name;
                            item.addEventListener('click', () => handleSelection(result, true)); // Pass true to move focus
                            dropdown.appendChild(item);
                        });
                        dropdown.style.display = 'block';
                    } else {
                        dropdown.style.display = 'none';
                    }
                } catch (err) { console.error(`${type} search failed:`, err); }
            }, 300);
        });
    };

    const setupMrcDropdown = (mrcInput) => {
        const cell = mrcInput.parentElement;
        if (!cell) return;
        const dropdown = document.createElement('div');
        dropdown.classList.add('autocomplete-dropdown');
        cell.appendChild(dropdown);
        let activeIndex = -1;

        const showDropdown = () => {
            const mrcNumbers = JSON.parse(mrcInput.dataset.mrcNumbers || '[]');
            dropdown.innerHTML = '';
            if (mrcNumbers.length > 0) {
                mrcNumbers.forEach(mrc => {
                    const item = document.createElement('div');
                    item.classList.add('autocomplete-item');
                    item.textContent = mrc;
                    item.addEventListener('click', () => {
                        mrcInput.value = mrc;
                        dropdown.style.display = 'none';
                    });
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            }
        };

        mrcInput.addEventListener('focus', showDropdown);
        mrcInput.addEventListener('click', showDropdown);

        mrcInput.addEventListener('keydown', (e) => {
            if (dropdown.style.display !== 'block') return;
            const items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % items.length;
                else if (e.key === 'ArrowUp') activeIndex = (activeIndex - 1 + items.length) % items.length;
                else if (e.key === 'Enter') {
                    if (activeIndex > -1) items[activeIndex].click();
                    else dropdown.style.display = 'none';
                } else if (e.key === 'Escape') {
                    dropdown.style.display = 'none';
                }
                
                items.forEach((item, index) => item.classList.toggle('highlighted', index === activeIndex));
            }
        });
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
        const isDateValid = await isDateInCurrentEthiopianMonth(purchaseDate);

        const extractRecord = (row, isSub = false) => {
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
            
            const itemNameInput = row.querySelector(isSub ? '.sub-item-name' : '.item-name-input');
            return {
                ...commonData,
                purchaseId: row.getAttribute('data-purchase-id'),
                itemId: itemNameInput?.getAttribute('data-item-id'),
                itemName: itemNameInput?.value,
                unit: row.querySelector(isSub ? '.sub-unit' : '.unit-input')?.value,
                quantity, unitPrice, vatPercentage: vatPercentageToSave, vatOn,
            };
        };
    
        const recordsToSave = [];
        const mainRecord = extractRecord(rowElement, false);
        if (mainRecord.itemName) recordsToSave.push(mainRecord);
    
        let nextRow = rowElement.nextElementSibling;
        while (nextRow && nextRow.classList.contains('sub-row')) {
            const subRecord = extractRecord(nextRow, true);
            if (subRecord.itemName) recordsToSave.push(subRecord);
            nextRow = nextRow.nextElementSibling;
        }
    
        if (recordsToSave.length === 0) {
            showNotification('Cannot save an empty row. Please add at least one item.', 'warning'); return;
        }
    
        for (const record of recordsToSave) {
            if (!record.vendorName || !record.itemName || !record.purchaseDate || record.quantity <= 0 || !record.vendorId || !record.itemId) {
                showNotification(`Validation failed for "${record.itemName}". Fill all fields, select from suggestions, and ensure quantity is positive.`, 'error'); return;
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
            newRowElement.querySelector('input, select')?.focus();
        }
    });

   syncLogsBtn.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        showSyncStatus('Starting sync process...', 'loading');

        try {
            const rows = document.querySelectorAll('#actions-table tbody tr.main-row[data-purchase-id], #actions-table tbody tr.sub-row[data-purchase-id]');
            const unpostedIds = Array.from(rows).map(row => row.getAttribute('data-purchase-id')).filter(id => id);

            if (unpostedIds.length > 0) {
                showSyncStatus(`Posting ${unpostedIds.length} records...`, 'loading');
                const postResponse = await fetch('http://localhost:3000/change-from-saved-to-posted', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ purchase_ids: unpostedIds })
                });
                if (!postResponse.ok) {
                    const postResult = await postResponse.json();
                    showSyncStatus(`Failed to post: ${postResult.error || postResult.message}`, 'error'); return; 
                }
            } else {
                showNotification("No records to post. Proceeding with log sync.", "info");
            }

            showSyncStatus('Syncing activity logs...', 'loading');
            const syncResponse = await fetch('http://localhost:3000/sync-logs', { method: 'POST' });
            if (!syncResponse.ok) {
                const syncResult = await syncResponse.json();
                showSyncStatus(`Log sync failed: ${syncResult.error || syncResult.details}`, 'error'); return;
            }
            
            const syncResult = await syncResponse.json();
            showSyncStatus(syncResult.message, 'success');
            reloadTableData();
            setTimeout(hideSyncStatus, 5000);

        } catch (err) {
            showSyncStatus('A network error occurred. See console.', 'error');
            console.error("Sync/Post Error:", err);
        } finally {
            button.disabled = false;
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
        actionsTableBody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 2rem;">Loading...</td></tr>`;
        try {
            const response = await fetch(`http://localhost:3000/posted-purchase-records?date=${date}`);
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
                actionsTableBody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 2rem;">No records were posted on this date.</td></tr>`;
            }
            updateSummaryTotals();
        } catch (error) {
            console.error('Error fetching posted records:', error);
            showNotification(error.message, 'error');
            actionsTableBody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 2rem; color: var(--danger);">Failed to load records.</td></tr>`;
        }
    };
    
    viewPostedBtn.addEventListener('click', () => {
        postedDateControls.style.display = 'flex';
        viewPostedBtn.style.display = 'none';
        postedDatePicker.focus();
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
    
    const ethiopianMonthDisplay = document.getElementById('ethiopian-month');
    if (ethiopianMonthDisplay) {
        const todayStr = new Date().toISOString().split('T')[0];
        fetch(`http://localhost:3000/convert-to-ethiopian?date=${todayStr}`)
            .then(res => res.json())
            .then(currentEC => {
                const ethiopianMonths = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Ter", "Yekatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehase", "Pagume"];
                ethiopianMonthDisplay.textContent = `(${ethiopianMonths[currentEC.month - 1]} ${currentEC.year} E.C.)`;
            })
            .catch(err => {
                console.error("Failed to fetch Ethiopian month:", err);
                ethiopianMonthDisplay.textContent = "(Could not load E.C. date)";
            });
    }

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            if (!dropdown.parentElement.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        
        if (e.key === "Escape") notificationModal.style.display = 'none';
        if (!activeElement) return;

        if (backToWorkspaceBtn.style.display !== 'inline-block') {
             if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const focusedRow = activeElement.closest('tr.main-row');
                if (focusedRow) saveSingleRow(focusedRow);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 't') {
                e.preventDefault(); addRowBtn.click();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                const focusedRow = activeElement.closest('tr');
                if (focusedRow && actionsTableBody.contains(focusedRow)) {
                    let mainRow = focusedRow.classList.contains('main-row') ? focusedRow : focusedRow.closest('tr.main-row');
                    if(mainRow) window.populateSubitemRow(mainRow);
                }
            }
        }
        
        const isTableInput = activeElement.matches('.input, .checkbox');
        if (!isTableInput) return;

        const isDropdownOpen = activeElement.closest('td').querySelector('.autocomplete-dropdown')?.style.display === 'block';
        if (isDropdownOpen) return;
        
        const key = e.key;
        const currentCell = activeElement.closest('td');
        const currentRow = currentCell.closest('tr');

        if (key.startsWith('Arrow')) {
            e.preventDefault();
            const cellIndex = Array.from(currentRow.children).indexOf(currentCell);
            let nextElement = null;

            if (key === 'ArrowUp' || key === 'ArrowDown') {
                let targetRow = key === 'ArrowUp' ? currentRow.previousElementSibling : currentRow.nextElementSibling;
                if (targetRow) {
                    const targetCell = targetRow.children[cellIndex];
                    nextElement = targetCell?.querySelector('input:not([disabled]), .checkbox:not([disabled])');
                }
            } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
                let targetCell = key === 'ArrowLeft' ? currentCell.previousElementSibling : currentCell.nextElementSibling;
                while (targetCell) {
                    nextElement = targetCell.querySelector('input:not([disabled]), .checkbox:not([disabled])');
                    if (nextElement) break;
                    targetCell = key === 'ArrowLeft' ? targetCell.previousElementSibling : targetCell.nextElementSibling;
                }
            }

            if (nextElement) {
                nextElement.focus();
                if (nextElement.select) nextElement.select();
            }
        }

        if (key === 'Enter') {
            e.preventDefault();
            const focusable = Array.from(currentRow.querySelectorAll('input:not([disabled]), .checkbox:not([disabled])'));
            const currentIndex = focusable.indexOf(activeElement);
            const nextIndex = currentIndex + (e.shiftKey ? -1 : 1);

            if (nextIndex >= 0 && nextIndex < focusable.length) {
                const nextElement = focusable[nextIndex];
                nextElement.focus();
                if (nextElement.select) nextElement.select();
            } else if (!e.shiftKey && nextIndex >= focusable.length) {
                const nextRow = currentRow.nextElementSibling;
                if (nextRow) {
                    nextRow.querySelector('input:not([disabled]), .checkbox:not([disabled])')?.focus();
                } else {
                    addRowBtn.click();
                }
            }
        }

        if (key === 'Tab') {
            e.preventDefault();
            let targetRow = e.shiftKey ? currentRow.previousElementSibling : currentRow.nextElementSibling;
            while (targetRow && !targetRow.matches('tr')) {
                targetRow = e.shiftKey ? targetRow.previousElementSibling : targetRow.nextElementSibling;
            }

            if (targetRow) {
                const nextElement = targetRow.querySelector('input:not([disabled]), .checkbox:not([disabled])');
                if (nextElement) {
                    nextElement.focus();
                    if (nextElement.select) nextElement.select();
                }
            }
        }
    });

    if (postedDatePicker) postedDatePicker.value = new Date().toISOString().split('T')[0];
    
    reloadTableData();
});