document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    const EDIT_POSTED_CODE = "122119"; // Static 6-digit code for editing posted records

    const promptForEditCode = async () => {
        return new Promise(resolve => {
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'edit-code-modal-overlay';
            modalOverlay.innerHTML = `
                <div id="edit-code-modal-content">
                    <p>Enter 6-digit code to enable editing of posted records:</p>
                    <input type="password" id="edit-code-input" maxlength="6" autocomplete="off" />
                    <div id="edit-code-modal-buttons">
                        <button id="edit-code-cancel-btn">Cancel</button>
                        <button id="edit-code-submit-btn">Submit</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);

            const codeInput = document.getElementById('edit-code-input');
            const submitBtn = document.getElementById('edit-code-submit-btn');
            const cancelBtn = document.getElementById('edit-code-cancel-btn');

            const cleanup = () => {
                document.body.removeChild(modalOverlay);
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleSubmit = () => {
                const enteredCode = codeInput.value;
                cleanup();
                resolve(enteredCode === EDIT_POSTED_CODE);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            submitBtn.addEventListener('click', handleSubmit);
            cancelBtn.addEventListener('click', handleCancel);
            codeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });

            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            document.addEventListener('keydown', handleKeydown);

            codeInput.focus();
        });
    };
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

    let syncTimeout;
    const showSyncStatus = (message, state = 'loading', duration = 4000) => {
        clearTimeout(syncTimeout);
        syncMessage.textContent = message;
        syncIndicator.className = 'sync-indicator-visible'; // Reset classes
        syncIndicator.classList.add(state);

        // Don't auto-hide for loading state
        if (state === 'success' || state === 'error') {
            syncTimeout = setTimeout(() => {
                hideSyncStatus();
            }, duration);
        }
    };

    const hideSyncStatus = () => {
        clearTimeout(syncTimeout);
        syncIndicator.classList.remove('sync-indicator-visible');
    };
    // END: Real-time Sync Status Indicator Setup
    const addRowBtn = document.getElementById('add-row-btn');
    const syncLogsBtn = document.getElementById('sync-logs-btn');
    const mainActionButtons = document.getElementById('main-action-buttons');
    const postconfirm = document.getElementById('save-post')
    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');
    const summaryVatExclude = document.getElementById('summary-vat-exclude');
    const tablesContainer = document.getElementById('tablesContainer');
    const viewPostedBtn = document.getElementById('view-posted-btn');
    const postedDateControls = document.getElementById('posted-date-controls');
    const postedDatePicker = document.getElementById('posted-date-picker');
    const loadPostedBtn = document.getElementById('load-posted-btn');
    const backToWorkspaceBtn = document.getElementById('back-to-workspace-btn');
    const postdate = document.getElementById('post-prompt')
    const postdatepicker = document.getElementById('post-date')
    const postc = document.getElementById('postc')
    const overlay = document.getElementById('overlay')
    // --- VENDOR MODAL ELEMENTS ---
    const addVendorModal = document.getElementById('addVendorModal');
    const openAddVendorModalBtn = document.getElementById('open-add-vendor-modal-btn');
    const vendorForm = document.getElementById('addVendorForm');
    const mrcContainer = document.getElementById('mrcContainer');
    const addMrcBtn = document.getElementById('addMrcBtn');

    let isCurrentlyPostedView = false;
    const initialPurchaseIdsPerCard = new Map(); // Store purchase_ids loaded for each card

    // --- VENDOR MODAL LOGIC ---
    function openModal(modalElement) {
        modalElement.style.display = 'flex';
        vendorForm.reset();
        mrcContainer.innerHTML = '<div class="mrc-input-group"><input type="text" name="mrcNumbers[]" class="input"/></div>';
        modalElement.querySelector('#vendorModalTitle').textContent = 'Add New Vendor';
    }

    function closeModal(modalElement) {
        modalElement.style.display = 'none';
    }

    openAddVendorModalBtn?.addEventListener('click', () => openModal(addVendorModal));

    addVendorModal?.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(addVendorModal));
    });
    addVendorModal?.addEventListener('click', (e) => {
        if (e.target === addVendorModal) closeModal(addVendorModal);
    });

    addMrcBtn?.addEventListener('click', () => {
        const newMrcInput = document.createElement('div');
        newMrcInput.className = 'mrc-input-group';
        newMrcInput.innerHTML = `
          <input type="text" name="mrcNumbers[]" class="input" />
          <button type="button" class="btn btn-ghost btn-remove-mrc">&times;</button>
        `;
        mrcContainer.appendChild(newMrcInput);
    });
    
    mrcContainer?.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-mrc')) {
            e.target.parentElement.remove();
        }
    });

    vendorForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = {
            vendor_name: document.getElementById('vendorName').value,
            tin_number: document.getElementById('tinNumber').value,
            mrc_numbers: Array.from(document.querySelectorAll('input[name="mrcNumbers[]"]'))
                              .map(input => input.value.trim())
                              .filter(Boolean)
        };

        try {
            const response = await fetch('http://localhost:3000/addvendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showNotification(`Vendor added successfully!`);
                closeModal(addVendorModal);
            } else {
                showNotification(`Failed to add vendor.`);
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.');
        }
    });


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
        
        const fsNumber = data.fs_number || '';
        let fsPrefix = 'M';
        let fsNumberValue = fsNumber;

        if (fsNumber.startsWith('FS-')) {
            fsPrefix = 'FS';
            fsNumberValue = fsNumber.substring(3);
        } else if (fsNumber.startsWith('M-')) {
            fsPrefix = 'M';
            fsNumberValue = fsNumber.substring(2);
        } else if (fsNumber.startsWith('FS')) {
            fsPrefix = 'FS';
            fsNumberValue = fsNumber.substring(2);
        } else if (fsNumber.startsWith('M')) {
            fsPrefix = 'M';
            fsNumberValue = fsNumber.substring(1);
        } else if (mrcNumber && mrcNumber !== 'N/A') {
            fsPrefix = 'FS';
        }

        const quantity = parseFloat(data.quantity) || 0;
        const unitPrice = parseFloat(data.unit_price) || 0;
        const vatPercentage = (data.vat_percentage !== undefined && data.vat_percentage > 0) ? data.vat_percentage : 15;
        const baseTotal = quantity * unitPrice;
        const calculatedVatAmount = vatOnChecked ? (baseTotal * (vatPercentage / 100)) : 0;
        const subtotal = baseTotal + calculatedVatAmount;
        
        // Date handling fix to avoid timezone issues
        const purchaseDate = data.purchase_date ? data.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0];

        return `
            <tr data-purchase-id="${data.purchase_id || ''}" class="main-row">
                <td>
                    <input type="text" class="vendor-name-input input ${disabledClass}" data-vendor-id="${data.vendor_id || ''}" value="${data.vendor_name || ''}" data-tin-number="${tinNumber}" ${disabledAttr}>
                    <div class="tin-display">${tinNumber}</div>
                </td>
                <td><input type="text" class="mrc-no-input input ${disabledClass}" value="${mrcNumber}" readonly ${disabledAttr}></td>
                <td><input type="date" class="purchase-date-input input ${disabledClass}" value="${purchaseDate}" ${disabledAttr}></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <div class="fs-input-container">
                            <span class="fs-prefix">${fsPrefix}</span>
                            <input type="text" class="fs-number-input input ${disabledClass}" value="${fsNumberValue}" ${disabledAttr}>
                        </div>
                        <button class="add-items-btn btn btn-icon" title="Add Sub-Item (Ctrl+I)" style="padding: 4px; min-width: 24px; height: 24px;" ${disabledAttr}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
                    </div>
                </td>
                <td><input type="text" class="item-name-input input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr}></td>
                <td><input type="text" class="unit-input input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="quantity-input input is-numeric ${disabledClass}" value="${quantity}" min="0" ${disabledAttr}></td>
                <td class="is-numeric"><input type="number" class="unit-price-input input is-numeric ${disabledClass}" value="${unitPrice.toFixed(2)}" min="0" step="0.01" ${disabledAttr}></td>
                <td class="is-numeric vat-percentage-cell" style="display: none;"><input type="number" class="vat-percentage-input input is-numeric ${disabledClass}" value="${vatPercentage}" min="0" step="0.01" ${disabledAttr}></td>
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
        
        updateComponentSummary(rowElement.closest('.purchase-group-card'));
        updateSummaryTotals();
    };
    
    const updateComponentSummary = (cardElement) => {
        if (!cardElement) return;
        let componentBase = 0;
        let componentVat = 0;

        cardElement.querySelectorAll('tbody tr').forEach(row => {
            const baseDisplay = row.querySelector('.base-total-display, .sub-base-total-display');
            const vatDisplay = row.querySelector('.total-vat-display, .sub-vat-total-display');
            componentBase += parseFloat(baseDisplay?.textContent) || 0;
            componentVat += parseFloat(vatDisplay?.textContent) || 0;
        });

        const componentGrandTotal = componentBase + componentVat;
        const baseTotalEl = cardElement.querySelector('.component-base-total');
        const vatTotalEl = cardElement.querySelector('.component-vat-total');
        const grandTotalEl = cardElement.querySelector('.component-grand-total');

        if (baseTotalEl) baseTotalEl.textContent = componentBase.toFixed(2);
        if (vatTotalEl) vatTotalEl.textContent = componentVat.toFixed(2);
        if (grandTotalEl) grandTotalEl.textContent = componentGrandTotal.toFixed(2);
    };
    
    const updateSummaryTotals = () => {
        let totalBaseAmount = 0;
        let totalVatAmount = 0;
        // Query across all tables in the container
        document.querySelectorAll('#purchase-groups-container .table tbody tr').forEach(row => {
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

    const updateFsPrefix = (rowElement) => {
        const mrcInput = rowElement.querySelector('.mrc-no-input');
        const fsPrefixSpan = rowElement.querySelector('.fs-prefix');
        
        if (!mrcInput || !fsPrefixSpan) return;

        const hasMrc = mrcInput.value && mrcInput.value !== 'N/A';
        fsPrefixSpan.textContent = hasMrc ? 'FS' : 'M';
    };

    const attachRowEventListeners = (rowElement, isEditable = true) => {
        const card = rowElement.closest('.purchase-group-card');

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
            const quantity = parseFloat(data.quantity) || 0;
            const unitPrice = parseFloat(data.unit_price) || 0;
            const vatPercentage = (data.vat_percentage !== undefined && data.vat_percentage > 0) ? data.vat_percentage : 15;
            const vatOn = data.purchase_id ? (data.vat_amount > 0) : true;
            
            let baseTotal = quantity * unitPrice;
            let totalVat = 0;
            if (vatOn) {
                totalVat = baseTotal * (vatPercentage / 100);
            }
            const subtotal = baseTotal + totalVat;
            
            const disabledAttr = isSubEditable ? '' : 'disabled';
            const disabledClass = isSubEditable ? '' : 'disabled-input';

            subRow.innerHTML = `
                <td colspan="4"></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="text" placeholder="Sub-item name..." class="sub-item-name input ${disabledClass}" data-item-id="${data.item_id || ''}" value="${data.item_name || ''}" ${disabledAttr} />
                        ${isSubEditable ? `<button class="remove-sub-row btn btn-icon btn-danger" title="Remove Item" style="padding: 4px; min-width: 24px; height: 24px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
                    </div>
                </td>
                <td><input type="text" placeholder="Unit" class="sub-unit input ${disabledClass}" value="${data.unit || ''}" ${disabledAttr} /></td>
                <td class="is-numeric"><input type="number" placeholder="0" class="sub-quantity input is-numeric ${disabledClass}" min="0" value="${quantity}" ${disabledAttr} /></td>
                <td class="is-numeric"><input type="number" placeholder="0.00" class="sub-unit-price input is-numeric ${disabledClass}" min="0" step="0.01" value="${unitPrice.toFixed(2)}" ${disabledAttr} /></td>
                <td class="is-numeric vat-percentage-cell" style="display: none;"><input type="number" placeholder="15" class="sub-vat-percentage input is-numeric ${disabledClass}" min="0" step="0.01" value="${vatPercentage}" ${disabledAttr} /></td>
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
                    const card = subRow.closest('.purchase-group-card');
                    subRow.remove();
                    updateComponentSummary(card);
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
            const deleteButton = card.querySelector('.delete-row-btn');
            const saveButton = card.querySelector('.save-row-btn');
            
            deleteButton?.addEventListener('click', async () => {
                const card = rowElement.closest('.purchase-group-card');
                const isConfirmed = await showConfirmationModal('Are you sure you want to delete this entire component and all its records?');

                if (isConfirmed) {
                    const purchaseIdsToDelete = Array.from(card.querySelectorAll('tr[data-purchase-id]'))
                        .map(row => row.getAttribute('data-purchase-id'))
                        .filter(Boolean);

                    // If there are no purchase IDs, it's a new, unsaved component.
                    // Just remove it from the DOM.
                    if (purchaseIdsToDelete.length === 0) {
                        card.remove();
                        updateSummaryTotals();
                        return;
                    }

                    // If it has been saved, send a request to the server.
                    try {
                        const response = await fetch(`http://localhost:3000/purchase-records`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ purchase_ids: purchaseIdsToDelete })
                        });
                        if (response.ok) {
                            card.remove();
                            updateSummaryTotals();
                            showNotification('Component deleted successfully.', 'success');
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
        if (!inputElement) return;
        
        const dropdown = document.createElement('div');
        dropdown.classList.add('autocomplete-dropdown');
        document.body.appendChild(dropdown); // Append to body
        let timeout = null;
        let activeIndex = -1;

        const positionDropdown = () => {
            if (dropdown.style.display !== 'block') return;
            const inputRect = inputElement.getBoundingClientRect();
            dropdown.style.left = `${inputRect.left}px`;
            dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
            dropdown.style.width = `${inputRect.width}px`;
        };

        const handleSelection = (selectedItem, moveFocus = false) => {
            dropdown.style.display = 'none';
            if (type === 'vendor') {
                inputElement.value = selectedItem.vendor_name;
                inputElement.setAttribute('data-vendor-id', selectedItem.vendor_id);
                inputElement.setAttribute('data-tin-number', selectedItem.tin_number || '');
                rowElement.querySelector('.tin-display').textContent = selectedItem.tin_number || '';
                const mrcInput = rowElement.querySelector('.mrc-no-input');
                const mrcNumbers = selectedItem.mrc_numbers || [];
                mrcInput.dataset.mrcNumbers = JSON.stringify(mrcNumbers);
                mrcInput.value = mrcNumbers[0] || 'N/A';
                
                updateFsPrefix(rowElement);
                rowElement.querySelector('.fs-number-input').value = '';

                if (moveFocus) {
                    mrcInput.focus();
                }
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

            if (['ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % items.length;
                else if (e.key === 'ArrowUp') activeIndex = (activeIndex - 1 + items.length) % items.length;
                else if (e.key === 'Tab') {
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
                        positionDropdown(); // Position it
                    } else {
                        dropdown.style.display = 'none';
                    }
                } catch (err) { console.error(`${type} search failed:`, err); }
            }, 300);
        });

        // Reposition on scroll and resize
        window.addEventListener('scroll', positionDropdown, true); // Use capture to catch scroll events in containers
        window.addEventListener('resize', positionDropdown);

        // Hide when clicking away
        document.addEventListener('click', (e) => {
            if (!inputElement.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    };

    const setupMrcDropdown = (mrcInput) => {
        if (!mrcInput) return;
        const dropdown = document.createElement('div');
        dropdown.classList.add('autocomplete-dropdown');
        document.body.appendChild(dropdown);
        let activeIndex = -1;

        const positionDropdown = () => {
            if (dropdown.style.display !== 'block') return;
            const inputRect = mrcInput.getBoundingClientRect();
            dropdown.style.left = `${inputRect.left}px`;
            dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
            dropdown.style.width = `${inputRect.width}px`;
        };

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
                        const rowElement = mrcInput.closest('tr');
                        updateFsPrefix(rowElement);
                        const fsInput = rowElement.querySelector('.fs-number-input');
                        fsInput.value = '';
                        fsInput.focus();
                    });
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
                positionDropdown();
            } else {
                dropdown.style.display = 'none';
            }
        };

        mrcInput.addEventListener('focus', showDropdown);
        mrcInput.addEventListener('click', showDropdown);

        // Reposition on scroll and resize
        window.addEventListener('scroll', positionDropdown, true);
        window.addEventListener('resize', positionDropdown);

        // Hide when clicking away (handled globally later)

        mrcInput.addEventListener('keydown', (e) => {
            if (dropdown.style.display !== 'block') return;
            const items = dropdown.querySelectorAll('.autocomplete-item');
            if (items.length === 0) return;

            if (['ArrowDown', 'ArrowUp', 'Tab', 'Escape'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % items.length;
                else if (e.key === 'ArrowUp') activeIndex = (activeIndex - 1 + items.length) % items.length;
                else if (e.key === 'Tab') {
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
        const card = rowElement.closest('.purchase-group-card');
        const cardId = card.id; // Get the ID of the current card

        const mainRowElement = card.querySelector('.main-row');
        if (!mainRowElement) {
            showNotification('Error: Main row not found in card.', 'error');
            return;
        }

        // Extract common data from the main row once
        const mainVendorNameInput = mainRowElement.querySelector('.vendor-name-input');
        const commonVendorId = mainVendorNameInput?.getAttribute('data-vendor-id');
        const commonVendorName = mainVendorNameInput?.value;
        const commonMrcNo = mainRowElement.querySelector('.mrc-no-input')?.value;
        const commonTinNo = mainVendorNameInput?.getAttribute('data-tin-number');
        const commonPurchaseDate = mainRowElement.querySelector('.purchase-date-input')?.value;
        
        const mainFsNumberRaw = mainRowElement.querySelector('.fs-number-input')?.value;
        const mainFsPrefix = mainRowElement.querySelector('.fs-prefix')?.textContent || '';
        const commonFsNumber = mainFsNumberRaw ? `${mainFsPrefix}${mainFsNumberRaw}` : '';
        const commonStatus = isCurrentlyPostedView ? 'posted' : 'saved';
        const commonIsDateValid = await isDateInCurrentEthiopianMonth(commonPurchaseDate);

        const extractRecord = (row, isSub = false, commonSharedData) => {
            const quantity = parseFloat(row.querySelector(isSub ? '.sub-quantity' : '.quantity-input')?.value) || 0;
            const unitPrice = parseFloat(row.querySelector(isSub ? '.sub-unit-price' : '.unit-price-input')?.value) || 0;
            const vatOn = row.querySelector(isSub ? '.sub-vat-onoff' : '.vat-onoff-input')?.checked;
            
            const originalVatPercentage = parseFloat(row.querySelector(isSub ? '.sub-vat-percentage' : '.vat-percentage-input')?.value) || 15;
            const vatPercentageToSave = vatOn ? originalVatPercentage : 0;

            let base_total = quantity * unitPrice;
            let vat_amount = 0;

            if (vatOn) {
                const calculated_vat = base_total * (originalVatPercentage / 100);
                if (!commonSharedData.isDateValid) {
                    base_total += calculated_vat;
                } else {
                    vat_amount = calculated_vat;
                }
            }

            const total_amount = base_total + vat_amount;
            
            const itemNameInput = row.querySelector(isSub ? '.sub-item-name' : '.item-name-input');
            return {
                vendorId: commonSharedData.vendorId,
                vendorName: commonSharedData.vendorName,
                mrcNo: commonSharedData.mrcNo,
                tinNo: commonSharedData.tinNo,
                purchaseDate: commonSharedData.purchaseDate,
                fsNumber: commonSharedData.fsNumber,
                status: commonSharedData.status,

                purchaseId: row.getAttribute('data-purchase-id'),
                itemId: itemNameInput?.getAttribute('data-item-id'),
                itemName: itemNameInput?.value,
                unit: row.querySelector(isSub ? '.sub-unit' : '.unit-input')?.value,
                quantity, unitPrice, vatPercentage: vatPercentageToSave, vatOn,
                base_total, vat_amount, total_amount,
                isSubItem: isSub // Add a flag to indicate if it's a sub-item for server processing if needed, although not storing parent_id directly.
            };
        };
    
        const recordsToSave = [];
        const currentPurchaseIdsInCard = new Set();
        const purchaseIdsToDelete = [];

        // Collect all currently existing records in this card (including newly added ones without purchase_id)
        Array.from(card.querySelectorAll('tbody tr')).forEach(row => {
            const record = extractRecord(row, row.classList.contains('sub-row'), {
                vendorId: commonVendorId,
                vendorName: commonVendorName,
                mrcNo: commonMrcNo,
                tinNo: commonTinNo,
                purchaseDate: commonPurchaseDate,
                fsNumber: commonFsNumber,
                status: commonStatus,
                isDateValid: commonIsDateValid
            });
            // Only add records that have an item name; empty rows shouldn't be saved
            if (record.itemName) {
                recordsToSave.push(record);
                if (record.purchaseId) {
                    currentPurchaseIdsInCard.add(record.purchaseId);
                }
            }
        });

        // Determine which records were deleted from the UI
        const initialIdsForThisCard = initialPurchaseIdsPerCard.get(cardId) || new Set();
        initialIdsForThisCard.forEach(id => {
            if (!currentPurchaseIdsInCard.has(id)) {
                purchaseIdsToDelete.push(id);
            }
        });
        
        // If it's a brand new card (no purchase_id on main row), and no items are added, delete the card itself.
        // This scenario might occur if a user adds a new card, then deletes all its items.
        if (recordsToSave.length === 0 && !rowElement.getAttribute('data-purchase-id')) {
             card.remove();
             updateSummaryTotals();
             showNotification('Empty component removed.', 'info');
             return;
        }

        if (recordsToSave.length === 0 && purchaseIdsToDelete.length === 0) {
            showNotification('No items to save or delete.', 'warning');
            return;
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
                body: JSON.stringify({ recordsToSave, purchaseIdsToDelete }) // Send both arrays
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
        const container = document.getElementById('purchase-groups-container');
        const groupComponent = document.createElement('div');
        groupComponent.className = 'purchase-group-card';
        
        // Create a unique key for new groups that haven't been saved
        const newGroupKey = `new-group-${Date.now()}`;

        groupComponent.innerHTML = `
            <div class="card-header">
                <div class="header-info">
                    <div class="fs-number-display">FS Number: <strong>N/A</strong></div>
                    <div class="purchase-date-display">${new Date().toLocaleDateString()}</div>
                </div>
                <div class="component-summary">
                    <div class="summary-item"><span>Base:</span> <strong class="component-base-total">0.00</strong></div>
                    <div class="summary-item"><span>VAT:</span> <strong class="component-vat-total">0.00</strong></div>
                    <div class="summary-item"><span>Total:</span> <strong class="component-grand-total">0.00</strong></div>
                </div>
                <div class="header-actions">
                    <button class="save-row-btn btn btn-icon" title="Save (Ctrl+S)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
                    <button class="delete-row-btn btn btn-icon btn-danger" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="table" data-fs-group="${newGroupKey}">
                    <thead>
                        <tr>
                            <th>Vendor Name</th>
                            <th>MRC No</th>
                            <th>Purchase Date</th>
                            <th>FS Number</th>
                            <th>Item Name</th>
                            <th>Unit</th>
                            <th class="is-numeric">Quantity</th>
                            <th class="is-numeric">Unit Price</th>
                            <th class="is-numeric vat-percentage-cell" style="display: none;">VAT %</th>
                            <th class="is-center">VAT On/Off</th>
                            <th class="is-numeric">Base Total</th>
                            <th class="is-numeric">Total VAT</th>
                            <th class="is-numeric">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${createNewRowHTML()}
                    </tbody>
                </table>
            </div>
        `;
        
        container.insertAdjacentElement('afterbegin', groupComponent);
        const newRowElement = groupComponent.querySelector('tbody tr');
        if (newRowElement) {
            attachRowEventListeners(newRowElement, true);
            newRowElement.querySelector('.vendor-name-input')?.focus();
        }
    });

   syncLogsBtn.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    
    // 1. Prompt the user for the Posted Date
    if(postdate){
            overlay.style.display = "flex";
    }});
    postc.addEventListener('click', ()=>{
        overlay.style.display = "none";
    })
    postconfirm.addEventListener('click',async () =>{
            const postdatevalue =  postdatepicker.value
            // 2. Validate the date input
            // The date is considered valid if the user provided any input (not null or empty)
            if (!postdatevalue) {
                showNotification('Sync cancelled. A Posted Date is required.', 'error');
                return; 
            }
            
            showSyncStatus('Starting sync process...', 'loading');

            try {
                const rows = document.querySelectorAll('#purchase-groups-container .table tbody tr.main-row[data-purchase-id], #purchase-groups-container .table tbody tr.sub-row[data-purchase-id]');
                const unpostedIds = Array.from(rows)
                    .map(row => row.getAttribute('data-purchase-id'))
                    .filter(id => id);

                if (unpostedIds.length > 0) {
                    showSyncStatus(`Posting ${unpostedIds.length} records...`, 'loading');
                    
                    // 3. Prepare the request body with the user-provided date
                    const requestBody = { 
                        purchase_ids: unpostedIds,
                        post_date: postdatevalue // <--- The date from the prompt is used here
                    };
                    
                    const postResponse = await fetch('http://localhost:3000/change-from-saved-to-posted', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });

                    if (!postResponse.ok) {
                        const postResult = await postResponse.json();
                        showSyncStatus(`Failed to post: ${postResult.error || postResult.message}`, 'error');
                        return;
                    }

                    showSyncStatus('Records posted successfully!', 'success');
                    reloadTableData(); 

                } else {
                    showNotification("No records to post.", "info");
                    hideSyncStatus();
                            overlay.style.display = "none";

                }
                 overlay.style.display = "none";


            } catch (err) {
                showSyncStatus("An error occurred during posting.", 'error');
                console.error("Sync/Post Error:", err);
                    overlay.style.display = "none";
            } finally {
                button.disabled = false;
                    overlay.style.display = "none";
            }
        });
   const reloadTableData = async (isPostedView = false) => {
        const container = document.getElementById('purchase-groups-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-indicator">Loading records...</div>';

        try {
            const endpoint = isPostedView ? `http://localhost:3000/posted-purchase-records?date=${postedDatePicker.value}` : 'http://localhost:3000/saved-purchase-records';
            const response = await fetch(endpoint);
            const records = await response.json();
            container.innerHTML = '';

            if (!response.ok) {
                container.innerHTML = `<div class="error-message">Failed to load records: ${records.message || 'Unknown error'}</div>`;
                return;
            }

            if (records.length === 0) {
                if (!isPostedView) {
                    addRowBtn.click(); // Create a new empty group if no saved records exist
                } else {
                    container.innerHTML = '<div class="info-message">No posted records found for this date.</div>';
                }
                return;
            }

            // Clear the map of initial purchase IDs for this reload
            initialPurchaseIdsPerCard.clear();

            const groupedByFsNumber = records.reduce((acc, record) => {
                const key = record.fs_number || `new-record-${Date.now()}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(record);
                return acc;
            }, {});

            let allowPostedEdit = false;
            if (isPostedView) {
                allowPostedEdit = await promptForEditCode();
                if (!allowPostedEdit) {
                    showNotification('Incorrect code. Editing of posted records is disabled.', 'error');
                }
            }

            Object.entries(groupedByFsNumber).forEach(([fsNumber, group]) => {
                // Given no 'parent_id' in the database schema, we assume the first record in the group
                // is the main record, and subsequent records are its sub-items for display purposes.
                const mainRecord = group[0]; 
                const subRecords = group.slice(1); // All records after the first are sub-items
                const isEditable = !isPostedView || (isPostedView && userRole === 'admin' && allowPostedEdit);

                const groupComponent = document.createElement('div');
                groupComponent.className = 'purchase-group-card';
                // Assign a unique ID to the card, preferably derived from FS number if available
                const cardId = `card-${fsNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
                groupComponent.id = cardId;
                
                // Store initial purchase IDs for this card
                const initialIds = new Set();
                group.forEach(record => {
                    if (record.purchase_id) initialIds.add(record.purchase_id);
                });
                initialPurchaseIdsPerCard.set(cardId, initialIds);

                // Correct date handling to prevent timezone shifts
                const purchaseDateStr = mainRecord.purchase_date.split('T')[0]; // Get 'YYYY-MM-DD'
                const [year, month, day] = purchaseDateStr.split('-');
                // Construct date as local to ensure correct display
                const displayDate = new Date(year, month - 1, day).toLocaleDateString();

                groupComponent.innerHTML = `
                    <div class="card-header">
                        <div class="header-info">
                            <div class="fs-number-display">FS Number: <strong>${fsNumber.startsWith('new-record') ? 'N/A' : fsNumber}</strong></div>
                            <div class="purchase-date-display">${displayDate}</div>
                        </div>
                        <div class="component-summary">
                            <div class="summary-item"><span>Base:</span> <strong class="component-base-total">0.00</strong></div>
                            <div class="summary-item"><span>VAT:</span> <strong class="component-vat-total">0.00</strong></div>
                            <div class="summary-item"><span>Total:</span> <strong class="component-grand-total">0.00</strong></div>
                        </div>
                        <div class="header-actions">
                            ${isEditable ? `
                                <button class="save-row-btn btn btn-icon" title="Save (Ctrl+S)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
                                <button class="delete-row-btn btn btn-icon btn-danger" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                            ` : `<span class="posted-label">Posted</span>`}
                        </div>
                    </div>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Vendor Name</th>
                                    <th>MRC No</th>
                                    <th>Purchase Date</th>
                                    <th>FS Number</th>
                                    <th>Item Name</th>
                            <th>Unit</th>
                            <th class="is-numeric">Quantity</th>
                            <th class="is-numeric">Unit Price</th>
                            <th class="is-numeric vat-percentage-cell" style="display: none;">VAT %</th>
                            <th class="is-center">VAT On/Off</th>
                                    <th class="is-numeric">Base Total</th>
                                    <th class="is-numeric">Total VAT</th>
                                    <th class="is-numeric">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                `;
                
                const tbody = groupComponent.querySelector('tbody');
                tbody.insertAdjacentHTML('beforeend', populateRowWithData(mainRecord, isEditable));
                const mainRowElement = tbody.lastElementChild;
                attachRowEventListeners(mainRowElement, isEditable);

                if (isPostedView && isEditable) {
                    // Disable date inputs for posted records even in edit mode
                    const dateInputs = groupComponent.querySelectorAll('.purchase-date-input');
                    dateInputs.forEach(input => {
                        input.disabled = true;
                        input.classList.add('disabled-input');
                    });
                }

                subRecords.forEach(subRecord => {
                    const subRow = populateSubitemRow(mainRowElement, subRecord, isEditable);
                    subRow.setAttribute('data-purchase-id', subRecord.purchase_id);
                });
                
                updateComponentSummary(groupComponent);
                container.appendChild(groupComponent);
            });

            updateSummaryTotals();
        } catch (error) {
            console.error('Error fetching records:', error);
            container.innerHTML = `<div class="error-message">An error occurred: ${error.message}</div>`;
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
        isCurrentlyPostedView = true;
        reloadTableData(true); // Pass true to indicate posted view
        mainActionButtons.style.display = 'none';
        postedDateControls.style.display = 'none';
        backToWorkspaceBtn.style.display = 'inline-block';
    });

    backToWorkspaceBtn.addEventListener('click', () => {
        isCurrentlyPostedView = false;
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
                if (focusedRow) { // Removed actionsTableBody.contains(focusedRow) check
                    let mainRow = focusedRow.classList.contains('main-row') ? focusedRow : focusedRow.closest('tr.main-row');
                    if(mainRow) window.populateSubitemRow(mainRow);
                }
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                openModal(addVendorModal);
            }
            // Shortcut for VAT toggle (Ctrl + F)
            if (e.ctrlKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const focusedRow = activeElement.closest('tr');
                if (focusedRow) {
                    const vatCheckbox = focusedRow.querySelector('.vat-onoff-input, .sub-vat-onoff');
                    if (vatCheckbox && !vatCheckbox.disabled) {
                        vatCheckbox.checked = !vatCheckbox.checked;
                        vatCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
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

            if (key === 'ArrowDown') {
                let targetRow = currentRow.nextElementSibling;
                if (currentRow.classList.contains('main-row') && targetRow && targetRow.classList.contains('sub-row')) {
                    nextElement = targetRow.querySelector('.sub-item-name');
                } else if (targetRow) {
                    const targetCell = targetRow.children[cellIndex];
                    nextElement = targetCell?.querySelector('input:not([disabled]), .checkbox:not([disabled])');
                }
            } else if (key === 'ArrowUp') {
                let targetRow = currentRow.previousElementSibling;
                if (currentRow.classList.contains('sub-row') && targetRow && targetRow.classList.contains('main-row')) {
                    nextElement = targetRow.querySelector('.item-name-input');
                } else if (targetRow) {
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

        if (key === 'Tab' || key === ' ') { // Allow Space to toggle checkbox
            if (activeElement.type === 'checkbox' && key === ' ') {
                e.preventDefault();
                activeElement.checked = !activeElement.checked;
                // Manually trigger change event for calculations
                activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                return; // Stop further execution for space on checkbox
            }

        if (key === 'Tab') {
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
        }

        if (key === 'Enter') {
            e.preventDefault();
            const currentCard = currentRow.closest('.purchase-group-card');
            const allCards = Array.from(document.querySelectorAll('.purchase-group-card'));
            const currentCardIndex = allCards.indexOf(currentCard);

            let nextCardIndex = currentCardIndex + (e.shiftKey ? -1 : 1);
            
            if (nextCardIndex >= 0 && nextCardIndex < allCards.length) {
                const nextCard = allCards[nextCardIndex];
                const nextElement = nextCard.querySelector('input:not([disabled]), .checkbox:not([disabled])');
                if (nextElement) {
                    nextElement.focus();
                    if (nextElement.select) nextElement.select();
                }
            } else if (!e.shiftKey && nextCardIndex >= allCards.length) {
                addRowBtn.focus(); // Focus on the "Add Row" button after the last card
            } else if (e.shiftKey && nextCardIndex < 0) {
                // Potentially focus a button in the header or just stop
            }
        }
    });

    if (postedDatePicker) postedDatePicker.value = new Date().toISOString().split('T')[0];
    
    // Add focus-based auto-scrolling to tables
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('.table .input, .table .checkbox')) {
            const cell = e.target.closest('td');
            const tableWrapper = e.target.closest('.table-wrapper');
            if (cell && tableWrapper) {
                const cellRect = cell.getBoundingClientRect();
                const wrapperRect = tableWrapper.getBoundingClientRect();

                // Scroll to make the cell visible
                tableWrapper.scrollBy({
                    left: cellRect.left - wrapperRect.left - 10, // a little offset
                    behavior: 'smooth'
                });
            }
        }
    });

    reloadTableData();
});
