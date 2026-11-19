const assert = require('node:assert/strict');
const test = require('node:test');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const {
    createFiscalYear,
    getActiveFiscalYear,
    initializeFiscalYearSchema,
    parseIsoDate,
    setActiveFiscalYear
} = require('../fiscal-year-db');

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, error => error ? reject(error) : resolve());
});

const get = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
});

test('ISO date parsing rejects impossible and malformed dates', () => {
    assert.deepEqual(parseIsoDate('2024-02-29'), {
        year: 2024,
        month: 2,
        day: 29,
        isoDate: '2024-02-29'
    });
    assert.equal(parseIsoDate('2023-02-29'), null);
    assert.equal(parseIsoDate('2026-04-31'), null);
    assert.equal(parseIsoDate('2026-04-01Tinvalid'), null);
});

test('fiscal-year migration, cloning, and composite foreign keys preserve isolation', async () => {
    const db = new sqlite3.Database(':memory:');

    try {
        await run(db, 'CREATE TABLE Vendors (vendor_id TEXT PRIMARY KEY, vendor_name TEXT, tin_number TEXT)');
        await run(db, 'CREATE TABLE Categories (category_id TEXT PRIMARY KEY, category_name TEXT NOT NULL UNIQUE)');
        await run(db, 'CREATE TABLE Subcategories (subcategory_id TEXT PRIMARY KEY, category_id TEXT NOT NULL, subcategory_name TEXT NOT NULL, UNIQUE(category_id, subcategory_name))');
        await run(db, 'CREATE TABLE Items (item_id TEXT PRIMARY KEY, item_name TEXT NOT NULL, category_id TEXT NOT NULL, subcategory_id TEXT, unit_price REAL NOT NULL, description TEXT, is_active INTEGER DEFAULT 1)');
        await run(db, 'CREATE TABLE Purchase_Records (purchase_id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, item_id TEXT NOT NULL, purchase_date DATE NOT NULL, posted_date DATE, unit TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL, vat_amount REAL, fs_number TEXT NOT NULL, total_amount REAL NOT NULL, vat_percentage REAL, mrc_number TEXT, status TEXT)');
        await run(db, 'CREATE TABLE Config (key TEXT PRIMARY KEY, value TEXT)');
        await run(db, 'INSERT INTO Vendors VALUES (?, ?, ?)', ['vendor-1', 'Vendor', 'tin-1']);
        await run(db, 'INSERT INTO Categories VALUES (?, ?)', ['category-1', 'Fuel']);
        await run(db, 'INSERT INTO Subcategories VALUES (?, ?, ?)', ['subcategory-1', 'category-1', 'Petrol']);
        await run(db, 'INSERT INTO Items VALUES (?, ?, ?, ?, ?, ?, ?)', ['item-1', 'Gas', 'category-1', 'subcategory-1', 10, '', 1]);
        await run(db, 'INSERT INTO Purchase_Records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ['purchase-1', 'vendor-1', 'item-1', '2026-01-01', null, 'L', 2, 10, 0, 'FS-1', 20, 0, null, 'saved']);

        const yearForDate = date => ({
            '2026-01-01': 2022,
            '2026-01-02': 2020
        }[date] || 2019);
        await assert.rejects(
            initializeFiscalYearSchema(db, 2019, yearForDate),
            error => {
                assert.equal(error.code, 'LEGACY_POSTED_DATE_REPAIR_REQUIRED');
                assert.equal(error.records[0].purchase_id, 'purchase-1');
                assert.equal(error.records[0].purchase_fiscal_year, 2022);
                return true;
            }
        );
        await run(db, 'UPDATE Purchase_Records SET posted_date = ? WHERE purchase_id = ?', ['2026-01-02', 'purchase-1']);
        await initializeFiscalYearSchema(db, 2019, yearForDate);
        const source = await getActiveFiscalYear(db);
        assert.equal(source.year, 2019);
        const historicYear = await get(db, 'SELECT fiscal_year_id FROM Fiscal_Years WHERE year = 2020');
        assert.ok(historicYear);
        assert.equal(await get(db, 'SELECT fiscal_year_id FROM Fiscal_Years WHERE year = 2022'), undefined);
        assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM Purchase_Records WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id])).count, 1);
        assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM Items WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id])).count, 1);

        const next = await createFiscalYear(db, 2021, source.fiscal_year_id, uuidv4);
        const cloned = await get(db, `
            SELECT c.category_name, s.subcategory_name, i.item_name,
                   c.category_id, s.subcategory_id, i.item_id
            FROM Categories c
            JOIN Subcategories s ON s.category_id = c.category_id AND s.fiscal_year_id = c.fiscal_year_id
            JOIN Items i ON i.subcategory_id = s.subcategory_id AND i.fiscal_year_id = s.fiscal_year_id
            WHERE c.fiscal_year_id = ?
        `, [next.fiscal_year_id]);
        assert.equal(cloned.category_name, 'Fuel');
        assert.equal(cloned.subcategory_name, 'Petrol');
        assert.equal(cloned.item_name, 'Gas');
        assert.notEqual(cloned.category_id, 'category-1');
        assert.notEqual(cloned.subcategory_id, 'subcategory-1');
        assert.notEqual(cloned.item_id, 'item-1');

        await assert.rejects(run(db, `
            INSERT INTO Purchase_Records (
                purchase_id, fiscal_year_id, vendor_id, item_id, purchase_date, unit,
                quantity, unit_price, fs_number, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['purchase-cross-year', next.fiscal_year_id, 'vendor-1', 'item-1', '2026-01-02', 'L', 1, 10, 'FS-2', 10]), /FOREIGN KEY/);

        await run(db, 'INSERT INTO Categories (category_id, fiscal_year_id, category_name) VALUES (?, ?, ?)', ['category-2', source.fiscal_year_id, 'Services']);
        await run(db, 'UPDATE Subcategories SET category_id = ? WHERE subcategory_id = ? AND fiscal_year_id = ?', ['category-2', 'subcategory-1', source.fiscal_year_id]);
        assert.equal((await get(db, 'SELECT category_id FROM Items WHERE item_id = ? AND fiscal_year_id = ?', ['item-1', source.fiscal_year_id])).category_id, 'category-2');

        await setActiveFiscalYear(db, source.fiscal_year_id);
        assert.equal((await getActiveFiscalYear(db)).fiscal_year_id, source.fiscal_year_id);
        assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM Categories WHERE fiscal_year_id = ?', [source.fiscal_year_id])).count, 2);
        assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM Categories WHERE fiscal_year_id = ?', [next.fiscal_year_id])).count, 1);

        await initializeFiscalYearSchema(db, 2022);
        const rolledOverYear = await getActiveFiscalYear(db);
        assert.equal(rolledOverYear.year, 2022);
        assert.equal((await get(db, 'SELECT COUNT(*) AS count FROM Items WHERE fiscal_year_id = ?', [rolledOverYear.fiscal_year_id])).count, 1);

        const historicCategory = await get(db, 'SELECT category_id FROM Categories WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]);
        const historicSubcategory = await get(db, 'SELECT subcategory_id FROM Subcategories WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]);
        const historicItem = await get(db, 'SELECT item_id FROM Items WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]);
        await run(db, 'UPDATE Fiscal_Years SET is_locked = 1 WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]);
        await assert.rejects(
            run(db, 'INSERT INTO Categories (category_id, fiscal_year_id, category_name) VALUES (?, ?, ?)', ['locked-category', historicYear.fiscal_year_id, 'Locked']),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'UPDATE Categories SET category_name = ? WHERE category_id = ? AND fiscal_year_id = ?', ['Changed', historicCategory.category_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'DELETE FROM Categories WHERE category_id = ? AND fiscal_year_id = ?', [historicCategory.category_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'INSERT INTO Subcategories (subcategory_id, category_id, fiscal_year_id, subcategory_name) VALUES (?, ?, ?, ?)', ['locked-subcategory', historicCategory.category_id, historicYear.fiscal_year_id, 'Locked']),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'UPDATE Subcategories SET subcategory_name = ? WHERE subcategory_id = ? AND fiscal_year_id = ?', ['Changed', historicSubcategory.subcategory_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'DELETE FROM Subcategories WHERE subcategory_id = ? AND fiscal_year_id = ?', [historicSubcategory.subcategory_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'INSERT INTO Items (item_id, fiscal_year_id, item_name, category_id, subcategory_id, unit_price) VALUES (?, ?, ?, ?, ?, ?)', ['locked-item', historicYear.fiscal_year_id, 'Locked', historicCategory.category_id, historicSubcategory.subcategory_id, 1]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'UPDATE Items SET item_name = ? WHERE item_id = ? AND fiscal_year_id = ?', ['Changed', historicItem.item_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'DELETE FROM Items WHERE item_id = ? AND fiscal_year_id = ?', [historicItem.item_id, historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(run(db, `
            INSERT INTO Purchase_Records (
                purchase_id, fiscal_year_id, vendor_id, item_id, purchase_date, unit,
                quantity, unit_price, fs_number, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['locked-purchase', historicYear.fiscal_year_id, 'vendor-1', historicItem.item_id, '2026-01-03', 'L', 1, 10, 'FS-3', 10]), /Fiscal year is permanently locked/);
        await assert.rejects(
            run(db, 'UPDATE Purchase_Records SET quantity = quantity + 1 WHERE purchase_id = ? AND fiscal_year_id = ?', ['purchase-1', historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'DELETE FROM Purchase_Records WHERE purchase_id = ? AND fiscal_year_id = ?', ['purchase-1', historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'UPDATE Fiscal_Years SET is_locked = 0 WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'UPDATE Fiscal_Years SET year = year + 1 WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await assert.rejects(
            run(db, 'DELETE FROM Fiscal_Years WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id]),
            /Fiscal year is permanently locked/
        );
        await run(db, 'INSERT INTO Categories (category_id, fiscal_year_id, category_name) VALUES (?, ?, ?)', ['open-category', source.fiscal_year_id, 'Still Editable']);

        await setActiveFiscalYear(db, source.fiscal_year_id);
        await initializeFiscalYearSchema(db, 2022);
        assert.equal((await getActiveFiscalYear(db)).year, 2022);
        assert.equal((await get(db, 'SELECT is_locked FROM Fiscal_Years WHERE fiscal_year_id = ?', [historicYear.fiscal_year_id])).is_locked, 1);
    } finally {
        await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    }
});

test('upgrades existing fiscal-year databases with a permanent lock column and triggers', async () => {
    const db = new sqlite3.Database(':memory:');

    try {
        await run(db, 'CREATE TABLE Fiscal_Years (fiscal_year_id TEXT PRIMARY KEY, year INTEGER NOT NULL UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
        await run(db, 'CREATE TABLE Categories (category_id TEXT PRIMARY KEY, fiscal_year_id TEXT NOT NULL, category_name TEXT NOT NULL)');
        await run(db, 'CREATE TABLE Subcategories (subcategory_id TEXT PRIMARY KEY, fiscal_year_id TEXT NOT NULL, category_id TEXT NOT NULL, subcategory_name TEXT NOT NULL)');
        await run(db, 'CREATE TABLE Items (item_id TEXT PRIMARY KEY, fiscal_year_id TEXT NOT NULL, category_id TEXT, subcategory_id TEXT)');
        await run(db, 'CREATE TABLE Purchase_Records (purchase_id TEXT PRIMARY KEY, fiscal_year_id TEXT NOT NULL, vendor_id TEXT, item_id TEXT, status TEXT, purchase_date DATE)');
        await run(db, 'CREATE TABLE Config (key TEXT PRIMARY KEY, value TEXT)');
        await run(db, 'INSERT INTO Fiscal_Years (fiscal_year_id, year) VALUES (?, ?)', ['fy-2020', 2020]);

        await initializeFiscalYearSchema(db, 2020);

        const fiscalYear = await get(db, 'SELECT is_locked FROM Fiscal_Years WHERE fiscal_year_id = ?', ['fy-2020']);
        assert.equal(fiscalYear.is_locked, 0);
        await run(db, 'UPDATE Fiscal_Years SET is_locked = 1 WHERE fiscal_year_id = ?', ['fy-2020']);
        await assert.rejects(
            run(db, 'UPDATE Fiscal_Years SET is_locked = 0 WHERE fiscal_year_id = ?', ['fy-2020']),
            /Fiscal year is permanently locked/
        );
    } finally {
        await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    }
});
