// This file will contain client-side JavaScript for the reports page.

document.addEventListener('DOMContentLoaded', () => {
    const addvendorsbtn = document.getElementById('openModalBtn');
    const goToWorkspaceBtn = document.getElementById('go-to-workspace-btn');
    const vendorSection = document.getElementById('vendor-management');
    const vendormodal = document.getElementById('addVendorModal');
    const vatReportBtn = document.getElementById('vat-report-btn');
    const reportButton2 = document.getElementById('report-button-2');
    const reportButton3 = document.getElementById('report-button-3');
    const managementButton = document.getElementById('management-button');
    const managementsection = document.getElementById('management-section')
    document.getElementById('back-to-login-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
    const generatejvreport = document.getElementById('generate-jv-report-btn');
    const reportsPageDefaultMessage = document.getElementById('reports-page-default-message');
    const vatReportSection = document.getElementById('vat-report-section');
    const jvreportbtn = document.getElementById('jv-report-btn')
    const jvReportSection = document.getElementById('jv-report-section');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const generateVatReportBtn = document.getElementById('generate-vat-report-btn');
    const vatReportTableBody = document.querySelector('#vat-report-table tbody');
    const summaryVatAmount = document.getElementById('summary-vat-amount');
    const summaryBaseTotal = document.getElementById('summary-base-total');
    const summaryTotalAmount = document.getElementById('summary-total-amount');
    const exportVatReportBtn = document.getElementById('export-vat-report-btn');

    // Custom Notification Modal Elements
    const customNotificationModal = document.getElementById('customNotificationModal');
    const notificationMessage = document.getElementById('notificationMessage');
    const closeNotificationSpan = document.querySelector('.close-notification');

    // Item Management Elements
    const itemsTabButton = document.querySelector('.tab-button[data-tab="items-tab"]');

    // Category Modal elements
    const addCategoryModal = document.getElementById('addCategoryModal');
    const openAddCategoryModalBtn = document.getElementById('openAddCategoryModalBtn');
    const closeAddCategoryModalSpan = addCategoryModal.querySelector('.close');
    const newCategoryNameInputModal = document.getElementById('newCategoryNameModal'); // Renamed ID
    const addCategoryBtnModal = document.getElementById('addCategoryBtnModal');
    const categoryModalTitle = addCategoryModal.querySelector('h2');
    const categoryEditIdInput = document.createElement('input'); // Hidden input for edit ID
    categoryEditIdInput.type = 'hidden';
    categoryEditIdInput.id = 'editCategoryId';
    addCategoryModal.querySelector('.modal-content').appendChild(categoryEditIdInput);
    const categoriesTableBody = document.querySelector('#categories-table tbody');

    // Subcategory Modal elements
    const addSubcategoryModal = document.getElementById('addSubcategoryModal');
    const openAddSubcategoryModalBtn = document.getElementById('openAddSubcategoryModalBtn');
    const closeAddSubcategoryModalSpan = addSubcategoryModal.querySelector('.close');
    const subcategoryCategorySelectModal = document.getElementById('subcategoryCategorySelectModal');
    const newSubcategoryNameInputModal = document.getElementById('newSubcategoryNameModal'); // Renamed ID
    const addSubcategoryBtnModal = document.getElementById('addSubcategoryBtnModal');
    const subcategoryModalTitle = addSubcategoryModal.querySelector('h2');
    const subcategoryEditIdInput = document.createElement('input'); // Hidden input for edit ID
    subcategoryEditIdInput.type = 'hidden';
    subcategoryEditIdInput.id = 'editSubcategoryId';
    addSubcategoryModal.querySelector('.modal-content').appendChild(subcategoryEditIdInput);
    const subcategoriesTableBody = document.querySelector('#subcategories-table tbody');

    // Item Management main page elements
    const itemCategorySelect = document.getElementById('itemCategorySelect');
    const itemSubcategorySelect = document.getElementById('itemSubcategorySelect');
    const newItemNameInput = document.getElementById('newItemName');
    const newItemUnitPriceInput = document.getElementById('newItemUnitPrice');
    const newItemDescriptionInput = document.getElementById('newItemDescription');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsTableBody = document.querySelector('#items-table tbody');

    // Sections for visibility control
    const categoryTableContainer = document.getElementById('categoryTableContainer');
    const subcategoryTableContainer = document.getElementById('subcategoryTableContainer');

    // Summary Report Elements
    const summaryReportBtn = document.getElementById('summary-report-btn');
    const summaryReportSection = document.getElementById('summary-report-section');
    const summaryStartDateInput = document.getElementById('summary-start-date');
    const summaryEndDateInput = document.getElementById('summary-end-date');
    const generateSummaryReportBtn = document.getElementById('generate-summary-report-btn');
    const summaryReportTableHead = document.querySelector('#summary-report-table thead tr');
    const summaryReportTableBody = document.querySelector('#summary-report-table tbody');

    // Summary Report Pagination Elements
    const summaryPaginationControls = document.querySelector('.summary-pagination-controls');
    const prevSummaryPageBtn = document.getElementById('prev-summary-page-btn');
    const nextSummaryPageBtn = document.getElementById('next-summary-page-btn');
    const summaryPageInfo = document.getElementById('summary-page-info');

    let currentPage = 0;
    const itemsPerPage = 10; // Number of item columns to display per page
    let allUniqueItems = [];
    let currentReportData = [];

    // Functions to open and close new modals
    function openModal(modalElement, mode = 'add', id = null) {
        modalElement.style.display = 'block';
        modalElement.setAttribute('data-mode', mode);
        if (id) {
            if (modalElement === addCategoryModal) {
                categoryEditIdInput.value = id;
            } else if (modalElement === addSubcategoryModal) {
                subcategoryEditIdInput.value = id;
            }
        }
    }

    function closeTheModal(modalElement) {
        modalElement.style.display = 'none';
        modalElement.removeAttribute('data-mode'); // Reset mode on close
        if (modalElement === addCategoryModal) {
            newCategoryNameInputModal.value = ''; // Clear input
            categoryModalTitle.textContent = 'Add Category'; // Reset title
            addCategoryBtnModal.textContent = 'Add Category'; // Reset button text
            categoryEditIdInput.value = ''; // Clear edit ID
        } else if (modalElement === addSubcategoryModal) {
            newSubcategoryNameInputModal.value = ''; // Clear input
            subcategoryCategorySelectModal.value = ''; // Reset dropdown
            subcategoryModalTitle.textContent = 'Add Subcategory'; // Reset title
            addSubcategoryBtnModal.textContent = 'Add Subcategory'; // Reset button text
            subcategoryEditIdInput.value = ''; // Clear edit ID
        }
    }

    // Function to show custom notification
    function showNotification(message) {
        notificationMessage.textContent = message;
        customNotificationModal.style.display = 'block';
    }

    // Function to hide custom notification
    function hideNotification() {
        customNotificationModal.style.display = 'none';
        notificationMessage.textContent = ''; // Clear message
    }

    // Event listeners for closing custom notification modal
    window.addEventListener('click', function (event) {
        if (event.target == customNotificationModal) {
            hideNotification();
        }
    });

    // Generic function to attach event listeners to table rows/buttons
    function attachTableEditDeleteListeners(tableBody, type, editFunction, deleteFunction) {
        tableBody.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('focus', () => {
                cell.setAttribute('contenteditable', 'true');
            });
            cell.addEventListener('blur', () => {
                cell.setAttribute('contenteditable', 'false');
            });
        });

        tableBody.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                editFunction(id);
            });
        });

        tableBody.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                deleteFunction(id);
            });
        });
    }

    // Function to load and render items
    async function loadItems(categoryId = null, subcategoryId = null) {
        try {
            let url = 'http://localhost:3000/items';
            const params = [];
            if (categoryId) params.push(`category_id=${categoryId}`);
            if (subcategoryId) params.push(`subcategory_id=${subcategoryId}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const response = await fetch(url);
            const items = await response.json();
            itemsTableBody.innerHTML = '';

            items.forEach(item => {
                const row = document.createElement('tr');
                row.setAttribute('data-item-id', item.item_id);
                row.innerHTML = `
                    <td class="editable-cell" data-field="item_name" contenteditable="true">${item.item_name}</td>
                    <td class="editable-cell" data-field="category_name" data-category-id="${item.category_id}">${item.category_name}</td>
                    <td class="editable-cell" data-field="subcategory_name" data-subcategory-id="${item.subcategory_id || ''}">${item.subcategory_name || ''}</td>
                    <td class="editable-cell" data-field="unit_price" contenteditable="true">${item.unit_price.toFixed(2)}</td>
                    <td class="editable-cell" data-field="description" contenteditable="true">${item.description || ''}</td>
                    <td class="action-buttons">
                        <button class="edit-btn button-base button-primary" data-id="${item.item_id}" data-type="item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Save
                        </button>
                        <button class="delete-btn button-base button-destructive" data-id="${item.item_id}" data-type="item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete
                        </button>
                    </td>
                `;
                itemsTableBody.appendChild(row);
            });

            attachTableEditDeleteListeners(itemsTableBody, 'item', editItem, deleteItem);

        } catch (error) {
            console.error('Error loading items:', error);
            showNotification('Error loading items.');
        }
    }

    // Function to load and render categories, and populate select dropdowns
    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/categories');
            const categories = await response.json();
            categoriesTableBody.innerHTML = '';
            
            // Clear and populate select elements for modals and main page
            subcategoryCategorySelectModal.innerHTML = '<option value="">Select Category</option>';
            itemCategorySelect.innerHTML = '<option value="">Select Category</option>';

            categories.forEach(category => {
                const row = document.createElement('tr');
                row.setAttribute('data-category-id', category.category_id);
                row.innerHTML = `
                    <td class="editable-cell" data-field="category_name" contenteditable="true">${category.category_name}</td>
                    <td class="action-buttons">
                        <button class="edit-btn button-base button-primary" data-id="${category.category_id}" data-type="category">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Save
                        </button>
                        <button class="delete-btn button-base button-destructive" data-id="${category.category_id}" data-type="category">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete
                        </button>
                        <button class="open-edit-modal-btn button-base button-secondary" data-id="${category.category_id}" data-type="category">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                    </td>
                `;
                categoriesTableBody.appendChild(row);

                const option1 = document.createElement('option');
                option1.value = category.category_id;
                option1.textContent = category.category_name;
                subcategoryCategorySelectModal.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = category.category_id;
                option2.textContent = category.category_name;
                itemCategorySelect.appendChild(option2);
            });

            attachTableEditDeleteListeners(categoriesTableBody, 'category', editCategory, deleteCategory);
            // Attach event listeners for new edit modal buttons
            categoriesTableBody.querySelectorAll('.open-edit-modal-btn[data-type="category"]').forEach(button => {
                button.addEventListener('click', (event) => {
                    const categoryId = event.target.dataset.id;
                    openEditCategoryModal(categoryId);
                });
            });

        } catch (error) {
            console.error('Error loading categories:', error);
            showNotification('Error loading categories.');
        }
    }

    // Function to load and render subcategories, and populate select dropdowns
    async function loadSubcategories(categoryId = null) {
        try {
            let url = 'http://localhost:3000/subcategories';
            if (categoryId) {
                url += `/${categoryId}`;
            } else {
                subcategoriesTableBody.innerHTML = '<tr><td colspan="3">Select a category to view subcategories.</td></tr>';
                itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
                return;
            }
            
            const response = await fetch(url);
            const subcategories = await response.json();
            subcategoriesTableBody.innerHTML = '';
            itemSubcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';

            if (subcategories.length === 0) {
                subcategoriesTableBody.innerHTML = '<tr><td colspan="3">No subcategories found for this category.</td></tr>';
                return;
            }

            const allCategories = await (await fetch('http://localhost:3000/categories')).json();
            const categoryMap = new Map(allCategories.map(cat => [cat.category_id, cat.category_name]));

            subcategories.forEach(subcategory => {
                const row = document.createElement('tr');
                row.setAttribute('data-subcategory-id', subcategory.subcategory_id);
                row.innerHTML = `
                    <td>${categoryMap.get(subcategory.category_id) || 'Unknown Category'}</td>
                    <td class="editable-cell" data-field="subcategory_name" contenteditable="true">${subcategory.subcategory_name}</td>
                    <td class="action-buttons">
                        <button class="edit-btn button-base button-primary" data-id="${subcategory.subcategory_id}" data-type="subcategory" data-category-id="${subcategory.category_id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Save
                        </button>
                        <button class="delete-btn button-base button-destructive" data-id="${subcategory.subcategory_id}" data-type="subcategory">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            Delete
                        </button>
                        <button class="open-edit-modal-btn button-base button-secondary" data-id="${subcategory.subcategory_id}" data-type="subcategory">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                    </td>
                `;
                subcategoriesTableBody.appendChild(row);

                const option = document.createElement('option');
                option.value = subcategory.subcategory_id;
                option.textContent = subcategory.subcategory_name;
                itemSubcategorySelect.appendChild(option);
            });

            attachTableEditDeleteListeners(subcategoriesTableBody, 'subcategory', editSubcategory, deleteSubcategory);
            // Attach event listeners for new edit modal buttons
            subcategoriesTableBody.querySelectorAll('.open-edit-modal-btn[data-type="subcategory"]').forEach(button => {
                button.addEventListener('click', (event) => {
                    const subcategoryId = event.target.dataset.id;
                    openEditSubcategoryModal(subcategoryId);
                });
            });

        } catch (error) {
            console.error('Error loading subcategories:', error);
            showNotification('Error loading subcategories.');
        }
    }

    goToWorkspaceBtn?.addEventListener('click', () => { window.location.href = 'workspace.html'; });


    function renderJVReport(data) {
        console.log(data)
        const table = document.getElementById("jv-report-table");
        let tbody = table.querySelector("tbody");
        let tfoot = table.querySelector("tfoot");
    
        // If tbody doesn't exist, create it
        if (!tbody) {
            tbody = document.createElement("tbody");
            table.appendChild(tbody);
        } else {
            tbody.innerHTML = ""; // clear previous rows
        }
    
        // If tfoot doesn't exist, create it
        if (!tfoot) {
            tfoot = document.createElement("tfoot");
            table.appendChild(tfoot);
        } else {
            tfoot.innerHTML = ""; // clear previous summary
        }
    
        let totalCreditBirr = 0,
            totalCreditCent = 0;
    
        // Render each row
        data.forEach(record => {
            // Split total_amount into Birr and Cents for Credit
            const total = record.total_amount ?? 0;
            const credit_birr = Math.floor(total);
            const credit_cent = Math.round((total - credit_birr) * 100);
    
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${record.item_name}</td>
                <td>0</td> <!-- Debt Birr placeholder -->
                <td>0</td> <!-- Debt Cents placeholder -->
                <td>${credit_birr}</td>
                <td>${credit_cent}</td>
            `;
            tbody.appendChild(row);
    
            // Keep totals
            totalCreditBirr += credit_birr;
            totalCreditCent += credit_cent;
        });
    
        // Normalize cents into birr
        totalCreditBirr += Math.floor(totalCreditCent / 100);
        totalCreditCent = totalCreditCent % 100;
    
        // Summary row
        const summaryRow = document.createElement("tr");
        summaryRow.innerHTML = `
            <td><strong>Summary</strong></td>
            <td><strong>0</strong></td> <!-- Debt Birr total placeholder -->
            <td><strong>0</strong></td> <!-- Debt Cents total placeholder -->
            <td><strong>${totalCreditBirr}</strong></td>
            <td><strong>${totalCreditCent}</strong></td>
        `;
        tfoot.appendChild(summaryRow);
    }
    
      
    const fetchjvreport = async (singledate) => {
        try{    
            const response = await fetch(`http://localhost:3000/reports/jv?singledate=${singledate}`)
            const reportData = await response.json();
            if (response.ok) {
                renderJVReport(reportData);
            } else {
                console.error('Error fetching JV report:', reportData.error);
                showNotification(`Error fetching JV report: ${reportData.error}`);
            }
        } catch (error) {
            console.error('Network error fetching JV report:', error);
            showNotification('Network error fetching JV report. Please check server connection.');
        }
        
    };
    // NEW: Function to toggle vendor row edit mode
    function toggleVendorEditMode(vendor_id, rowElement, enable) {
        const vendorNameCell = rowElement.querySelector('[data-field="vendor_name"]');
        const tinNumberCell = rowElement.querySelector('[data-field="tin_number"]');
        const mrcContainer = rowElement.querySelector('.mrc-container');
        const actionButtonsContainer = rowElement.querySelector('.action-buttons');

        if (enable) {
            rowElement.classList.add('editing');
            vendorNameCell.setAttribute('contenteditable', 'true');
            tinNumberCell.setAttribute('contenteditable', 'true');
            mrcContainer.querySelectorAll('.editable-mrc').forEach(input => {
                input.setAttribute('contenteditable', 'true');
            });
            mrcContainer.querySelector('.add-mrc-btn').style.display = 'inline-flex';
            mrcContainer.querySelectorAll('.remove-mrc-btn').forEach(btn => btn.style.display = 'inline-flex');

            actionButtonsContainer.innerHTML = `
                <button class="save-vendor-btn button-base button-primary" data-vendor-id="${vendor_id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save
                </button>
                <button class="delete-vendor-btn button-base button-destructive" data-vendor-id="${vendor_id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    Delete
                </button>
            `;
        } else {
            rowElement.classList.remove('editing');
            vendorNameCell.setAttribute('contenteditable', 'false');
            tinNumberCell.setAttribute('contenteditable', 'false');
            mrcContainer.querySelectorAll('.editable-mrc').forEach(input => {
                input.setAttribute('contenteditable', 'false');
            });
            mrcContainer.querySelector('.add-mrc-btn').style.display = 'none';
            mrcContainer.querySelectorAll('.remove-mrc-btn').forEach(btn => btn.style.display = 'none');

            actionButtonsContainer.innerHTML = `
                <button class="edit-vendor-btn button-base button-secondary" data-vendor-id="${vendor_id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                </button>
            `;
        }
        // Re-attach all necessary event listeners after changing innerHTML
        loadVendorActionListeners(rowElement); // A new helper function for this
    }

    // NEW: Helper function to attach action listeners to a specific vendor row
    function loadVendorActionListeners(rowElement) {
        rowElement.querySelectorAll('.edit-vendor-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const vendorId = event.target.dataset.vendorId || event.target.closest('button').dataset.vendorId;
                toggleVendorEditMode(vendorId, rowElement, true);
            });
        });

        rowElement.querySelectorAll('.save-vendor-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const vendorId = event.target.dataset.vendorId || event.target.closest('button').dataset.vendorId;
                editVendor(vendorId, rowElement); // Pass rowElement
            });
        });

        rowElement.querySelectorAll('.delete-vendor-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const vendorId = event.target.dataset.vendorId || event.target.closest('button').dataset.vendorId;
                deleteVendor(vendorId, rowElement); // Pass rowElement
            });
        });
        
        // Attach event listeners for dynamically added MRC input fields and buttons (only if in editing mode)
        rowElement.querySelectorAll('.add-mrc-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const mrcContainer = event.target.closest('.mrc-container');
                const newMrcInputGroup = document.createElement('div');
                newMrcInputGroup.classList.add('mrc-input-group');
                if (rowElement.classList.contains('editing')) {
                    newMrcInputGroup.innerHTML = `
                        <input type="text" class="editable-mrc" value="" contenteditable="true" />
                        <button type="button" class="remove-mrc-btn button-base button-destructive">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-circle"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                        </button>
                    `;
                    mrcContainer.insertBefore(newMrcInputGroup, event.target);
                    newMrcInputGroup.querySelector('.editable-mrc').focus();
                    // No need to call addMrcEventListeners here, as this function will be called for the whole row again
                }
            });
        });

        rowElement.querySelectorAll('.remove-mrc-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                if (rowElement.classList.contains('editing')) {
                    event.target.closest('.mrc-input-group').remove();
                }
            });
        });

        // Re-attach focus/blur listeners for editable cells and MRC inputs
        rowElement.querySelectorAll('.editable-cell[data-field="vendor_name"], .editable-cell[data-field="tin_number"]').forEach(cell => {
            cell.addEventListener('focus', () => {
                if (rowElement.classList.contains('editing')) {
                    cell.setAttribute('contenteditable', 'true');
                } else {
                    cell.setAttribute('contenteditable', 'false');
                }
            });
            cell.addEventListener('blur', () => {
                cell.setAttribute('contenteditable', 'false');
            });
        });

        rowElement.querySelectorAll(".editable-mrc").forEach(input => {
            input.addEventListener("focus", () => {
                if (rowElement.classList.contains('editing')) {
                    input.setAttribute("contenteditable", "true");
                } else {
                    input.setAttribute("contenteditable", "false");
                }
            });
            input.addEventListener("blur", () => {
                input.setAttribute("contenteditable", "false");
            });
        });
    }
    /**
 * Gathers edited data from the table for a specific vendor and sends it to the update endpoint.
 * @param {string} vendor_id - The UUID of the vendor to update.
 */
async function editVendor(vendor_id, rowElement) {
    // Find all table rows that belong to this specific vendor
    const vendorRows = document.querySelectorAll(`tr[data-vendor-id="${vendor_id}"]`);
    if (vendorRows.length === 0) {
        console.error("Could not find rows for vendor:", vendor_id);
        return;
    }

    // The first row always contains the main vendor details
    const firstRow = vendorRows[0];
    const vendorName = firstRow.querySelector('[data-field="vendor_name"]').textContent.trim();
    const tinNumber = firstRow.querySelector('[data-field="tin_number"]').textContent.trim();
    
    // Collect all MRC numbers from the input fields
    const mrcInputs = firstRow.querySelectorAll('.mrc-container .editable-mrc');
    const mrcNumbers = Array.from(mrcInputs).map(input => input.value.trim()).filter(mrc => mrc !== '');

    // Prepare the data payload in the format your server expects
    const updatedData = {
        vendor_name: vendorName,
        tin_number: tinNumber,
        mrc_numbers: mrcNumbers,
    };

    try {
        const response = await fetch(`http://localhost:3000/updatevendors/${vendor_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });

        if (response.ok) {
            console.log("Vendor updated successfully");
            showNotification("Vendor saved!");
            toggleVendorEditMode(vendor_id, rowElement, false); // Disable editing after save
            // loadVendors(); // Refresh the table to reflect the changes (optional, as toggle mode should handle it)
        } else {
            const errorData = await response.json();
            console.error("Failed to update vendor:", errorData.message);
            showNotification(`Failed to update vendor: ${errorData.message}`);
        }
    } catch (error) {
        console.error("An error occurred while updating the vendor:", error);
        showNotification("An error occurred while updating the vendor. Please try again.");
    }
}
    async function loadVendors() {
        const tableBody = document.querySelector("#vendors-table tbody");
        tableBody.innerHTML = ""; // clear previous rows
    
        try {
            const response = await fetch("http://localhost:3000/vendors");
            const vendors = await response.json();
    
            vendors.forEach(vendor => {
                const mrcNumbers = vendor.mrc_numbers || [];
    
                // Create a single row for each vendor
                const row = document.createElement("tr");
                row.setAttribute('data-vendor-id', vendor.vendor_id);
    
                // Construct MRC numbers HTML
                let mrcInputsHtml = '';
                if (mrcNumbers.length > 0) {
                    mrcInputsHtml = mrcNumbers.map(mrc => `
                        <div class="mrc-input-group">
                            <input type="text" class="editable-mrc" value="${mrc}" contenteditable="false" />
                            <button type="button" class="remove-mrc-btn button-base button-destructive" style="display: none;">-</button>
                        </div>
                    `).join('');
                } else {
                    mrcInputsHtml = `
                        <div class="mrc-input-group">
                            <input type="text" class="editable-mrc" value="" contenteditable="false" />
                            <button type="button" class="remove-mrc-btn button-base button-destructive" style="display: none;">-</button>
                        </div>
                    `;
                }

                row.innerHTML = `
                    <td class="editable-cell" data-field="vendor_name" contenteditable="false">${vendor.vendor_name}</td>
                    <td class="editable-cell" data-field="tin_number" contenteditable="false">${vendor.tin_number}</td>
                    <td class="mrc-container" data-field="mrc_numbers">
                        ${mrcInputsHtml}
                        <button type="button" class="add-mrc-btn button-base button-primary" style="display: none;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                        </button>
                    </td>
                    <td class="action-buttons">
                        <button class="edit-vendor-btn button-base button-secondary" data-vendor-id="${vendor.vendor_id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Attach listeners to all dynamically created rows after they are appended
            tableBody.querySelectorAll('tr').forEach(rowElement => {
                loadVendorActionListeners(rowElement);
            });

        } catch (err) {
            console.error("Error fetching vendors:", err);
            tableBody.innerHTML = `<tr><td colspan="4">Failed to load vendors.</td></tr>`;
        }
    }
    /**
 * Deletes a vendor after user confirmation.
 * @param {string} vendor_id - The UUID of the vendor to delete.
 */
async function deleteVendor(vendor_id, rowElement) {
    // Confirm with the user before deleting to prevent accidents
    if (!confirm("Are you sure you want to delete this vendor?")) {
        return; // Stop the function if the user clicks "Cancel"
    }

    try {
        const response = await fetch(`http://localhost:3000/deletevendors/${vendor_id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            console.log("Vendor deleted successfully");
            showNotification("Vendor deleted successfully!");
            rowElement.remove(); // Remove the row directly
        } else {
            console.error("Failed to delete vendor. Server responded with an error.");
            showNotification("Failed to delete vendor. Please try again.");
        }
    } catch (error) {
        console.error("An error occurred while trying to delete the vendor:", error);
        showNotification("An error occurred while trying to delete the vendor. Please try again.");
    }
}

    
    
    const fetchVatReport = async (startDate, endDate) => {
        try {
            // This URL points to your existing endpoint that gets data for the HTML table
            const response = await fetch(`http://localhost:3000/reports/vat?startDate=${startDate}&endDate=${endDate}`);
            const reportData = await response.json();

            if (response.ok) {
                renderVatReport(reportData);
            } else {
                console.error('Error fetching VAT report:', reportData.error);
                showNotification(`Error fetching VAT report: ${reportData.error}`);
            }
        } catch (error) {
            console.error('Network error fetching VAT report:', error);
            showNotification('Network error fetching VAT report. Please check server connection.');
        }
    };
    const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;

        // Remove active from all buttons & contents
        tabButtons.forEach(btn => btn.classList.remove('active', 'button-primary'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Activate clicked tab & corresponding content
        button.classList.add('active', 'button-primary'); // Add button-primary for active state
        const content = document.getElementById(targetTab);
        content.classList.add('active');

        // Show vendor section if vendor tab clicked
        const vendorSection = document.getElementById('vendor-management');
        if (targetTab === 'vendor-tab') {
            vendorSection.style.display = 'block';
            loadVendors(); // call your function to fetch & populate vendors
        } else {
            vendorSection.style.display = 'none';
        }
    });
});

    const renderVatReport = (reportData) => {
        vatReportTableBody.innerHTML = ''; // Clear previous data
        let totalVat = 0;
        let totalBase = 0;
        let totalAmount = 0;

        if (reportData.length === 0) {
            vatReportTableBody.innerHTML = '<tr><td colspan="10">No data available for the selected date range.</td></tr>';
            summaryVatAmount.textContent = '0.00';
            summaryBaseTotal.textContent = '0.00';
            summaryTotalAmount.textContent = '0.00';
            return;
        }

        // Group by vendor for better readability
        const groupedByVendor = reportData.reduce((acc, record) => {
            if (!acc[record.vendor_name]) {
                acc[record.vendor_name] = [];
            }
            acc[record.vendor_name].push(record);
            return acc;
        }, {});

        for (const vendorName in groupedByVendor) {
            const vendorRecords = groupedByVendor[vendorName];
            let firstRowOfVendor = true;

            vendorRecords.forEach(record => {
                const row = document.createElement('tr');
                // Note: The database query now calculates base_total directly.
                const baseTotal = record.base_total || (record.total_amount - record.vat_amount);

                row.innerHTML = `
                    <td>${firstRowOfVendor ? record.vendor_name : ''}</td>
                    <td>${firstRowOfVendor ? record.tin_number : ''}</td>
                    <td>${record.mrc_number}</td>
                    <td>${record.purchase_date}</td>
                    <td>${record.item_name}</td>
                    <td>${record.quantity}</td>
                    <td>${record.unit_price.toFixed(2)}</td>
                    <td>${record.vat_percentage}%</td>
                    <td>${record.vat_amount.toFixed(2)}</td>
                    <td>${baseTotal.toFixed(2)}</td>
                    <td>${record.total_amount.toFixed(2)}</td>
                `;
                vatReportTableBody.appendChild(row);
                firstRowOfVendor = false;

                totalVat += record.vat_amount;
                totalBase += baseTotal;
                totalAmount += record.total_amount;
            });
        }

        summaryVatAmount.textContent = totalVat.toFixed(2);
        summaryBaseTotal.textContent = totalBase.toFixed(2);
        summaryTotalAmount.textContent = totalAmount.toFixed(2);
    };
    jvreportbtn?.addEventListener('click', ()=>{
        if(reportsPageDefaultMessage) reportsPageDefaultMessage.style.display = 'none';
        if(vatReportSection) vatReportSection.style.display = 'none';
        if(jvReportSection) jvReportSection.style.display = 'block';
        if(managementsection) managementsection.style.display = 'none';
        if (summaryReportSection) summaryReportSection.style.display = 'none';
        
    })
    addvendorsbtn?.addEventListener('click', ()=>{
        if(vendormodal) vendormodal.style.display = 'block';

    })
    const addVendorModal = document.getElementById('addVendorModal');
  const closeModalSpan = document.querySelector('.modal .close'); // The 'x' icon
  const addMrcBtn = document.getElementById('addMrcBtn');
  const mrcContainer = document.getElementById('mrcContainer');
  const addVendorForm = document.getElementById('addVendorForm');

  // --- Modal Control Functions ---

  // Function to close the modal and reset the form
  const closeModal = () => {
    addVendorModal.style.display = 'none';
    addVendorForm.reset(); // Clear the form fields

    // Remove any extra MRC fields that were added
    const dynamicMrcInputs = mrcContainer.querySelectorAll('.mrc-input');
    // Start loop from 1 to keep the first, original input field
    for (let i = 1; i < dynamicMrcInputs.length; i++) {
        dynamicMrcInputs[i].remove();
    }
  };

  // --- Event Listeners for Closing the Modal ---

  // Close the modal when the 'x' icon is clicked
  closeModalSpan.addEventListener('click', closeModal);

  // Close the modal if the user clicks on the background overlay
  window.addEventListener('click', function (event) {
    if (event.target == addVendorModal) {
      closeModal();
    }
  });


  // --- Logic for Dynamic MRC Inputs ---

  const addMrcInput = () => {
    const newMrcInput = document.createElement('div');
    newMrcInput.classList.add('mrc-input');
    newMrcInput.innerHTML = `
      <input type="text" name="mrcNumbers[]" />
      <button type="button" class="removeMrc button-base button-destructive">Remove</button>
    `;
    mrcContainer.appendChild(newMrcInput);
  };

  addMrcBtn.addEventListener('click', addMrcInput);

  // Use event delegation for removing MRC inputs
  mrcContainer.addEventListener('click', function (e) {
    if (e.target.classList.contains('removeMrc')) {
      e.target.parentElement.remove();
    }
  });


  // --- Form Submission Logic ---

  addVendorForm.addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent default page reload

    const vendorName = document.getElementById('vendorName').value;
    const tinNumber = document.getElementById('tinNumber').value;
    const mrcInputs = document.querySelectorAll('input[name="mrcNumbers[]"]');
    
    // Collect all non-empty MRC numbers
    const mrcNumbers = [];
    mrcInputs.forEach(input => {
      if (input.value.trim() !== '') {
        mrcNumbers.push(input.value.trim());
      }
    });

    const formData = {
      vendor_name: vendorName,
      tin_number: tinNumber,
      mrc_numbers: mrcNumbers,
    };

    try {
      const response = await fetch('http://localhost:3000/addvendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Vendor added successfully:', result);
        closeModal(); // Close the modal and reset the form on success
      } else {
        console.error('Failed to add vendor. Server responded with an error.');
      }
    } catch (error) {
      console.error('An error occurred while submitting the form:', error);
    }
  });
    vatReportBtn?.addEventListener('click', () => {
        // Hide default message, show VAT report section
        if (reportsPageDefaultMessage) reportsPageDefaultMessage.style.display = 'none';
        if (vatReportSection) vatReportSection.style.display = 'block';
        if(jvReportSection) jvReportSection.style.display = 'none';
        if (summaryReportSection) summaryReportSection.style.display = 'none';

        if(managementsection) managementsection.style.display = 'none';

        // Set default dates for the last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];
        
        // Automatically generate report on button click
        fetchVatReport(startDateInput.value, endDateInput.value);
    });
    generatejvreport?.addEventListener('click', ()=>{
        const singleDate = document.getElementById("single-date").value; // get date from input

        if (!singleDate) {
          showNotification("Please select a date first.");
          return;
        }
        
        fetchjvreport(singleDate);
    })

    generateVatReportBtn?.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates.');
            return;
        }
        fetchVatReport(startDate, endDate);
    });

    managementButton?.addEventListener('click', () => { 
        if (reportsPageDefaultMessage) reportsPageDefaultMessage.style.display = 'none';
        if (vatReportSection) vatReportSection.style.display = 'none';
        if(jvReportSection) jvReportSection.style.display = 'none';
        if(managementsection) managementsection.style.display = 'block';
        if (summaryReportSection) summaryReportSection.style.display = 'none';

        vendorSection.style.display = 'block';
        loadVendors()
    });

    summaryReportBtn?.addEventListener('click', () => {
        if (reportsPageDefaultMessage) reportsPageDefaultMessage.style.display = 'none';
        if (vatReportSection) vatReportSection.style.display = 'none';
        if (jvReportSection) jvReportSection.style.display = 'none';
        if (managementsection) managementsection.style.display = 'none';
        if (summaryReportSection) summaryReportSection.style.display = 'block';

        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        summaryStartDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        summaryEndDateInput.value = today.toISOString().split('T')[0];
        
        fetchSummaryReport(summaryStartDateInput.value, summaryEndDateInput.value);
    });

    generateSummaryReportBtn?.addEventListener('click', () => {
        const startDate = summaryStartDateInput.value;
        const endDate = summaryEndDateInput.value;

        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates.');
            return;
        }
        fetchSummaryReport(startDate, endDate);
    });

    async function fetchSummaryReport(startDate, endDate) {
        try {
            const response = await fetch(`http://localhost:3000/reports/summary?startDate=${startDate}&endDate=${endDate}`);
            const reportData = await response.json();

            if (response.ok) {
                renderSummaryReport(reportData);
            } else {
                console.error('Error fetching Summary report:', reportData.error);
                showNotification(`Error fetching Summary report: ${reportData.error}`);
            }
        } catch (error) {
            console.error('Network error fetching Summary report:', error);
            showNotification('Network error fetching Summary report. Please check server connection.');
        }
    }

    function renderSummaryReport(reportData) {
        summaryReportTableHead.innerHTML = '<th>Date</th>'; // Reset header
        summaryReportTableBody.innerHTML = ''; // Clear previous data

        if (!reportData || reportData.length === 0) {
            summaryReportTableBody.innerHTML = '<tr><td colspan="2">No data available for the selected date range.</td></tr>';
            summaryPaginationControls.style.display = 'none';
            return;
        }

        currentReportData = reportData; // Store full report data
        allUniqueItems = Array.from(new Set(reportData.map(record => record.item_name)));
        currentPage = 0; // Reset to first page
        renderSummaryPage(currentPage);
        summaryPaginationControls.style.display = 'flex'; // Show pagination controls
    }

    function renderSummaryPage(page) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, allUniqueItems.length);
        const itemsToDisplay = allUniqueItems.slice(startIndex, endIndex);

        // Update table header
        summaryReportTableHead.innerHTML = '<th>Date</th>';
        itemsToDisplay.forEach(item => {
            const th = document.createElement('th');
            th.textContent = item;
            summaryReportTableHead.appendChild(th);
        });

        // Update table body
        summaryReportTableBody.innerHTML = '';
        const groupedByDate = currentReportData.reduce((acc, record) => {
            if (!acc[record.purchase_date]) {
                acc[record.purchase_date] = {};
            }
            acc[record.purchase_date][record.item_name] = (acc[record.purchase_date][record.item_name] || 0) + record.total_amount;
            return acc;
        }, {});

        const dates = Object.keys(groupedByDate).sort();

        dates.forEach(date => {
            const row = document.createElement('tr');
            const dateCell = document.createElement('td');
            dateCell.textContent = date;
            row.appendChild(dateCell);

            itemsToDisplay.forEach(item => {
                const totalAmount = groupedByDate[date][item] || 0;
                const itemCell = document.createElement('td');
                itemCell.textContent = totalAmount.toFixed(2);
                row.appendChild(itemCell);
            });
            summaryReportTableBody.appendChild(row);
        });

        // Update pagination info and button states
        const totalPages = Math.ceil(allUniqueItems.length / itemsPerPage);
        summaryPageInfo.textContent = `Page ${page + 1} of ${totalPages}`;
        prevSummaryPageBtn.disabled = page === 0;
        nextSummaryPageBtn.disabled = page === totalPages - 1;
    }

    prevSummaryPageBtn?.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderSummaryPage(currentPage);
        }
    });

    nextSummaryPageBtn?.addEventListener('click', () => {
        const totalPages = Math.ceil(allUniqueItems.length / itemsPerPage);
        if (currentPage < totalPages - 1) {
            currentPage++;
            renderSummaryPage(currentPage);
        }
    });


    // --- MODIFIED EXPORT BUTTON LOGIC ---
    exportVatReportBtn?.addEventListener('click', () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates to export.');
            return;
        }

        // Construct the URL for the new server-side export endpoint in server.js
        const exportUrl = `http://localhost:3000/export/vat-report?startDate=${startDate}&endDate=${endDate}`;

        // Set the window's location to this URL.
        // The browser will then make a GET request to your server.
        // The server will respond with the Excel file, and the browser will handle the download.
        window.location.href = exportUrl;
    });

    // CATEGORY CRUD Functions
    async function addCategory() {
        const mode = addCategoryModal.dataset.mode;
        const category_id = categoryEditIdInput.value;
        const category_name = newCategoryNameInputModal.value.trim();

        if (!category_name) {
            showNotification('Category name cannot be empty.');
            return;
        }

        try {
            let response;
            let result;
            if (mode === 'edit' && category_id) {
                response = await fetch(`http://localhost:3000/categories/${category_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_name })
                });
                result = await response.json();
                if (response.ok) {
                    showNotification('Category updated successfully!');
                    closeTheModal(addCategoryModal); 
                    loadCategories();
                } else {
                    showNotification(`Failed to update category: ${result.error}`);
                }
            } else {
                // Add new category logic
                response = await fetch('http://localhost:3000/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_name })
                });
                result = await response.json();
                if (response.ok) {
                    showNotification('Category added successfully!');
                    newCategoryNameInputModal.value = ''; // Clear input in modal
                    closeTheModal(addCategoryModal); // Close the modal
                    loadCategories();
                } else {
                    showNotification(`Failed to add category: ${result.error}`);
                }
            }
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} category:`, error);
            showNotification(`Network error while ${mode === 'edit' ? 'updating' : 'adding'} category.`);
        }
    }

    async function openEditCategoryModal(categoryId) {
        try {
            const response = await fetch(`http://localhost:3000/categories`); // Fetch all to find by ID
            const categories = await response.json();
            const categoryToEdit = categories.find(cat => cat.category_id === categoryId);

            if (categoryToEdit) {
                openModal(addCategoryModal, 'edit', categoryId);
                categoryModalTitle.textContent = 'Edit Category';
                newCategoryNameInputModal.value = categoryToEdit.category_name;
                addCategoryBtnModal.textContent = 'Save Changes';
            } else {
                showNotification('Category not found for editing.');
            }
        } catch (error) {
            console.error('Error fetching category for edit:', error);
            showNotification('Network error fetching category details.');
        }
    }

    async function editCategory(categoryId) {
        // This function is now mostly handled by addCategory after checking modal mode
        // Kept for consistency if direct table editing is desired later
        const row = categoriesTableBody.querySelector(`tr[data-category-id="${categoryId}"]`);
        const category_name = row.querySelector('[data-field="category_name"]').textContent.trim();

        if (!category_name) {
            showNotification('Category name cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/categories/${categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_name })
            });
            const result = await response.json();
            if (response.ok) {
                showNotification('Category updated successfully!');
                loadCategories();
            } else {
                showNotification(`Failed to update category: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating category:', error);
            showNotification('Network error while updating category.');
        }
    }

    async function deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category? This will also delete associated subcategories and items.')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/categories/${categoryId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showNotification('Category deleted successfully!');
                loadCategories();
                loadSubcategories(); // Reload subcategories as some might be deleted
                loadItems(); // Reload items as some might be deleted
            } else {
                const result = await response.json();
                showNotification(`Failed to delete category: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('Network error while deleting category.');
        }
    }

    // SUBCATEGORY CRUD Functions
    async function addSubcategory() {
        const mode = addSubcategoryModal.dataset.mode;
        const subcategory_id = subcategoryEditIdInput.value;
        const category_id = subcategoryCategorySelectModal.value;
        const subcategory_name = newSubcategoryNameInputModal.value.trim();

        if (!category_id) {
            showNotification('Please select a category.');
            return;
        }
        if (!subcategory_name) {
            showNotification('Subcategory name cannot be empty.');
            return;
        }

        try {
            let response;
            let result;
            if (mode === 'edit' && subcategory_id) {
                response = await fetch(`http://localhost:3000/subcategories/${subcategory_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_id, subcategory_name })
                });
                result = await response.json();
                if (response.ok) {
                    showNotification('Subcategory updated successfully!');
                    closeTheModal(addSubcategoryModal); 
                    loadSubcategories(category_id);
                } else {
                    showNotification(`Failed to update subcategory: ${result.error}`);
                }
            } else {
                // Add new subcategory logic
                response = await fetch('http://localhost:3000/subcategories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category_id, subcategory_name })
                });
                result = await response.json();
                if (response.ok) {
                    showNotification('Subcategory added successfully!');
                    newSubcategoryNameInputModal.value = ''; // Clear input in modal
                    closeTheModal(addSubcategoryModal); // Close the modal
                    loadSubcategories(category_id);
                } else {
                    showNotification(`Failed to add subcategory: ${result.error}`);
                }
            }
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} subcategory:`, error);
            showNotification(`Network error while ${mode === 'edit' ? 'updating' : 'adding'} subcategory.`);
        }
    }

    async function openEditSubcategoryModal(subcategoryId) {
        try {
            // Fetch all subcategories (or specifically for the current category if performance is an issue)
            const response = await fetch(`http://localhost:3000/subcategories/${subcategoryCategorySelectModal.value || 'all'}`); // Assuming 'all' endpoint exists or handle appropriately
            const subcategories = await response.json();
            const subcategoryToEdit = subcategories.find(sub => sub.subcategory_id === subcategoryId);

            if (subcategoryToEdit) {
                openModal(addSubcategoryModal, 'edit', subcategoryId);
                subcategoryModalTitle.textContent = 'Edit Subcategory';
                newSubcategoryNameInputModal.value = subcategoryToEdit.subcategory_name;
                // Ensure the category dropdown in the modal is set to the correct category for the subcategory
                loadCategories().then(() => {
                    subcategoryCategorySelectModal.value = subcategoryToEdit.category_id;
                });
                addSubcategoryBtnModal.textContent = 'Save Changes';
            } else {
                showNotification('Subcategory not found for editing.');
            }
        } catch (error) {
            console.error('Error fetching subcategory for edit:', error);
            showNotification('Network error fetching subcategory details.');
        }
    }

    async function editSubcategory(subcategoryId) {
        // This function is now mostly handled by addSubcategory after checking modal mode
        // Kept for consistency if direct table editing is desired later
        const row = subcategoriesTableBody.querySelector(`tr[data-subcategory-id="${subcategoryId}"]`);
        const subcategory_name = row.querySelector('[data-field="subcategory_name"]').textContent.trim();
        const category_id = row.querySelector('.edit-btn').dataset.categoryId; // Get category_id from the button

        if (!subcategory_name) {
            showNotification('Subcategory name cannot be empty.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/subcategories/${subcategoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id, subcategory_name })
            });
            const result = await response.json();
            if (response.ok) {
                showNotification('Subcategory updated successfully!');
                loadSubcategories(category_id);
            } else {
                showNotification(`Failed to update subcategory: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating subcategory:', error);
            showNotification('Network error while updating subcategory.');
        }
    }

    async function deleteSubcategory(subcategory_id) {
        if (!confirm('Are you sure you want to delete this subcategory? This will also remove its association from items.')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/subcategories/${subcategory_id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showNotification('Subcategory deleted successfully!');
                // Reload only the subcategories for the current category, if one is selected
                const selectedCategoryId = subcategoryCategorySelectModal.value;
                loadSubcategories(selectedCategoryId || null);
                loadItems(); // Reload items as some might have their subcategory association removed
            } else {
                const result = await response.json();
                showNotification(`Failed to delete subcategory: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            showNotification('Network error while deleting subcategory.');
        }
    }

    // ITEM CRUD Functions
    async function addItem() {
        const item_name = newItemNameInput.value.trim();
        const category_id = itemCategorySelect.value;
        const subcategory_id = itemSubcategorySelect.value || null; // Subcategory is optional
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
            const result = await response.json();
            if (response.ok) {
                showNotification('Item added successfully!');
                newItemNameInput.value = '';
                newItemUnitPriceInput.value = '';
                newItemDescriptionInput.value = '';
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value);
            } else {
                showNotification(`Failed to add item: ${result.error}`);
            }
        } catch (error) {
            console.error('Error adding item:', error);
            showNotification('Network error while adding item.');
        }
    }

    async function editItem(itemId) {
        const row = itemsTableBody.querySelector(`tr[data-item-id="${itemId}"]`);
        const item_name = row.querySelector('[data-field="item_name"]').textContent.trim();
        const unit_price = parseFloat(row.querySelector('[data-field="unit_price"]').textContent.trim());
        const description = row.querySelector('[data-field="description"]').textContent.trim();

        // For category and subcategory, we need their IDs, not just displayed names
        // This assumes that the displayed name is sufficient to re-select the original ID
        // In a more robust solution, you might have hidden inputs for IDs or re-fetch on edit
        const category_id = row.querySelector('[data-field="category_name"]').dataset.categoryId; // Assuming data-category-id exists
        const subcategory_id = row.querySelector('[data-field="subcategory_name"]').dataset.subcategoryId || null; // Assuming data-subcategory-id exists

        if (!item_name || !category_id || isNaN(unit_price)) {
            showNotification('Item name, category, and a valid unit price are required.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name, category_id, subcategory_id, unit_price, description })
            });
            const result = await response.json();
            if (response.ok) {
                showNotification('Item updated successfully!');
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value);
            } else {
                showNotification(`Failed to update item: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            showNotification('Network error while updating item.');
        }
    }

    async function deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/items/${itemId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showNotification('Item deleted successfully!');
                loadItems(itemCategorySelect.value, itemSubcategorySelect.value);
            } else {
                const result = await response.json();
                showNotification(`Failed to delete item: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showNotification('Network error while deleting item.');
        }
    }

    // Initial loads and event listeners
    itemsTabButton?.addEventListener('click', () => {
        // Only load items and hide category/subcategory tables initially
        loadItems();
        loadCategories(); // Ensure categories are loaded for item dropdowns
        categoryTableContainer.style.display = 'none';
        subcategoryTableContainer.style.display = 'none';
    });

    // Event listeners for opening and closing new modals
    openAddCategoryModalBtn?.addEventListener('click', () => { 
        openModal(addCategoryModal); 
        categoryModalTitle.textContent = 'Add Category';
        addCategoryBtnModal.textContent = 'Add Category';
        addCategoryBtnModal.classList.add('button-base', 'button-primary'); // Add new classes
        newCategoryNameInputModal.value = ''; // Clear input on open
    });
    closeAddCategoryModalSpan?.addEventListener('click', () => { closeTheModal(addCategoryModal); });
    window.addEventListener('click', function (event) {
        if (event.target == addCategoryModal) {
            closeTheModal(addCategoryModal);
        }
    });

    openAddSubcategoryModalBtn?.addEventListener('click', () => { 
        openModal(addSubcategoryModal); 
        subcategoryModalTitle.textContent = 'Add Subcategory';
        addSubcategoryBtnModal.textContent = 'Add Subcategory';
        addSubcategoryBtnModal.classList.add('button-base', 'button-primary'); // Add new classes
        loadCategories(); // Load categories for the subcategory modal dropdown
        newSubcategoryNameInputModal.value = ''; // Clear input on open
        subcategoryCategorySelectModal.value = ''; // Reset dropdown
    });
    closeAddSubcategoryModalSpan?.addEventListener('click', () => { closeTheModal(addSubcategoryModal); });
    window.addEventListener('click', function (event) {
        if (event.target == addSubcategoryModal) {
            closeTheModal(addSubcategoryModal);
        }
    });

    addCategoryBtnModal?.addEventListener('click', addCategory);
    addSubcategoryBtnModal?.addEventListener('click', addSubcategory);
    addItemBtn?.addEventListener('click', addItem);

    // Event listener for category selection change for subcategories (in modal)
    subcategoryCategorySelectModal.addEventListener('change', (event) => {
        // No need to load subcategories into the table here, just populate the item dropdowns if needed elsewhere
    });

    // Event listener for category selection change for items (main page)
    itemCategorySelect.addEventListener('change', (event) => {
        const selectedCategoryId = event.target.value;
        // Reload subcategories dropdown based on selected category
        loadSubcategories(selectedCategoryId || null);
        // Reload items based on selected category
        loadItems(selectedCategoryId);
    });

    // Event listener for subcategory selection change for items (main page)
    itemSubcategorySelect.addEventListener('change', (event) => {
        const selectedSubcategoryId = event.target.value;
        const selectedCategoryId = itemCategorySelect.value;
        loadItems(selectedCategoryId, selectedSubcategoryId);
    });
});