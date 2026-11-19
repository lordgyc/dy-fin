/**
 * DY Finance – Software Summary Report Generator
 * Generates a comprehensive Excel (.xlsx) file summarizing the software
 * Run: node generate-software-report.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ─── Helper: create a styled cell ───────────────────────────────────────────
function cell(v, bold = false, bg = null, align = 'left', fontSize = 11, color = '000000') {
  const c = { v, t: typeof v === 'number' ? 'n' : 's' };
  const font = { bold, sz: fontSize, color: { rgb: color } };
  const fill = bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : { patternType: 'none' };
  const alignment = { horizontal: align, vertical: 'center', wrapText: true };
  c.s = { font, fill, alignment, border: {
    top:    { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left:   { style: 'thin', color: { rgb: 'CCCCCC' } },
    right:  { style: 'thin', color: { rgb: 'CCCCCC' } }
  }};
  return c;
}

function hdr(v, bg = '1A3A5C', fontSize = 12) {
  return cell(v, true, bg, 'center', fontSize, 'FFFFFF');
}

function subhdr(v) {
  return cell(v, true, '2E75B6', 'left', 11, 'FFFFFF');
}

function label(v) {
  return cell(v, true, 'D6E4F7', 'left', 10, '1A3A5C');
}

function val(v) {
  return cell(v, false, 'FFFFFF', 'left', 10);
}

function altVal(v) {
  return cell(v, false, 'EEF4FB', 'left', 10);
}

function numCell(v) {
  return { v, t: 'n', s: { font: { sz: 10 }, alignment: { horizontal: 'right' }, fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' } } };
}

// ─── Sheet 1: Overview ───────────────────────────────────────────────────────
function buildOverviewSheet() {
  const ws = {};
  let r = 0;

  const setCell = (row, col, c) => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    ws[addr] = c;
  };

  // Title banner
  setCell(r, 0, hdr('DY FINANCE – SOFTWARE SUMMARY REPORT', '0D2B55', 16));
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  setCell(r, 0, hdr(`Generated: ${new Date().toLocaleString()}`, '1A3A5C', 10));
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;
  r++;

  // ── Section 1: General Info ──
  setCell(r, 0, subhdr('1.  GENERAL INFORMATION'));
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  const generalInfo = [
    ['Application Name',  'DY Finance'],
    ['Version',           '1.0.0'],
    ['Product Name',      'DY Finance Desktop Application'],
    ['App ID',            'com.example.dy-finance'],
    ['Platform',          'Windows (Electron Desktop App)'],
    ['Entry Point',       'main.js → index.html'],
    ['Server Port',       '3000 (localhost)'],
    ['Database',          'SQLite (finance.db)'],
    ['Purpose',           'Financial Purchase Records & VAT Tracking System for Business/Hotel management'],
    ['Primary User',      'Finance/Accounting personnel (e.g., Lambadina Hotel)'],
  ];

  generalInfo.forEach(([l, v], i) => {
    setCell(r, 0, label(l));
    ws['!merges'].push({ s: { r, c: 1 }, e: { r, c: 5 } });
    setCell(r, 1, i % 2 === 0 ? val(v) : altVal(v));
    r++;
  });

  r++;

  // ── Section 2: Technology Stack ──
  setCell(r, 0, subhdr('2.  TECHNOLOGY STACK'));
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  const colHdrs = ['Layer', 'Technology', 'Version', 'Purpose', '', ''];
  colHdrs.forEach((h, c) => setCell(r, c, hdr(h, '2E75B6', 10)));
  r++;

  const techStack = [
    ['Desktop Shell',       'Electron',           '^38.2.2',    'Cross-platform desktop app wrapper'],
    ['Backend / API',       'Express.js',          '^5.1.0',    'REST API server (port 3000)'],
    ['Database',            'SQLite3',             '^5.1.7',    'Local relational database storage'],
    ['Frontend',            'HTML5 / CSS3 / JS',   'Vanilla',   'UI rendering in Electron browser window'],
    ['Excel Export',        'xlsx (SheetJS)',       '^0.18.5',   'VAT & Yearly report Excel generation'],
    ['PDF Export',          'Puppeteer',           '^24.24.0',  'JV & Summary report PDF generation'],
    ['HTTP Client',         'Axios',               '^1.12.2',   'Frontend API calls'],
    ['CORS',                'cors',                '^2.8.5',    'Cross-origin request handling'],
    ['Unique IDs',          'uuid',                '^13.0.0',   'Primary key generation (UUID v4)'],
    ['Data Grid',           'AG Grid Community',   '^34.2.0',   'Interactive data tables'],
    ['Icons',               'Font Awesome Free',   '^7.1.0',    'UI icon library'],
    ['Notifications',       'Telegram Bot API',    'Custom',    'Activity log sync to Telegram channel'],
    ['Build Tool',          'electron-builder',    '^26.0.12',  'Windows installer (NSIS) packaging'],
  ];

  techStack.forEach(([layer, tech, ver, purpose], i) => {
    setCell(r, 0, i % 2 === 0 ? altVal(layer) : val(layer));
    setCell(r, 1, i % 2 === 0 ? altVal(tech) : val(tech));
    setCell(r, 2, i % 2 === 0 ? altVal(ver) : val(ver));
    ws['!merges'].push({ s: { r, c: 3 }, e: { r, c: 5 } });
    setCell(r, 3, i % 2 === 0 ? altVal(purpose) : val(purpose));
    r++;
  });

  r++;

  // ── Section 3: Application Architecture ──
  setCell(r, 0, subhdr('3.  APPLICATION ARCHITECTURE'));
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  const archInfo = [
    ['Pattern',          'MVC-like (Model: SQLite, View: HTML/CSS, Controller: Express routes)'],
    ['Frontend Pages',   'index.html (Login), workspace.html (Data Entry), reports.html (Reports)'],
    ['Backend',          'server.js — single Express module exporting a factory function'],
    ['IPC Communication','Electron ipcMain/ipcRenderer for PDF save dialogs & directory selection'],
    ['Static Serving',   'Express serves all HTML/CSS/JS/assets from the root directory'],
    ['DB Init',          'Tables auto-created on first launch; schema auto-migrated via ALTER TABLE'],
    ['Auth',             'Simple username/password (plaintext stored in SQLite Users table)'],
    ['Data Flow',        'Frontend → Axios HTTP → Express API → SQLite → JSON response → UI render'],
  ];

  archInfo.forEach(([l, v], i) => {
    setCell(r, 0, label(l));
    ws['!merges'].push({ s: { r, c: 1 }, e: { r, c: 5 } });
    setCell(r, 1, i % 2 === 0 ? val(v) : altVal(v));
    r++;
  });

  r++;

  // ── Section 4: Source Files ──
  setCell(r, 0, subhdr('4.  SOURCE FILES'));
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  ['File', 'Type', 'Size (KB)', 'Role / Description', '', ''].forEach((h, c) => setCell(r, c, hdr(h, '2E75B6', 10)));
  r++;

  const sourceFiles = [
    ['main.js',                   'JS – Electron Main',  '3.5',    'App entry point, BrowserWindow, IPC handlers, Express startup'],
    ['server.js',                 'JS – Backend',        '115.7',  'All Express routes, SQLite DB init, report HTML generation'],
    ['renderer.js',               'JS – Frontend',       '3.5',    'Login page logic & authentication'],
    ['workspace.js',              'JS – Frontend',       '87.5',   'Workspace data entry, vendor management, row/group logic'],
    ['reports.js',                'JS – Frontend',       '86.9',   'All report generation, export, management tab logic'],
    ['telegramBot.js',            'JS – Integration',    '6.8',    'Telegram bot: send & fetch activity logs'],
    ['mig.js / migrate-db.js',    'JS – Utility',        '2.4/3.5','Database migration scripts'],
    ['index.html',                'HTML – Login Page',   '2.7',    'Login form with Workspace & Reports preview links'],
    ['workspace.html',            'HTML – Workspace',    '7.6',    'Purchase entry interface with modals'],
    ['reports.html',              'HTML – Reports',      '25.8',   'VAT, JV, Summary, Yearly report views + Management tabs'],
    ['index.css',                 'CSS – Login',         '5.2',    'Login page styles'],
    ['styles.css',                'CSS – Shared',        '21.6',   'Shared component styles'],
    ['workspace.css',             'CSS – Workspace',     '19.5',   'Workspace page styles'],
    ['report.css / rstyle.css',   'CSS – Reports',       '17.9',   'Report page & print/PDF styles'],
    ['package.json',              'Config',              '1.0',    'Project metadata, dependencies, electron-builder config'],
    ['finance.db',                'SQLite Database',     '168',    'Primary application database'],
  ];

  sourceFiles.forEach(([file, type, size, desc], i) => {
    setCell(r, 0, i % 2 === 0 ? altVal(file) : val(file));
    setCell(r, 1, i % 2 === 0 ? altVal(type) : val(type));
    setCell(r, 2, i % 2 === 0 ? altVal(size) : val(size));
    ws['!merges'].push({ s: { r, c: 3 }, e: { r, c: 5 } });
    setCell(r, 3, i % 2 === 0 ? altVal(desc) : val(desc));
    r++;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 5 } });
  ws['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 40 }, { wch: 5 }, { wch: 5 }];
  ws['!rows'] = Array.from({ length: r + 1 }, (_, i) => ({ hpt: i < 2 ? 30 : 22 }));

  return ws;
}

// ─── Sheet 2: Modules & Features ─────────────────────────────────────────────
function buildModulesSheet() {
  const ws = {};
  const merges = [];
  let r = 0;

  const setCell = (row, col, c) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = c;
  };

  setCell(r, 0, hdr('DY FINANCE – MODULES & FEATURES', '0D2B55', 14));
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;
  r++;

  // Table headers
  ['Module', 'Sub-Feature', 'Description', 'Export Format', 'Notes'].forEach((h, c) =>
    setCell(r, c, hdr(h, '1A3A5C', 11)));
  r++;

  const modules = [
    // Login
    ['🔐 Login',           'User Authentication', 'Username & password login against SQLite Users table', '—', 'Admin & regular roles supported'],
    ['🔐 Login',           'Access Control',       'Only authenticated users can access Workspace & Reports', '—', ''],
    // Workspace
    ['📋 Workspace',       'Purchase Entry',       'Add daily purchase rows grouped by vendor & Ethiopian month', '—', 'Supports amendment mode for past months'],
    ['📋 Workspace',       'Vendor Quick-Add',     'Add new vendors inline via modal (Ctrl+V shortcut)', '—', 'TIN + MRC numbers'],
    ['📋 Workspace',       'Post Records',         'Post current workspace records with a date stamp', '—', 'Locked once posted'],
    ['📋 Workspace',       'View Posted',          'Browse already-posted records by date', '—', ''],
    ['📋 Workspace',       'Amendments',           'Enable editing of records from previous months', '—', 'Controlled month range'],
    ['📋 Workspace',       'Footer Summary',       'Live totals: Base Total, Total VAT, Grand Total', '—', 'Updates on every row change'],
    // VAT Report
    ['📊 VAT Report',      'Monthly VAT',          'Filter purchases by Ethiopian Calendar month & year', 'Excel (.xlsx)', 'TIN, MRC, FS Number, VAT breakdown'],
    ['📊 VAT Report',      'Totals Row',           'Auto-computed Base Total, VAT Amount, Grand Total', 'Excel (.xlsx)', ''],
    ['📊 VAT Report',      'Excel Export',         'Export filtered VAT data to Excel via /export/vat-report', 'Excel (.xlsx)', 'Filename includes date range'],
    // JV Report
    ['📄 JV Report',       'Journal Voucher',      'Debit/Credit accounting entries for a specific date', 'PDF', 'Birr & Cents columns'],
    ['📄 JV Report',       'PDF Generation',       'Server renders HTML with embedded CSS; Electron prints to PDF', 'PDF', 'Lambadina Hotel header'],
    // Summary Report
    ['📈 Summary Report',  'Monthly Summary',      'Pivot-style table: rows = dates, columns = subcategory totals', 'PDF', 'Ethiopian month/year filter'],
    ['📈 Summary Report',  'PDF Generation',       'Server renders full HTML summary; Electron saves PDF via dialog', 'PDF', ''],
    // Yearly Report
    ['📅 Yearly Report',   'Annual Purchases',     'All purchase records for a subcategory across a full year', 'Excel (.xlsx)', 'Ethiopian year input'],
    ['📅 Yearly Report',   'Excel Export',         'Export to Excel via /export/yearly-report endpoint', 'Excel (.xlsx)', 'Grouped by subcategory'],
    // Management
    ['⚙️ Management',      'Vendor Management',    'Add / Edit / Delete vendors with TIN & MRC numbers', '—', 'CRUD via modal'],
    ['⚙️ Management',      'Categories',           'Manage expense categories (right-click context menu)', '—', 'Hierarchical: Category → Subcategory'],
    ['⚙️ Management',      'Subcategories',        'Manage subcategories linked to categories', '—', ''],
    ['⚙️ Management',      'Items',                'Add items with unit price, category, subcategory assignment', '—', 'Soft-delete (is_active flag)'],
    ['⚙️ Management',      'Database Backup',      'Copy SQLite database to a user-selected directory', '—', 'Browse folder dialog via Electron IPC'],
    // Telegram
    ['📡 Telegram Bot',    'Activity Log Sync',    'Auto-sync INSERT/UPDATE/DELETE events to Telegram channel', '—', 'Controlled by synced_to_bot flag'],
    ['📡 Telegram Bot',    'Fetch Logs',           'Pull remote logs from Telegram for cross-device sync', '—', 'Uses last update ID in Config table'],
  ];

  modules.forEach(([mod, sub, desc, exp, notes], i) => {
    const bg = i % 2 === 0 ? 'EEF4FB' : 'FFFFFF';
    setCell(r, 0, cell(mod, true, bg));
    setCell(r, 1, cell(sub, false, bg));
    setCell(r, 2, cell(desc, false, bg));
    setCell(r, 3, cell(exp, false, exp === '—' ? bg : 'D5E8D4'));
    setCell(r, 4, cell(notes, false, bg, 'left', 9, '555555'));
    r++;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 4 } });
  ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 55 }, { wch: 16 }, { wch: 35 }];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }, ...Array(r).fill({ hpt: 22 })];
  ws['!merges'] = merges;

  return ws;
}

// ─── Sheet 3: Database Schema ─────────────────────────────────────────────────
function buildDatabaseSheet() {
  const ws = {};
  const merges = [];
  let r = 0;

  const setCell = (row, col, c) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = c;
  };

  setCell(r, 0, hdr('DY FINANCE – DATABASE SCHEMA', '0D2B55', 14));
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;
  r++;

  const tables = [
    {
      name: 'Vendors',
      color: '1A5276',
      columns: [
        ['vendor_id',    'TEXT',    'PK', 'UUID primary key'],
        ['vendor_name',  'TEXT',    'NOT NULL', 'Supplier/vendor name'],
        ['tin_number',   'TEXT',    'NOT NULL UNIQUE', 'Tax Identification Number'],
        ['contact_info', 'TEXT',    'NULL', 'Optional contact details'],
        ['address',      'TEXT',    'NULL', 'Optional address'],
      ]
    },
    {
      name: 'MRC_Numbers',
      color: '1A5276',
      columns: [
        ['mrc_id',      'TEXT', 'PK', 'UUID primary key'],
        ['vendor_id',   'TEXT', 'FK → Vendors', 'Links MRC to vendor'],
        ['mrc_number',  'TEXT', 'NOT NULL', 'Machine Receipt Code number'],
      ]
    },
    {
      name: 'Categories',
      color: '145A32',
      columns: [
        ['category_id',   'TEXT', 'PK', 'UUID primary key'],
        ['category_name', 'TEXT', 'NOT NULL UNIQUE', 'Expense category name'],
      ]
    },
    {
      name: 'Subcategories',
      color: '145A32',
      columns: [
        ['subcategory_id',   'TEXT', 'PK', 'UUID primary key'],
        ['category_id',      'TEXT', 'FK → Categories', 'Parent category'],
        ['subcategory_name', 'TEXT', 'NOT NULL', 'Subcategory name (unique per category)'],
      ]
    },
    {
      name: 'Items',
      color: '4A235A',
      columns: [
        ['item_id',        'TEXT', 'PK', 'UUID primary key'],
        ['item_name',      'TEXT', 'NOT NULL', 'Item / product name'],
        ['category_id',    'TEXT', 'FK → Categories', 'Item category'],
        ['subcategory_id', 'TEXT', 'FK → Subcategories', 'Item subcategory (nullable)'],
        ['unit_price',     'REAL', 'NOT NULL', 'Default unit price'],
        ['description',    'TEXT', 'NULL', 'Optional description'],
        ['is_active',      'INTEGER', 'DEFAULT 1', 'Soft-delete flag (0 = disabled)'],
      ]
    },
    {
      name: 'Purchase_Records',
      color: '7B241C',
      columns: [
        ['purchase_id',    'TEXT', 'PK', 'UUID primary key'],
        ['vendor_id',      'TEXT', 'FK → Vendors', 'Supplying vendor'],
        ['item_id',        'TEXT', 'FK → Items', 'Purchased item'],
        ['purchase_date',  'DATE', 'NOT NULL', 'Date of purchase (Gregorian)'],
        ['posted_date',    'DATE', 'NULL', 'Date record was posted/locked'],
        ['unit',           'TEXT', 'NOT NULL', 'Unit of measure'],
        ['quantity',       'REAL', 'NOT NULL', 'Quantity purchased'],
        ['unit_price',     'REAL', 'NOT NULL', 'Price per unit'],
        ['vat_amount',     'REAL', 'NULL', 'VAT amount (ETB)'],
        ['fs_number',      'TEXT', 'NOT NULL', 'Fiscal/Invoice number'],
        ['total_amount',   'REAL', 'NOT NULL', 'Total including VAT'],
        ['vat_percentage', 'REAL', 'NULL', 'Applied VAT rate (%)'],
        ['mrc_number',     'TEXT', 'NULL', 'Machine receipt code used'],
        ['status',         'TEXT', 'NULL', 'Record status (e.g., posted)'],
      ]
    },
    {
      name: 'Activity_Logs',
      color: '1B4F72',
      columns: [
        ['log_id',       'TEXT',     'PK', 'UUID primary key'],
        ['timestamp',    'DATETIME', 'DEFAULT NOW', 'When the action occurred'],
        ['action_type',  'TEXT',     'NOT NULL', 'INSERT / UPDATE / DELETE'],
        ['table_name',   'TEXT',     'NOT NULL', 'Which table was affected'],
        ['record_id',    'TEXT',     'NOT NULL', 'UUID of the affected record'],
        ['old_data',     'TEXT',     'NULL', 'JSON of old record (for UPDATE/DELETE)'],
        ['new_data',     'TEXT',     'NULL', 'JSON of new record (for INSERT/UPDATE)'],
        ['synced_to_bot','INTEGER',  'DEFAULT 0', '0 = not synced, 1 = synced to Telegram'],
      ]
    },
    {
      name: 'Users',
      color: '424949',
      columns: [
        ['user_id',  'TEXT', 'PK', 'UUID primary key'],
        ['username', 'TEXT', 'NOT NULL UNIQUE', 'Login username'],
        ['password', 'TEXT', 'NOT NULL', 'Plaintext password (not hashed)'],
        ['role',     'TEXT', 'DEFAULT regular', 'admin or regular'],
      ]
    },
    {
      name: 'Config',
      color: '424949',
      columns: [
        ['key',   'TEXT', 'PK', 'Setting key (e.g., last_telegram_update_id)'],
        ['value', 'TEXT', 'NULL', 'Setting value'],
      ]
    },
  ];

  tables.forEach(table => {
    // Table header
    setCell(r, 0, hdr(`TABLE: ${table.name}`, table.color, 11));
    merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
    r++;

    // Column headers
    ['Column Name', 'Data Type', 'Constraint', 'Description', ''].forEach((h, c) =>
      setCell(r, c, hdr(h, '2E75B6', 10)));
    r++;

    table.columns.forEach(([col, type, constraint, desc], i) => {
      const bg = i % 2 === 0 ? 'EEF4FB' : 'FFFFFF';
      setCell(r, 0, cell(col, true,  bg, 'left', 10, '1A3A5C'));
      setCell(r, 1, cell(type, false, bg, 'left', 10, '7D3C98'));
      setCell(r, 2, cell(constraint, false, bg, 'left', 9, '922B21'));
      merges.push({ s: { r, c: 3 }, e: { r, c: 4 } });
      setCell(r, 3, cell(desc, false, bg, 'left', 10));
      r++;
    });
    r++;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 4 } });
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 45 }, { wch: 5 }];
  ws['!rows'] = [{ hpt: 26 }, { hpt: 6 }, ...Array(r).fill({ hpt: 20 })];
  ws['!merges'] = merges;

  return ws;
}

// ─── Sheet 4: API Endpoints ───────────────────────────────────────────────────
function buildAPISheet() {
  const ws = {};
  const merges = [];
  let r = 0;

  const setCell = (row, col, c) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = c;
  };

  setCell(r, 0, hdr('DY FINANCE – API ENDPOINTS (server.js)', '0D2B55', 14));
  merges.push({ s: { r, c: 0 }, e: { r, c: 4 } });
  r++;
  r++;

  ['Method', 'Endpoint', 'Description', 'Parameters', 'Returns'].forEach((h, c) =>
    setCell(r, c, hdr(h, '1A3A5C', 11)));
  r++;

  const endpoints = [
    // Auth
    ['POST', '/login',                    'Authenticate user credentials',                'body: {username, password}',             'JSON: {role, message}'],
    // Vendors
    ['POST', '/addvendors',               'Add a new vendor with MRC numbers',            'body: {vendor_name, tin_number, mrc_numbers}', 'JSON: {message, vendor_id}'],
    ['GET',  '/vendors',                  'List all vendors with their MRC numbers',      '—',                                      'JSON array of vendors'],
    ['PUT',  '/vendors/:id',              'Update a vendor and its MRC numbers',          'params: id; body: vendor fields',        'JSON: {message}'],
    ['DELETE','/vendors/:id',             'Delete a vendor',                              'params: id',                             'JSON: {message}'],
    // Categories
    ['GET',  '/categories',               'List all categories with subcategories',       '—',                                      'JSON array'],
    ['POST', '/categories',               'Add a new category',                           'body: {category_name}',                  'JSON: {category_id}'],
    ['PUT',  '/categories/:id',           'Rename a category',                            'params: id; body: {category_name}',      'JSON: {message}'],
    ['DELETE','/categories/:id',          'Delete a category (if no items)',              'params: id',                             'JSON: {message}'],
    // Subcategories
    ['GET',  '/subcategories',            'List all subcategories',                       'query: ?category_id=',                   'JSON array'],
    ['POST', '/subcategories',            'Add a subcategory to a category',              'body: {category_id, subcategory_name}',  'JSON: {subcategory_id}'],
    ['PUT',  '/subcategories/:id',        'Rename a subcategory',                         'params: id; body: {subcategory_name}',   'JSON: {message}'],
    ['DELETE','/subcategories/:id',       'Delete a subcategory',                         'params: id',                             'JSON: {message}'],
    // Items
    ['GET',  '/items',                    'List items (filterable by category/subcategory)','query: ?category_id=&subcategory_id=', 'JSON array of items'],
    ['POST', '/items',                    'Add a new item',                               'body: {item_name, unit_price, …}',       'JSON: {item_id}'],
    ['PUT',  '/items/:id',                'Update an item',                               'params: id; body: item fields',          'JSON: {message}'],
    ['DELETE','/items/:id',               'Delete or soft-disable an item',               'params: id',                             'JSON: {message, disabled}'],
    // Purchases
    ['GET',  '/purchases',                'List purchase records',                        'query: date filters',                    'JSON array'],
    ['POST', '/purchases',                'Add new purchase record(s)',                   'body: array of purchase objects',        'JSON: {message}'],
    ['PUT',  '/purchases/:id',            'Update a purchase record',                     'params: id; body: purchase fields',      'JSON: {message}'],
    ['DELETE','/purchases/:id',           'Delete a purchase record',                     'params: id',                             'JSON: {message}'],
    ['POST', '/purchases/post',           'Post (lock) workspace records with a date',    'body: {post_date}',                      'JSON: {message, count}'],
    ['GET',  '/purchases/posted',         'Get posted records for a specific date',       'query: ?date=',                          'JSON array'],
    // Reports
    ['GET',  '/reports/vat',              'Generate VAT report data',                     'query: ?startDate=&endDate=',            'JSON: {rows, totals}'],
    ['GET',  '/reports/jv',              'Generate JV report data',                      'query: ?date=',                          'JSON: {details, totals}'],
    ['GET',  '/reports/summary',          'Generate monthly summary report data',         'query: ?startDate=&endDate=',            'JSON pivot data'],
    ['GET',  '/reports/yearly',           'Generate yearly report data',                  'query: ?startDate=&endDate=&subcategory_id=','JSON array'],
    // Exports
    ['GET',  '/export/vat-report',        'Export VAT data as .xlsx file',               'query: ?startDate=&endDate=',            '.xlsx download'],
    ['GET',  '/export/yearly-report',     'Export yearly data as .xlsx file',            'query: ?startDate=&endDate=&subcategory_id=','.xlsx download'],
    // PDF
    ['GET',  '/pdf/jv',                  'Render JV report as HTML for PDF printing',   'query: ?date=',                          'HTML string'],
    ['GET',  '/pdf/summary',             'Render Summary report as HTML for PDF printing','query: ?startDate=&endDate=',           'HTML string'],
    // Ethiopian calendar
    ['GET',  '/convert/ethiopian-to-gregorian','Convert Ethiopian date to Gregorian',   'query: ?month=&year=&day=',              'JSON: {gregorianDate}'],
    ['GET',  '/convert/gregorian-to-ethiopian','Convert Gregorian date to Ethiopian',   'query: ?date=',                          'JSON: {ethiopianDate}'],
    // Users
    ['GET',  '/users',                   'List all users',                               '—',                                      'JSON array'],
    ['POST', '/users',                   'Create a new user',                            'body: {username, password, role}',       'JSON: {user_id}'],
    ['DELETE','/users/:id',              'Delete a user',                               'params: id',                             'JSON: {message}'],
    // Telegram / Sync
    ['POST', '/sync/logs',               'Push unsynced activity logs to Telegram bot', '—',                                      'JSON: {synced_count}'],
    ['GET',  '/sync/fetch',              'Fetch & apply remote logs from Telegram',      '—',                                      'JSON: {fetched_count}'],
    // Backup
    ['POST', '/backup',                  'Copy SQLite database file to specified path',  'body: {destination_path}',               'JSON: {message}'],
  ];

  const methodColors = {
    GET:    'D5E8D4', // green
    POST:   'DAE8FC', // blue
    PUT:    'FFF2CC', // yellow
    DELETE: 'F8CECC', // red
  };

  endpoints.forEach(([method, endpoint, desc, params, returns], i) => {
    const bg = i % 2 === 0 ? 'F9F9F9' : 'FFFFFF';
    setCell(r, 0, cell(method, true, methodColors[method] || bg, 'center', 10));
    setCell(r, 1, cell(endpoint, true, bg, 'left', 9, '1A3A5C'));
    setCell(r, 2, cell(desc, false, bg, 'left', 10));
    setCell(r, 3, cell(params, false, bg, 'left', 9, '555555'));
    setCell(r, 4, cell(returns, false, bg, 'left', 9, '555555'));
    r++;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 4 } });
  ws['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 42 }, { wch: 38 }, { wch: 25 }];
  ws['!rows'] = [{ hpt: 26 }, { hpt: 6 }, { hpt: 22 }, ...Array(r).fill({ hpt: 20 })];
  ws['!merges'] = merges;

  return ws;
}

// ─── Sheet 5: Build & Deployment ─────────────────────────────────────────────
function buildDeploymentSheet() {
  const ws = {};
  const merges = [];
  let r = 0;

  const setCell = (row, col, c) => {
    ws[XLSX.utils.encode_cell({ r: row, c: col })] = c;
  };

  setCell(r, 0, hdr('DY FINANCE – BUILD & DEPLOYMENT', '0D2B55', 14));
  merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  r++;
  r++;

  // NPM Scripts
  setCell(r, 0, subhdr('NPM SCRIPTS'));
  merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  r++;
  ['Command', 'Script', 'Description', ''].forEach((h, c) => setCell(r, c, hdr(h, '2E75B6', 10)));
  r++;
  [
    ['npm start',  'electron .',           'Launch the app in development mode'],
    ['npm run dist','electron-builder',    'Build Windows installer (.exe via NSIS)'],
    ['npm test',   'echo "no tests"',      'Placeholder — no test suite configured'],
    ['node generate-software-report.js', 'This script', 'Generate software summary Excel report'],
  ].forEach(([cmd, script, desc], i) => {
    const bg = i % 2 === 0 ? 'EEF4FB' : 'FFFFFF';
    setCell(r, 0, cell(cmd, true, bg, 'left', 10, '1A3A5C'));
    setCell(r, 1, cell(script, false, bg, 'left', 9, '7D3C98'));
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    setCell(r, 2, cell(desc, false, bg));
    r++;
  });

  r++;

  // Build Output
  setCell(r, 0, subhdr('BUILD OUTPUT (electron-builder)'));
  merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  r++;
  ['Artifact', 'Path', 'Description', ''].forEach((h, c) => setCell(r, c, hdr(h, '2E75B6', 10)));
  r++;
  [
    ['Windows Installer', 'dist/DY Finance Setup 1.0.0.exe', 'NSIS installer for end-user distribution'],
    ['Unpacked App',      'dist/win-unpacked/DY Finance.exe', 'Portable executable (no install required)'],
    ['App Archive',       'dist/win-unpacked/resources/app.asar', 'Packaged Electron app resources'],
    ['Debug Info',        'dist/builder-debug.yml', 'Build metadata and debug info'],
    ['Auto-Update Manifest','dist/latest.yml', 'Used for auto-update functionality'],
  ].forEach(([artifact, path, desc], i) => {
    const bg = i % 2 === 0 ? 'EEF4FB' : 'FFFFFF';
    setCell(r, 0, cell(artifact, true, bg));
    setCell(r, 1, cell(path, false, bg, 'left', 9, '7D3C98'));
    merges.push({ s: { r, c: 2 }, e: { r, c: 3 } });
    setCell(r, 2, cell(desc, false, bg));
    r++;
  });

  r++;

  // Key Notes
  setCell(r, 0, subhdr('KNOWN ISSUES / NOTES'));
  merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  r++;

  const notes = [
    ['⚠️  Security',     'Passwords stored as plaintext in SQLite — not suitable for production without hashing'],
    ['⚠️  Auth',         'No JWT/session token — basic credential check only'],
    ['ℹ️  Calendar',      'Ethiopian calendar support: month/year inputs use Ethiopian Era (E.C.) converted server-side to Gregorian'],
    ['ℹ️  Date Format',   'Dates stored in Gregorian format in SQLite; displayed in Ethiopian format in UI'],
    ['ℹ️  Telegram',      'Telegram Bot token must be configured in telegramBot.js for sync to work'],
    ['ℹ️  Port',          'App always runs Express on port 3000 — ensure no conflicts on deployment machine'],
    ['✅  Stability',     'Schema auto-migration handles upgrades from older database versions via ALTER TABLE'],
    ['✅  Soft Delete',   'Items are soft-deleted (is_active=0) when they have purchase records to preserve data integrity'],
  ];

  notes.forEach(([type, note], i) => {
    const bg = type.startsWith('⚠️') ? 'FFF3CD' : type.startsWith('✅') ? 'D5E8D4' : 'EEF4FB';
    setCell(r, 0, cell(type, true, bg, 'left', 10));
    merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
    setCell(r, 1, cell(note, false, bg));
    r++;
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 3 } });
  ws['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 40 }, { wch: 5 }];
  ws['!rows'] = [{ hpt: 26 }, { hpt: 6 }, ...Array(r).fill({ hpt: 22 })];
  ws['!merges'] = merges;

  return ws;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('🔨 Building DY Finance Software Summary Report...');

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title:   'DY Finance – Software Summary Report',
    Subject: 'Software Documentation',
    Author:  'DY Finance System',
    CreatedDate: new Date()
  };

  XLSX.utils.book_append_sheet(wb, buildOverviewSheet(),    '📋 Overview');
  XLSX.utils.book_append_sheet(wb, buildModulesSheet(),     '🧩 Modules & Features');
  XLSX.utils.book_append_sheet(wb, buildDatabaseSheet(),    '🗄️ Database Schema');
  XLSX.utils.book_append_sheet(wb, buildAPISheet(),         '🔌 API Endpoints');
  XLSX.utils.book_append_sheet(wb, buildDeploymentSheet(),  '🚀 Build & Deployment');

  const outputPath = path.join(__dirname, 'DY_Finance_Software_Summary_Report.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Report saved to: ${outputPath}`);
}

main();
