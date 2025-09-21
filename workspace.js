document.addEventListener('DOMContentLoaded', () => {
    const addRowBtn = document.getElementById('add-row-btn');
    const actionsTableBody = document.querySelector('#actions-table tbody');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotalVat = document.getElementById('summary-total-vat');

    // Removed Ethiopian calendar display element reference
    // const currentEthiopianMonthSpan = document.getElementById('current-ethiopian-month');

    let rowCounter = 0;

    const createNewRow = () => {
        rowCounter++;
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>
                <i class="fas fa-save save-row-icon"></i>
                <i class="fas fa-trash-alt delete-row-icon"></i>
            </td>
            <td><input type="text" class="vendor-name-input" data-vendor-id=""></td> <!-- Added data-vendor-id -->
            <td><select class="mrc-no-input" value="MRC-${rowCounter}" readonly></select></td>
            <td><input type="text" class="tin-no-input" readonly></td>
            <td><input type="text" class="item-name-input" data-item-id=""></td> <!-- Added data-item-id -->
            <td><input type="date" class="purchase-date-input"></td>
            <td><input type="text" class="unit-input"></td>
            <td><input type="number" class="quantity-input" value="0" min="0"></td>
            <td><input type="number" class="unit-price-input" value="0.00" min="0" step="0.01"></td>
            <td><input type="number" class="vat-percentage-input" value="12" min="0" step="0.01"></td>
            <td><input type="checkbox" class="vat-exclude-input"></td>
            <td class="total-vat-display">0.00</td>
            <td><input type="text" class="fs-number-input"></td>
            <td class="subtotal-display">0.00</td>
        `;
        actionsTableBody.appendChild(newRow);

        const vendorNameInput = newRow.querySelector('.vendor-name-input');
        const mrcNoInput = newRow.querySelector('.mrc-no-input');
        const tinNoInput = newRow.querySelector('.tin-no-input');
        const itemNameInput = newRow.querySelector('.item-name-input');
        const unitPriceInput = newRow.querySelector('.unit-price-input');
        const quantityInput = newRow.querySelector('.quantity-input');
        const vatPercentageInput = newRow.querySelector('.vat-percentage-input');
        const vatExcludeInput = newRow.querySelector('.vat-exclude-input');
        const subtotalDisplay = newRow.querySelector('.subtotal-display');
        const totalVatDisplay = newRow.querySelector('.total-vat-display');
        const deleteRowIcon = newRow.querySelector('.delete-row-icon');
        const saveRowIcon = newRow.querySelector('.save-row-icon'); // Get the new save icon
        // Removed purchaseDateInput reference as Ethiopian calendar logic is being removed
        // const purchaseDateInput = newRow.querySelector('.purchase-date-input');

        // Autocomplete for Vendor Name
        const vendorNameCell = vendorNameInput.parentElement;
        const autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.classList.add('autocomplete-dropdown');
        vendorNameCell.appendChild(autocompleteDropdown);

        let timeout = null;
        vendorNameInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const searchTerm = e.target.value;

            if (searchTerm.length < 2) {
                autocompleteDropdown.innerHTML = '';
                autocompleteDropdown.style.display = 'none';
                return;
            }

            timeout = setTimeout(async () => {
                const response = await fetch(`http://localhost:3000/search-vendors?query=${searchTerm}`);
                const vendors = await response.json();
                
                autocompleteDropdown.innerHTML = ''; // Clear previous suggestions
                if (vendors.length > 0) {
                    vendors.forEach(vendor => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.classList.add('autocomplete-item');
                        suggestionItem.textContent = vendor.vendor_name;
                        suggestionItem.addEventListener('click', () => {
                            vendorNameInput.value = vendor.vendor_name;
                            tinNoInput.value = vendor.tin_number;
                            vendorNameInput.setAttribute('data-vendor-id', vendor.vendor_id); // Store vendor_id

                            // Populate MRC numbers
                            mrcNoInput.innerHTML = ''; // Clear existing MRC options
                            if (vendor.mrc_numbers && vendor.mrc_numbers.length > 0) {
                                vendor.mrc_numbers.forEach(mrc => {
                                    const option = document.createElement('option');
                                    option.value = mrc;
                                    option.textContent = mrc;
                                    mrcNoInput.appendChild(option);
                                });
                            } else {
                                const option = document.createElement('option');
                                option.value = 'N/A';
                                option.textContent = 'N/A';
                                mrcNoInput.appendChild(option);
                            }
                            autocompleteDropdown.innerHTML = '';
                            autocompleteDropdown.style.display = 'none';
                        });
                        autocompleteDropdown.appendChild(suggestionItem);
                    });
                    autocompleteDropdown.style.display = 'block';
                } else {
                    autocompleteDropdown.style.display = 'none';
                }

            }, 300);
        });

        // Autocomplete for Item Name (re-added inside createNewRow)
        const itemNameCell = itemNameInput.parentElement;
        const itemAutocompleteDropdown = document.createElement('div');
        itemAutocompleteDropdown.classList.add('autocomplete-dropdown');
        itemNameCell.appendChild(itemAutocompleteDropdown);

        let itemTimeout = null;
        itemNameInput.addEventListener('input', (e) => {
            clearTimeout(itemTimeout);
            const searchTerm = e.target.value;

            if (searchTerm.length < 2) {
                itemAutocompleteDropdown.innerHTML = '';
                itemAutocompleteDropdown.style.display = 'none';
                return;
            }

            itemTimeout = setTimeout(async () => {
                const response = await fetch(`http://localhost:3000/search-items?query=${searchTerm}`);
                const items = await response.json();
                
                itemAutocompleteDropdown.innerHTML = ''; // Clear previous suggestions
                if (items.length > 0) {
                    items.forEach(item => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.classList.add('autocomplete-item');
                        suggestionItem.textContent = item.item_name;
                        suggestionItem.addEventListener('click', () => {
                            itemNameInput.value = item.item_name;
                            unitPriceInput.value = item.unit_price.toFixed(2);
                            itemNameInput.setAttribute('data-item-id', item.item_id); // Store item_id
                            itemAutocompleteDropdown.innerHTML = '';
                            itemAutocompleteDropdown.style.display = 'none';
                            calculateRowTotals(); // Recalculate totals after unit price changes
                        });
                        itemAutocompleteDropdown.appendChild(suggestionItem);
                    });
                    itemAutocompleteDropdown.style.display = 'block';
                } else {
                    itemAutocompleteDropdown.style.display = 'none';
                }

            }, 300);
        });

        // Hide dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!vendorNameCell.contains(e.target)) {
                autocompleteDropdown.innerHTML = '';
                autocompleteDropdown.style.display = 'none';
            }
            if (!itemNameCell.contains(e.target)) { // Now itemNameCell is defined within scope
                itemAutocompleteDropdown.innerHTML = '';
                itemAutocompleteDropdown.style.display = 'none';
            }
        });

        const calculateRowTotals = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitPrice = parseFloat(unitPriceInput.value) || 0;
            const vatPercentage = parseFloat(vatPercentageInput.value) || 0;
            const vatExclude = vatExcludeInput.checked;

            const subtotal = quantity * unitPrice;
            subtotalDisplay.textContent = subtotal.toFixed(2);

            let totalVat = 0;
            if (!vatExclude) {
                totalVat = subtotal * (vatPercentage / 100);
            }
            totalVatDisplay.textContent = totalVat.toFixed(2);

            updateSummaryTotals();
        };

        quantityInput.addEventListener('input', calculateRowTotals);
        unitPriceInput.addEventListener('input', calculateRowTotals);
        vatPercentageInput.addEventListener('input', calculateRowTotals);
        vatExcludeInput.addEventListener('change', calculateRowTotals);
        deleteRowIcon.addEventListener('click', () => {
            newRow.remove();
            updateSummaryTotals();
            hasUnsavedChanges = true; // Mark as unsaved after deleting
        });
        saveRowIcon.addEventListener('click', async () => {
            const success = await saveSingleRow(newRow);
            if (success) {
                hasUnsavedChanges = false; // Reset flag for this row (simplistic global reset)
            }
        });

        calculateRowTotals(); // Initial calculation for the new row

        // Auto-save when a new row is created
        // triggerAutoSave(); // Removed auto-save call
    };

    // Removed Ethiopian calendar related functions and display update
    // const currentEthiopianYear = new EthiopianCalendar().getFullYear();
    // const updateEthiopianMonthDisplay = (gregorianDateString) => {
    //     let ethiopianMonthName = 'N/A';
    //     let isCurrentMonth = false;
    //     if (gregorianDateString) {
    //         const gregorianDate = new Date(gregorianDateString);
    //         const ethiopianDate = new EthiopianCalendar(gregorianDate).toEthiopian();
    //         ethiopianMonthName = ethiopianDate.monthName;

    //         const currentEthiopianDate = new EthiopianCalendar().toEthiopian();
    //         isCurrentMonth = (ethiopianDate.year === currentEthiopianDate.year && ethiopianDate.month === currentEthiopianDate.month);
    //     }
    //     currentEthiopianMonthSpan.textContent = `Ethiopian Month: ${ethiopianMonthName} (${isCurrentMonth ? 'Current' : 'Not Current'})`;
    // };

    // Placeholder for actual date validation
    // const isDateInCurrentEthiopianMonth = (gregorianDateString) => {
    //     if (!gregorianDateString) return false;
    //     const gregorianDate = new Date(gregorianDateString);
    //     const ethiopianDate = new EthiopianCalendar(gregorianDate).toEthiopian();
    //     const currentEthiopianDate = new EthiopianCalendar().toEthiopian();
    //     return (ethiopianDate.year === currentEthiopianDate.year && ethiopianDate.month === currentEthiopianDate.month);
    // };

    // Initial display of Ethiopian month (removed as per new requirement)
    // updateEthiopianMonthDisplay(new Date().toISOString().slice(0, 10)); // Pass current Gregorian date

    // Function to save a single row
    const saveSingleRow = async (rowElement) => {
        const vendorNameInput = rowElement.querySelector('.vendor-name-input');
        const vendorName = vendorNameInput.value;
        const vendorId = vendorNameInput.getAttribute('data-vendor-id'); // Retrieve vendor_id
        const mrcNo = rowElement.querySelector('.mrc-no-input').value;
        const tinNo = rowElement.querySelector('.tin-no-input').value;
        const itemNameInput = rowElement.querySelector('.item-name-input');
        const itemName = itemNameInput.value;
        const itemId = itemNameInput.getAttribute('data-item-id'); // Retrieve item_id
        const purchaseDate = rowElement.querySelector('.purchase-date-input').value;
        const unit = rowElement.querySelector('.unit-input').value;
        const quantity = parseFloat(rowElement.querySelector('.quantity-input').value) || 0;
        const unitPrice = parseFloat(rowElement.querySelector('.unit-price-input').value) || 0;
        const vatPercentage = parseFloat(rowElement.querySelector('.vat-percentage-input').value) || 0;
        const vatExclude = rowElement.querySelector('.vat-exclude-input').checked;
        const fsNumber = rowElement.querySelector('.fs-number-input').value;
        const subtotal = parseFloat(rowElement.querySelector('.subtotal-display').textContent) || 0;
        let totalVat = parseFloat(rowElement.querySelector('.total-vat-display').textContent) || 0;

        // --- Validation ---
        if (!vendorName || !itemName || !purchaseDate || !unit || quantity <= 0 || unitPrice <= 0 || !fsNumber) {
            showNotification('Please fill in all required fields and ensure Quantity/Unit Price are positive for this row.', 'error');
            return false; // Indicate validation failure
        }

        if (!vendorId) {
            showNotification('Please select a vendor from the suggestions for this row.', 'error');
            return false; // Indicate validation failure
        }

        if (!itemId) { // Add validation for itemId
            showNotification('Please select an item from the suggestions for this row.', 'error');
            return false; // Indicate validation failure
        }

        // Removed isValidDate validation as per new requirement
        // if (!isValidDate(purchaseDate)) {
        //     showNotification('The purchase date for this row is invalid.', 'error');
        //     return false; // Indicate validation failure
        // }

        // --- VAT Exclude Logic ---
        if (vatExclude) {
            totalVat = 0; // If VAT is excluded, ensure totalVat sent to backend is 0
        }

        // --- Ethiopian Month Validation ---
        if (!checkEthiopianMonthValidation(purchaseDate)) {
            showNotification('The purchase date must be in the current or a future Ethiopian month.', 'warning');
            return false; // Indicate validation failure
        }

        const recordToSave = {
            vendorId, // Pass vendorId to the server
            vendorName,
            mrcNo,
            tinNo,
            itemId, // Pass itemId to the server
            itemName,
            purchaseDate,
            unit,
            quantity,
            unitPrice,
            vatPercentage,
            vatExclude,
            totalVat,
            fsNumber,
            subtotal
        };

        try {
            const response = await fetch('http://localhost:3000/save-purchase-records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recordToSave), // Send as single record object
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(result.message, 'success');
                rowElement.classList.remove('unsaved-changes'); // Mark row as saved

                // Clear the input fields and reset data attributes for the saved row
                rowElement.querySelectorAll('input, select').forEach(input => {
                    if (input.type === 'text' || input.type === 'number' || input.type === 'date') {
                        input.value = '';
                    } else if (input.tagName === 'SELECT') {
                        input.innerHTML = ''; // Clear select options
                    } else if (input.type === 'checkbox') {
                        input.checked = false;
                    }
                    input.removeAttribute('data-vendor-id');
                    input.removeAttribute('data-item-id');
                });
                rowElement.querySelector('.subtotal-display').textContent = '0.00';
                rowElement.querySelector('.total-vat-display').textContent = '0.00';
                updateSummaryTotals(); // Update summary after clearing a row

                return true; // Indicate successful save
            } else {
                showNotification(`Error saving row: ${result.message}`, 'error');
                return false; // Indicate save failure
            }
        } catch (error) {
            console.error('Failed to save single record:', error);
            showNotification('An error occurred while trying to save this record.', 'error');
            return false; // Indicate save failure
        }
    };

    // Column Resizing Logic (moved outside createNewRow to apply to all headers)
    const setupColumnResizing = () => {
        const headerRow = document.querySelector('#actions-table thead tr');
        if (!headerRow) return;

        const resizers = headerRow.querySelectorAll('.resizer');
        resizers.forEach(resizer => {
            // Remove any existing event listeners to prevent duplicates if function is called multiple times
            resizer.removeEventListener('mousedown', resizer.currentMouseDownHandler);

            const mouseDownHandler = (e) => {
                let x = e.clientX;
                let th = resizer.parentElement;
                let startWidth = th.offsetWidth;

                const mouseMoveHandler = (e) => {
                    const dx = e.clientX - x;
                    th.style.width = (startWidth + dx) + 'px';
                };

                const mouseUpHandler = () => {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                    // Optional: persist column widths to local storage here
                };

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
            // Store the handler so it can be removed later if needed
            resizer.currentMouseDownHandler = mouseDownHandler;
        });
    };

    const updateSummaryTotals = () => {
        let totalSubtotal = 0;
        let totalVatAmount = 0;

        document.querySelectorAll('#actions-table tbody tr').forEach(row => {
            const subtotal = parseFloat(row.querySelector('.subtotal-display').textContent) || 0;
            const totalVat = parseFloat(row.querySelector('.total-vat-display').textContent) || 0;
            totalSubtotal += subtotal;
            totalVatAmount += totalVat;
        });

        summarySubtotal.textContent = totalSubtotal.toFixed(2);
        summaryTotalVat.textContent = totalVatAmount.toFixed(2);
    };

    addRowBtn.addEventListener('click', createNewRow);

    // Navigation button event listeners
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const goToReportsBtn = document.getElementById('go-to-reports-btn');

    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (goToReportsBtn) {
        goToReportsBtn.addEventListener('click', () => {
            window.location.href = 'reports.html';
        });
    }

    let hasUnsavedChanges = false; // Flag to track unsaved changes

    // Get notification modal elements
    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');
    const closeButton = document.querySelector('.close-button');

    // Get current Ethiopian month display element
    const currentEthiopianMonthSpan = document.getElementById('current-ethiopian-month');

    // Function to update the Ethiopian month display
    const updateEthiopianMonthDisplay = () => {
        const today = new Date();
        const currentGY = today.getFullYear();
        const currentGM = today.getMonth() + 1; // getMonth() is 0-based
        const currentGD = today.getDate();

        const currentEC = gcToEc(currentGY, currentGM, currentGD);
        const ethiopianMonthNames = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamlé", "Nehasé", "Pagume"];
        currentEthiopianMonthSpan.textContent = `Ethiopian Month: ${ethiopianMonthNames[currentEC.month - 1]}`;
    };

    // Call on page load
    updateEthiopianMonthDisplay();

    // Ensure modal is hidden on load
    notificationModal.style.display = 'none';

    // Function to show custom notification modal
    const showNotification = (message, type = 'info') => {
        notificationMessage.textContent = message;
        notificationModal.className = 'notification-modal'; // Reset classes
        if (type) {
            notificationModal.classList.add(`notification-${type}`);
        }
        notificationModal.style.display = 'flex';
        document.body.classList.add('modal-active'); // Add class to body when modal is active
    };

    // Close button for modal
    closeButton.addEventListener('click', () => {
        notificationModal.style.display = 'none';
        document.body.classList.remove('modal-active'); // Remove class from body
    });

    // Close modal if clicked outside of content
    window.addEventListener('click', (event) => {
        if (event.target === notificationModal) {
            notificationModal.style.display = 'none';
            document.body.classList.remove('modal-active'); // Remove class from body
        }
    });

    // Function to mark changes
    const markAsChanged = (rowElement) => {
        hasUnsavedChanges = true;
        // Optionally, add a visual indicator to the specific row
        rowElement.classList.add('unsaved-changes');
    };

    // Add event listeners to inputs to mark changes
    actionsTableBody.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            const row = e.target.closest('tr');
            if (row) {
                markAsChanged(row);
            }
        }
    });

    // Warn user before leaving if there are unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; // Standard for browsers to display default message
        }
    });

    // Removed saveAllBtn and related logic

    // Removed isValidDate and Ethiopian Calendar logic

    // Column Resizing Logic (moved outside createNewRow to apply to all headers)
    // Call setupColumnResizing initially
    setupColumnResizing();

    // Add an initial row when the page loads
    createNewRow();

    // Removed initial notification call if any

    // Global keyboard shortcut for adding a new row (Ctrl + T)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault(); // Prevent default browser action
            createNewRow();
        }
    });

    // Arrow key navigation
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
            const currentCell = activeElement.closest('td');
            const currentRow = activeElement.closest('tr');
            if (!currentCell || !currentRow) return;

            const cellsInRow = Array.from(currentRow.querySelectorAll('td input, td select'));
            const currentIndex = cellsInRow.indexOf(activeElement);

            let nextElement = null;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextElement = cellsInRow[currentIndex + 1];
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                nextElement = cellsInRow[currentIndex - 1];
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextRow = currentRow.nextElementSibling;
                if (nextRow) {
                    const nextRowCells = Array.from(nextRow.querySelectorAll('td input, td select'));
                    nextElement = nextRowCells[currentIndex];
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevRow = currentRow.previousElementSibling;
                if (prevRow && prevRow.id !== 'summary-row') { // Prevent navigating into summary row
                    const prevRowCells = Array.from(prevRow.querySelectorAll('td input, td select'));
                    nextElement = prevRowCells[currentIndex];
                }
            }

            if (nextElement) {
                nextElement.focus();
            }
        }
    });

    // Enter key navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
                e.preventDefault(); // Prevent form submission or newline in textareas

                const currentCell = activeElement.closest('td');
                const currentRow = activeElement.closest('tr');
                if (!currentCell || !currentRow) return;

                const cellsInRow = Array.from(currentRow.querySelectorAll('td input, td select'));
                const currentIndex = cellsInRow.indexOf(activeElement);

                const nextRow = currentRow.nextElementSibling;
                if (nextRow && nextRow.id !== 'summary-row') {
                    const nextRowCells = Array.from(nextRow.querySelectorAll('td input, td select'));
                    if (nextRowCells[currentIndex]) {
                        nextRowCells[currentIndex].focus();
                    } else if (currentIndex < nextRowCells.length) {
                        nextRowCells[nextRowCells.length - 1].focus();
                    }
                } else { // No next row or next row is summary, create new row
                    createNewRow();
                    // Focus the first input of the newly created row (now appended)
                    const newRow = actionsTableBody.lastElementChild; // Correctly target the last child for appended row
                    if (newRow) {
                        const firstInput = newRow.querySelector('td input, td select');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }
                }
            }
        }
    });

    // Tab and Shift + Tab navigation
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
            if (e.key === 'Tab') {
                e.preventDefault();

                const currentCell = activeElement.closest('td');
                const currentRow = activeElement.closest('tr');
                if (!currentCell || !currentRow) return;

                const cellsInRow = Array.from(currentRow.querySelectorAll('td input, td select'));
                const currentIndex = cellsInRow.indexOf(activeElement);

                let nextElement = null;

                if (e.shiftKey) { // Shift + Tab (move left)
                    if (currentIndex > 0) {
                        nextElement = cellsInRow[currentIndex - 1];
                    } else { // Wrap to end of previous row
                        const prevRow = currentRow.previousElementSibling;
                        if (prevRow && prevRow.id !== 'summary-row') {
                            const prevRowCells = Array.from(prevRow.querySelectorAll('td input, td select'));
                            nextElement = prevRowCells[prevRowCells.length - 1];
                        }
                    }
                } else { // Tab (move right)
                    if (currentIndex < cellsInRow.length - 1) {
                        nextElement = cellsInRow[currentIndex + 1];
                    } else { // Wrap to beginning of next row
                        const nextRow = currentRow.nextElementSibling;
                        if (nextRow && nextRow.id !== 'summary-row') {
                            const nextRowCells = Array.from(nextRow.querySelectorAll('td input, td select'));
                            nextElement = nextRowCells[0];
                        } else if (!nextRow) { // If no next row, create one
                            createNewRow();
                            // Focus the first input of the newly created row
                            nextElement = actionsTableBody.lastElementChild.querySelector('td input, td select');
                        }
                    }
                }

                if (nextElement) {
                    nextElement.focus();
                }
            }
        }
    });

    // Add an initial row when the page loads
    createNewRow();
});

// Helper functions for Ethiopian calendar conversion
function isGregorianLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function gcToEc(gYear, gMonth, gDay) {
  // gMonth is 1-based (Jan = 1, Feb = 2, ...)

  // Step 1: Determine Ethiopian year
  let eYear;
  if (gMonth < 9 || (gMonth === 9 && gDay < 11)) {
    eYear = gYear - 8;
  } else {
    eYear = gYear - 7;
  }

  // Step 2: Ethiopian new year in Gregorian calendar
  let newYearDay = isGregorianLeap(gYear - 1) ? 12 : 11;

  // Create date objects
  let gDate = new Date(gYear, gMonth - 1, gDay);
  let ethNewYear = new Date(gYear, 8, newYearDay); // September = month 8 (0-based)

  // Step 3: Days difference
  let daysDiff = Math.floor((gDate - ethNewYear) / (1000 * 60 * 60 * 24));

  // Step 4: Convert to Ethiopian month/day
  let eMonth, eDay;
  if (daysDiff >= 0) {
    eMonth = Math.floor(daysDiff / 30) + 1;
    eDay = (daysDiff % 30) + 1;
  } else {
    // Before Ethiopian new year → recalc from previous year's new year
    let prevNewYearDay = isGregorianLeap(gYear - 2) ? 12 : 11;
    let prevEthNewYear = new Date(gYear - 1, 8, prevNewYearDay);
    daysDiff = Math.floor((gDate - prevEthNewYear) / (1000 * 60 * 60 * 24));
    eMonth = Math.floor(daysDiff / 30) + 1;
    eDay = (daysDiff % 30) + 1;
  }

  return { year: eYear, month: eMonth, day: eDay };
}

// Function to check if the selected Gregorian date's Ethiopian month is the current or a future Ethiopian month
function checkEthiopianMonthValidation(gregorianDateString) {
  if (!gregorianDateString) return true; // No date selected, so no validation needed

  const today = new Date();
  const currentGY = today.getFullYear();
  const currentGM = today.getMonth() + 1; // getMonth() is 0-based
  const currentGD = today.getDate();

  const selectedDate = new Date(gregorianDateString);
  const selectedGY = selectedDate.getFullYear();
  const selectedGM = selectedDate.getMonth() + 1;
  const selectedGD = selectedDate.getDate();

  const currentEC = gcToEc(currentGY, currentGM, currentGD);
  const selectedEC = gcToEc(selectedGY, selectedGM, selectedGD);

  // Check if the selected Ethiopian year is before the current Ethiopian year
  if (selectedEC.year < currentEC.year) {
    return false;
  }

  // If years are the same, check months
  if (selectedEC.year === currentEC.year) {
    if (selectedEC.month < currentEC.month) {
      return false;
    }
  }

  return true; // Date is in the current or a future Ethiopian month
}
