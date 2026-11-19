# Kaiser — 1,000,000 Birr in 60 Days Tracker ☕🇪🇹

A cozy, warm, and secure desktop application designed for Ethiopian entrepreneurs, freelancers, software builders, and business owners tracking progress toward a milestone goal of **1,000,000 Birr net profit in 60 days**.

Built with **Electron**, plain **HTML5**, **CSS3**, vanilla **JavaScript** (no heavy frameworks, fast startup), and a local offline **SQLite** database (`better-sqlite3`).

---

## ✨ Features & Architecture

- **🎯 Goal & Pace Dashboard**:
  - Live progress ring showing `% Complete` of your 1,000,000 Birr profit goal.
  - Pace calculator: displays whether you are ahead or behind schedule, elapsed days, days remaining, and the daily profit needed.
  - 4 quick metrics: Today's sales & net profit, This week's profit, Leads to follow up today, and Today's task checklist progress.
  - **Zero-Dependency Canvas Chart**: Pure HTML5 Canvas rendering your rolling 8-week profit trajectory offline.
- **💰 Flexible Sales & Money Deposits**:
  - Track software licenses, custom coding gigs, physical hardware (receipt printers, barcode scanners), IT support contracts, or any business income deposited.
  - Supports Ethiopian payment channels: **Telebirr**, **CBE Birr**, **Bank Transfer** (CBE, Awash, etc.), **Cash**, and **Other**.
  - Auto-calculates profit (`price - cost`), filters by payment method, date, and product, with instant paid/unpaid status toggles.
  - Global keyboard shortcut: **`Ctrl+N`** (or `Cmd+N`) instantly opens the New Sale modal from any page!
- **🧾 Business Expenses**:
  - Categorized tracking: *Ads & Marketing*, *Tools & Subscriptions*, *Transport & Meetings*, *Suppliers & Hardware*, *Rent & Space*, *Utilities & Internet*, *Other*.
  - Category breakdown cards showing spend and impact on net profit.
- **👥 Leads & Client Pipeline**:
  - Dual view: **Interactive Kanban Board** (New ➔ Contacted ➔ Interested ➔ Paid ➔ Lost) with drag-and-drop plus **Table List View**.
  - Follow-up alerts for inquiries due today or overdue.
  - One-click **"+ Sale"** button converts any pipeline lead directly into a recorded sale.
- **📦 Products & Offerings Catalog**:
  - Configure software licenses, freelance services, and hardware packages.
  - Selecting a product automatically autofills its standard price and cost into sales records.
- **📋 High-Leverage Daily Tasks**:
  - Daily checklist with High, Medium, and Low priorities.
  - **"⚡ Generate Daily Routine"** button auto-loads high-leverage sales habits: log yesterday's sales & receipts, record expenses, follow up 5 leads on Telegram, and review daily progress.
- **📈 Weekly Review & Strategic Reflection**:
  - Auto-calculates weekly revenue, net profit, best-selling product, and top-converting lead source directly from database records.
  - Guided reflection questions: *What worked well?*, *What to stop doing?*, *Action plan for next week*.
- **⚙️ Settings & Safe Data Management**:
  - Configure target goal amount (default 1,000,000 Birr), sprint start date, duration (default 60 days), and currency label.
  - **Theme Toggle**: Cozy Warm Light (`#FAF8F5`) and Cozy Dark Cocoa (`#1A1715`).
  - **☕ Load Realistic Sample Data**: Seed Ethiopian software sales, gigs, Telegram leads, Telebirr transactions, and expenses with one click.
  - **Export to CSV**: Export Sales, Expenses, and Leads spreadsheets.
  - **SQLite Backup & Restore**: Safe file export and restoration of your `.db` file.
  - **Undo Toast**: Accidental deletions can be immediately undone.

---

## Ethiopian Fiscal Years

The app starts on the current Ethiopian fiscal year. Change the active year and manage years from **Reports → Management → Fiscal Year**. Each year has an independent copy of the categories, subcategories, and items; changes to one year's catalog do not change another year's. Purchase records and reports are scoped to the active year. New fiscal years can be created only after the active fiscal year is permanently locked.

Management can permanently lock a fiscal year using the amendments password. A locked year's purchase records and catalog are read-only, enforced by the API and SQLite triggers. The Fiscal Year tab can export any selected year's category → subcategory → item catalog hierarchy to Excel, including locked years. There is no in-app unlock; restoring edit access requires a deliberate developer database/code change.

When opening a database from the previous schema, the app associates existing purchase records with the Ethiopian year of their posted date and copies the available catalog into those years. If a legacy purchase has no valid posted date, startup pauses at a repair screen; enter its posted date to continue. The screen shows the purchase date in Gregorian and Ethiopian calendars and the fiscal year the purchase date would imply. Since the previous schema had only one shared catalog, it cannot recover historical catalog changes that were never recorded.

---

## 📂 Project Structure

```
dy-fin/ (Kaiser)
├── package.json              # Electron & electron-builder configuration
├── main.js                   # Electron main process (secure window & IPC handlers)
├── preload.js                # contextBridge safe IPC API exposure
├── README.md                 # Complete documentation & usage guide
├── db/
│   ├── schema.sql            # SQLite schema with foreign keys, checks & indexes
│   └── db.js                 # better-sqlite3 database connection & CRUD methods
└── renderer/
    ├── index.html            # Semantic SPA layout and cozy modals
    ├── styles.css            # Cozy light & dark theme styling
    ├── app.js                # Navigation router, toast notifications, keyboard shortcuts
    ├── dashboard.js          # SVG progress ring, metrics, and Canvas chart
    ├── sales.js              # Sales management, profit calculator, product autofill
    ├── expenses.js           # Expense logging and category breakdown cards
    ├── leads.js              # Kanban board and client pipeline
    ├── products.js           # Products, gigs, and services catalog
    ├── tasks.js              # Daily checklist and routine generator
    ├── reviews.js            # Strategic weekly reviews and auto-stats
    ├── settings.js           # Goal configuration, CSV exports, backup/restore
    └── fonts/
        ├── fonts.css         # Offline font declarations
        ├── Nunito-Regular.ttf
        ├── Nunito-SemiBold.ttf
        ├── Nunito-Bold.ttf
        └── Nunito-ExtraBold.ttf
```

---

## 🛠️ How to Install and Run

### 1. Requirements
- Node.js (v18 or higher recommended, tested on v24)
- npm

### 2. Install Dependencies
In PowerShell or terminal, run:
```powershell
npm.cmd install
```
*(On Windows, `npm.cmd` avoids PowerShell script execution policy restrictions)*

### 3. Launch the Application
```powershell
npm.cmd start
```

---

## 📦 How to Build the Windows `.exe` Installer

To package an offline Windows installer (.exe) with desktop and start menu shortcuts:
```powershell
npm.cmd run dist
```
The output installer will be generated inside the `dist/` directory (e.g. `dist/Kaiser Setup 1.0.0.exe`).

---

## 🗄️ Where the Database File is Stored

The SQLite database file `kaiser.db` is stored safely in your user's AppData directory so that your financial records are never lost during app updates:

- **Windows Path**:
  `%APPDATA%\kaiser\kaiser.db`  
  *(Typically: `C:\Users\<YourUsername>\AppData\Roaming\kaiser\kaiser.db`)*
- You can also view the exact live path directly in the **Settings** page of the app.
- You can create backups anytime using the **"Backup (.db)"** button in Settings.

---

## ⌨️ Helpful Shortcuts & Tips

- **`Ctrl+N`** (or `Cmd+N`): Open "Record Sale / Deposit" modal from anywhere in the app.
- **Escape**: Close any active modal.
- Click **"☕ Load Sample Data"** in Settings on first launch to immediately preview the dashboard with realistic Ethiopian software business data.
