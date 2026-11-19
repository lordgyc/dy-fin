const { v4: uuidv4 } = require('uuid');

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
        if (error) return reject(error);
        resolve(this);
    });
});

const get = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
        if (error) return reject(error);
        resolve(row);
    });
});

const all = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
        if (error) return reject(error);
        resolve(rows);
    });
});

function parseIsoDate(value) {
    const rawValue = String(value || '');
    const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
        return null;
    }
    if (rawValue.length > 10 && Number.isNaN(Date.parse(rawValue))) return null;

    return {
        year,
        month,
        day,
        isoDate: `${match[1]}-${match[2]}-${match[3]}`
    };
}

async function getLegacyPostedDateIssues(db, yearForDate) {
    const categoryColumns = await all(db, `PRAGMA table_info(Categories)`);
    if (categoryColumns.some(column => column.name === 'fiscal_year_id')) return [];

    const records = await all(db, `
        SELECT pr.purchase_id, pr.vendor_id, pr.item_id, pr.purchase_date, pr.posted_date,
               pr.unit, pr.quantity, pr.unit_price, pr.vat_amount, pr.fs_number, pr.total_amount,
               pr.status, v.vendor_name, i.item_name, c.category_name, s.subcategory_name
        FROM Purchase_Records pr
        LEFT JOIN Vendors v ON v.vendor_id = pr.vendor_id
        LEFT JOIN Items i ON i.item_id = pr.item_id
        LEFT JOIN Categories c ON c.category_id = i.category_id
        LEFT JOIN Subcategories s ON s.subcategory_id = i.subcategory_id
        ORDER BY pr.purchase_date, pr.purchase_id
    `);

    return records
        .filter(record => !parseIsoDate(record.posted_date))
        .map(record => {
            const purchaseDate = parseIsoDate(record.purchase_date);
            return {
                ...record,
                purchase_fiscal_year: purchaseDate && yearForDate
                    ? yearForDate(purchaseDate.isoDate)
                    : null
            };
        });
}

async function initializeFiscalYearSchema(db, currentYear, yearForDate) {
    const postedDateIssues = await getLegacyPostedDateIssues(db, yearForDate);
    if (postedDateIssues.length) {
        const error = new Error(
            `Fiscal-year migration needs a posted date for ${postedDateIssues.length} purchase record(s).`
        );
        error.code = 'LEGACY_POSTED_DATE_REPAIR_REQUIRED';
        error.records = postedDateIssues;
        throw error;
    }

    await run(db, 'PRAGMA foreign_keys = OFF');
    await run(db, 'BEGIN IMMEDIATE');
    const activeYearId = `fy-${currentYear}`;
    let hasFiscalYear = false;
    let currentYearAlreadyExists = false;

    try {
        await run(db, `
            CREATE TABLE IF NOT EXISTS Fiscal_Years (
                fiscal_year_id TEXT PRIMARY KEY,
                year INTEGER NOT NULL UNIQUE,
                is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const fiscalYearColumns = await all(db, `PRAGMA table_info(Fiscal_Years)`);
        if (!fiscalYearColumns.some(column => column.name === 'is_locked')) {
            await run(db, `ALTER TABLE Fiscal_Years ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0`);
        }

        const categoryColumns = await all(db, `PRAGMA table_info(Categories)`);
        hasFiscalYear = categoryColumns.some(column => column.name === 'fiscal_year_id');
        currentYearAlreadyExists = Boolean(await get(db, `SELECT fiscal_year_id FROM Fiscal_Years WHERE year = ?`, [currentYear]));

        if (!hasFiscalYear) {
            await run(db, `
                CREATE TABLE Categories_new (
                    category_id TEXT PRIMARY KEY,
                    fiscal_year_id TEXT NOT NULL,
                    category_name TEXT NOT NULL,
                    UNIQUE (fiscal_year_id, category_name),
                    UNIQUE (category_id, fiscal_year_id),
                    FOREIGN KEY (fiscal_year_id) REFERENCES Fiscal_Years(fiscal_year_id) ON DELETE RESTRICT
                )
            `);
            await run(db, `
                CREATE TABLE Subcategories_new (
                    subcategory_id TEXT PRIMARY KEY,
                    category_id TEXT NOT NULL,
                    fiscal_year_id TEXT NOT NULL,
                    subcategory_name TEXT NOT NULL,
                    UNIQUE (fiscal_year_id, category_id, subcategory_name),
                    UNIQUE (subcategory_id, category_id, fiscal_year_id),
                    FOREIGN KEY (category_id, fiscal_year_id)
                        REFERENCES Categories_new(category_id, fiscal_year_id) ON DELETE CASCADE,
                    FOREIGN KEY (fiscal_year_id) REFERENCES Fiscal_Years(fiscal_year_id) ON DELETE RESTRICT
                )
            `);
            await run(db, `
                CREATE TABLE Items_new (
                    item_id TEXT PRIMARY KEY,
                    fiscal_year_id TEXT NOT NULL,
                    item_name TEXT NOT NULL,
                    category_id TEXT NOT NULL,
                    subcategory_id TEXT,
                    unit_price REAL NOT NULL,
                    description TEXT,
                    is_active INTEGER DEFAULT 1,
                    UNIQUE (item_id, fiscal_year_id),
                    FOREIGN KEY (category_id, fiscal_year_id)
                        REFERENCES Categories_new(category_id, fiscal_year_id) ON DELETE RESTRICT,
                    FOREIGN KEY (subcategory_id, category_id, fiscal_year_id)
                        REFERENCES Subcategories_new(subcategory_id, category_id, fiscal_year_id)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
                    FOREIGN KEY (fiscal_year_id) REFERENCES Fiscal_Years(fiscal_year_id) ON DELETE RESTRICT
                )
            `);
            await run(db, `
                CREATE TABLE Purchase_Records_new (
                    purchase_id TEXT PRIMARY KEY,
                    fiscal_year_id TEXT NOT NULL,
                    vendor_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    purchase_date DATE NOT NULL,
                    posted_date DATE,
                    unit TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    vat_amount REAL,
                    fs_number TEXT NOT NULL,
                    total_amount REAL NOT NULL,
                    vat_percentage REAL,
                    mrc_number TEXT,
                    status TEXT,
                    FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id) ON DELETE RESTRICT,
                    FOREIGN KEY (item_id, fiscal_year_id)
                        REFERENCES Items_new(item_id, fiscal_year_id) ON DELETE RESTRICT,
                    FOREIGN KEY (fiscal_year_id) REFERENCES Fiscal_Years(fiscal_year_id) ON DELETE RESTRICT
                )
            `);

            const legacyCategories = await all(db, `SELECT * FROM Categories`);
            const legacySubcategories = await all(db, `SELECT * FROM Subcategories`);
            const legacyItems = await all(db, `SELECT * FROM Items`);
            const legacyRecords = await all(db, `SELECT * FROM Purchase_Records`);
            const legacyRecordYears = new Map();
            const years = new Set([currentYear]);

            for (const record of legacyRecords) {
                const postedDate = parseIsoDate(record.posted_date);
                if (!postedDate) {
                    throw new Error(`Cannot assign purchase record ${record.purchase_id} to a fiscal year: invalid posted_date.`);
                }
                const recordYear = yearForDate
                    ? yearForDate(postedDate.isoDate)
                    : currentYear;
                if (!Number.isInteger(recordYear) || recordYear < 1) {
                    throw new Error(`Cannot assign purchase record ${record.purchase_id} to a fiscal year.`);
                }
                legacyRecordYears.set(record.purchase_id, recordYear);
                years.add(recordYear);
            }

            const fiscalYearIds = new Map();
            for (const year of years) {
                await run(db, `INSERT OR IGNORE INTO Fiscal_Years (fiscal_year_id, year) VALUES (?, ?)`, [`fy-${year}`, year]);
                const fiscalYear = await get(db, `SELECT fiscal_year_id FROM Fiscal_Years WHERE year = ?`, [year]);
                fiscalYearIds.set(year, fiscalYear.fiscal_year_id);
            }

            const categoryIdsByYear = new Map();
            const subcategoryIdsByYear = new Map();
            const itemIdsByYear = new Map();
            for (const year of years) {
                const categoryIds = new Map();
                const subcategoryIds = new Map();
                const itemIds = new Map();
                for (const category of legacyCategories) {
                    categoryIds.set(category.category_id, year === currentYear ? category.category_id : uuidv4());
                }
                for (const subcategory of legacySubcategories) {
                    subcategoryIds.set(subcategory.subcategory_id, year === currentYear ? subcategory.subcategory_id : uuidv4());
                }
                for (const item of legacyItems) {
                    itemIds.set(item.item_id, year === currentYear ? item.item_id : uuidv4());
                }
                categoryIdsByYear.set(year, categoryIds);
                subcategoryIdsByYear.set(year, subcategoryIds);
                itemIdsByYear.set(year, itemIds);
            }

            for (const year of years) {
                const fiscalYearId = fiscalYearIds.get(year);
                const categoryIds = categoryIdsByYear.get(year);
                const subcategoryIds = subcategoryIdsByYear.get(year);
                const itemIds = itemIdsByYear.get(year);

                for (const category of legacyCategories) {
                    await run(db, `
                        INSERT INTO Categories_new (category_id, fiscal_year_id, category_name) VALUES (?, ?, ?)
                    `, [categoryIds.get(category.category_id), fiscalYearId, category.category_name]);
                }
                for (const subcategory of legacySubcategories) {
                    await run(db, `
                        INSERT INTO Subcategories_new (subcategory_id, category_id, fiscal_year_id, subcategory_name)
                        VALUES (?, ?, ?, ?)
                    `, [
                        subcategoryIds.get(subcategory.subcategory_id),
                        categoryIds.get(subcategory.category_id),
                        fiscalYearId,
                        subcategory.subcategory_name
                    ]);
                }
                for (const item of legacyItems) {
                    await run(db, `
                        INSERT INTO Items_new (item_id, fiscal_year_id, item_name, category_id, subcategory_id, unit_price, description, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        itemIds.get(item.item_id),
                        fiscalYearId,
                        item.item_name,
                        categoryIds.get(item.category_id),
                        subcategoryIds.get(item.subcategory_id) || null,
                        item.unit_price,
                        item.description,
                        item.is_active
                    ]);
                }
            }

            for (const record of legacyRecords) {
                const year = legacyRecordYears.get(record.purchase_id);
                await run(db, `
                    INSERT INTO Purchase_Records_new (
                        purchase_id, fiscal_year_id, vendor_id, item_id, purchase_date, posted_date, unit,
                        quantity, unit_price, vat_amount, fs_number, total_amount, vat_percentage, mrc_number, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    record.purchase_id,
                    fiscalYearIds.get(year),
                    record.vendor_id,
                    itemIdsByYear.get(year).get(record.item_id),
                    record.purchase_date,
                    record.posted_date,
                    record.unit,
                    record.quantity,
                    record.unit_price,
                    record.vat_amount,
                    record.fs_number,
                    record.total_amount,
                    record.vat_percentage,
                    record.mrc_number,
                    record.status
                ]);
            }

            await run(db, `DROP TABLE Purchase_Records`);
            await run(db, `DROP TABLE Items`);
            await run(db, `DROP TABLE Subcategories`);
            await run(db, `DROP TABLE Categories`);
            await run(db, `ALTER TABLE Categories_new RENAME TO Categories`);
            await run(db, `ALTER TABLE Subcategories_new RENAME TO Subcategories`);
            await run(db, `ALTER TABLE Items_new RENAME TO Items`);
            await run(db, `ALTER TABLE Purchase_Records_new RENAME TO Purchase_Records`);
        }

        await run(db, `CREATE TABLE IF NOT EXISTS Config (key TEXT PRIMARY KEY, value TEXT)`);
        if (!hasFiscalYear) {
            await run(db, `
                INSERT OR IGNORE INTO Config (key, value) VALUES ('active_fiscal_year_id', ?)
            `, [activeYearId]);
        }
        await run(db, `CREATE INDEX IF NOT EXISTS idx_item_category ON Items(category_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_item_subcategory ON Items(subcategory_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_purchase_vendor ON Purchase_Records(vendor_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_purchase_item ON Purchase_Records(item_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_purchase_date ON Purchase_Records(purchase_date)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_purchase_fiscal_year ON Purchase_Records(fiscal_year_id, status, purchase_date)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_categories_fiscal_year ON Categories(fiscal_year_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_subcategories_fiscal_year ON Subcategories(fiscal_year_id, category_id)`);
        await run(db, `CREATE INDEX IF NOT EXISTS idx_items_fiscal_year ON Items(fiscal_year_id, category_id, subcategory_id)`);

        const lockTriggers = [
            ['categories_insert', 'Categories', 'INSERT', 'fiscal_year_id = NEW.fiscal_year_id'],
            ['categories_update', 'Categories', 'UPDATE', '(fiscal_year_id = OLD.fiscal_year_id OR fiscal_year_id = NEW.fiscal_year_id)'],
            ['categories_delete', 'Categories', 'DELETE', 'fiscal_year_id = OLD.fiscal_year_id'],
            ['subcategories_insert', 'Subcategories', 'INSERT', 'fiscal_year_id = NEW.fiscal_year_id'],
            ['subcategories_update', 'Subcategories', 'UPDATE', '(fiscal_year_id = OLD.fiscal_year_id OR fiscal_year_id = NEW.fiscal_year_id)'],
            ['subcategories_delete', 'Subcategories', 'DELETE', 'fiscal_year_id = OLD.fiscal_year_id'],
            ['items_insert', 'Items', 'INSERT', 'fiscal_year_id = NEW.fiscal_year_id'],
            ['items_update', 'Items', 'UPDATE', '(fiscal_year_id = OLD.fiscal_year_id OR fiscal_year_id = NEW.fiscal_year_id)'],
            ['items_delete', 'Items', 'DELETE', 'fiscal_year_id = OLD.fiscal_year_id'],
            ['purchase_records_insert', 'Purchase_Records', 'INSERT', 'fiscal_year_id = NEW.fiscal_year_id'],
            ['purchase_records_update', 'Purchase_Records', 'UPDATE', '(fiscal_year_id = OLD.fiscal_year_id OR fiscal_year_id = NEW.fiscal_year_id)'],
            ['purchase_records_delete', 'Purchase_Records', 'DELETE', 'fiscal_year_id = OLD.fiscal_year_id']
        ];
        for (const [name, table, operation, fiscalYearExpression] of lockTriggers) {
            await run(db, `
                CREATE TRIGGER IF NOT EXISTS prevent_locked_${name}
                BEFORE ${operation} ON ${table}
                WHEN EXISTS (
                    SELECT 1 FROM Fiscal_Years
                    WHERE is_locked = 1 AND ${fiscalYearExpression}
                )
                BEGIN
                    SELECT RAISE(ABORT, 'Fiscal year is permanently locked.');
                END
            `);
        }
        await run(db, `
            CREATE TRIGGER IF NOT EXISTS prevent_locked_fiscal_year_change
            BEFORE UPDATE OF fiscal_year_id, year ON Fiscal_Years
            WHEN OLD.is_locked = 1
            BEGIN
                SELECT RAISE(ABORT, 'Fiscal year is permanently locked.');
            END
        `);
        await run(db, `
            CREATE TRIGGER IF NOT EXISTS prevent_fiscal_year_unlock
            BEFORE UPDATE OF is_locked ON Fiscal_Years
            WHEN OLD.is_locked = 1 AND NEW.is_locked = 0
            BEGIN
                SELECT RAISE(ABORT, 'Fiscal year is permanently locked.');
            END
        `);
        await run(db, `
            CREATE TRIGGER IF NOT EXISTS prevent_locked_fiscal_year_delete
            BEFORE DELETE ON Fiscal_Years
            WHEN OLD.is_locked = 1
            BEGIN
                SELECT RAISE(ABORT, 'Fiscal year is permanently locked.');
            END
        `);

        await run(db, 'COMMIT');
    } catch (error) {
        await run(db, 'ROLLBACK').catch(rollbackError => {
            console.error('Fiscal-year schema rollback failed:', rollbackError.message);
        });
        await run(db, 'PRAGMA foreign_keys = ON');
        throw error;
    }

    await run(db, 'PRAGMA foreign_keys = ON');
    const violations = [];
    for (const table of ['Categories', 'Subcategories', 'Items', 'Purchase_Records']) {
        violations.push(...await all(db, `PRAGMA foreign_key_check(${table})`));
    }
    if (violations.length) {
        throw new Error(`Fiscal-year database migration found ${violations.length} foreign-key violation(s).`);
    }

    if (hasFiscalYear && !currentYearAlreadyExists) {
        let source = await getActiveFiscalYear(db);
        if (!source) {
            source = await get(db, `SELECT fiscal_year_id, year FROM Fiscal_Years ORDER BY year DESC LIMIT 1`);
        }
        if (source) {
            await createFiscalYear(db, currentYear, source.fiscal_year_id, uuidv4);
        } else {
            await run(db, `INSERT INTO Fiscal_Years (fiscal_year_id, year) VALUES (?, ?)`, [activeYearId, currentYear]);
            await run(db, `
                INSERT INTO Config (key, value) VALUES ('active_fiscal_year_id', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `, [activeYearId]);
        }
    }

    const activeYear = await get(db, `SELECT fiscal_year_id FROM Fiscal_Years WHERE year = ?`, [currentYear]);
    if (activeYear) {
        await run(db, `
            INSERT INTO Config (key, value) VALUES ('active_fiscal_year_id', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [activeYear.fiscal_year_id]);
    }
}

async function getActiveFiscalYear(db) {
    return get(db, `
        SELECT fy.fiscal_year_id, fy.year, fy.is_locked
        FROM Config c
        JOIN Fiscal_Years fy ON fy.fiscal_year_id = c.value
        WHERE c.key = 'active_fiscal_year_id'
    `);
}

async function createFiscalYear(db, year, sourceFiscalYearId, uuid) {
    const source = await get(db, `SELECT fiscal_year_id FROM Fiscal_Years WHERE fiscal_year_id = ?`, [sourceFiscalYearId]);
    if (!source) throw new Error('Source fiscal year not found.');

    const categories = await all(db, `SELECT * FROM Categories WHERE fiscal_year_id = ? ORDER BY category_name`, [sourceFiscalYearId]);
    const subcategories = await all(db, `SELECT * FROM Subcategories WHERE fiscal_year_id = ? ORDER BY subcategory_name`, [sourceFiscalYearId]);
    const items = await all(db, `SELECT * FROM Items WHERE fiscal_year_id = ? ORDER BY item_name`, [sourceFiscalYearId]);
    const fiscalYearId = uuid();
    const categoryIds = new Map(categories.map(category => [category.category_id, uuid()]));
    const subcategoryIds = new Map(subcategories.map(subcategory => [subcategory.subcategory_id, uuid()]));
    const itemIds = new Map(items.map(item => [item.item_id, uuid()]));

    await run(db, 'BEGIN IMMEDIATE');
    try {
        await run(db, `INSERT INTO Fiscal_Years (fiscal_year_id, year) VALUES (?, ?)`, [fiscalYearId, year]);

        for (const category of categories) {
            await run(db, `
                INSERT INTO Categories (category_id, fiscal_year_id, category_name) VALUES (?, ?, ?)
            `, [categoryIds.get(category.category_id), fiscalYearId, category.category_name]);
        }
        for (const subcategory of subcategories) {
            await run(db, `
                INSERT INTO Subcategories (subcategory_id, category_id, fiscal_year_id, subcategory_name)
                VALUES (?, ?, ?, ?)
            `, [
                subcategoryIds.get(subcategory.subcategory_id),
                categoryIds.get(subcategory.category_id),
                fiscalYearId,
                subcategory.subcategory_name
            ]);
        }
        for (const item of items) {
            await run(db, `
                INSERT INTO Items (item_id, fiscal_year_id, item_name, category_id, subcategory_id, unit_price, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                itemIds.get(item.item_id),
                fiscalYearId,
                item.item_name,
                categoryIds.get(item.category_id),
                subcategoryIds.get(item.subcategory_id) || null,
                item.unit_price,
                item.description,
                item.is_active
            ]);
        }

        await run(db, `UPDATE Config SET value = ? WHERE key = 'active_fiscal_year_id'`, [fiscalYearId]);
        await run(db, 'COMMIT');
    } catch (error) {
        await run(db, 'ROLLBACK').catch(rollbackError => {
            console.error('Fiscal-year creation rollback failed:', rollbackError.message);
        });
        throw error;
    }

    return { fiscal_year_id: fiscalYearId, year, is_locked: 0 };
}

async function setActiveFiscalYear(db, fiscalYearId) {
    const year = await get(db, `SELECT fiscal_year_id, year, is_locked FROM Fiscal_Years WHERE fiscal_year_id = ?`, [fiscalYearId]);
    if (!year) return null;
    await run(db, `
        INSERT INTO Config (key, value) VALUES ('active_fiscal_year_id', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [fiscalYearId]);
    return year;
}

module.exports = {
    createFiscalYear,
    getActiveFiscalYear,
    getLegacyPostedDateIssues,
    initializeFiscalYearSchema,
    parseIsoDate,
    setActiveFiscalYear
};
