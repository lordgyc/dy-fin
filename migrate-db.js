const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Usage: node migrate-db.js [optional_path_to_finance.db]
const dbPath = process.argv[2] || path.join(__dirname, 'finance.db');

if (!fs.existsSync(dbPath)) {
    console.error(`Error: Database file not found at: ${dbPath}`);
    console.log('Usage: node migrate-db.js "C:\\path\\to\\your\\finance.db"');
    process.exit(1);
}

console.log(`Migrating database schema for: ${dbPath}\n`);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Items table migration: is_active
    db.run(`ALTER TABLE Items ADD COLUMN is_active INTEGER DEFAULT 1;`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('  ✓ Items.is_active column already exists.');
            } else {
                console.log(`  ! Notice on Items.is_active: ${err.message}`);
            }
        } else {
            console.log('  ✔ Added column Items.is_active (default: 1)');
        }
    });

    // 2. Purchase_Records table migration: status
    db.run(`ALTER TABLE Purchase_Records ADD COLUMN status TEXT;`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('  ✓ Purchase_Records.status column already exists.');
            } else {
                console.log(`  ! Notice on Purchase_Records.status: ${err.message}`);
            }
        } else {
            console.log('  ✔ Added column Purchase_Records.status');
        }
    });

    // 3. Purchase_Records table migration: posted_date
    db.run(`ALTER TABLE Purchase_Records ADD COLUMN posted_date DATE;`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('  ✓ Purchase_Records.posted_date column already exists.');
            } else {
                console.log(`  ! Notice on Purchase_Records.posted_date: ${err.message}`);
            }
        } else {
            console.log('  ✔ Added column Purchase_Records.posted_date');
        }
    });

    // 4. Purchase_Records table migration: mrc_number
    db.run(`ALTER TABLE Purchase_Records ADD COLUMN mrc_number TEXT;`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('  ✓ Purchase_Records.mrc_number column already exists.');
            } else {
                console.log(`  ! Notice on Purchase_Records.mrc_number: ${err.message}`);
            }
        } else {
            console.log('  ✔ Added column Purchase_Records.mrc_number');
        }
    });

    // 5. Sync any existing Items whose category_id does not match their Subcategory's category_id
    db.run(`
        UPDATE Items 
        SET category_id = (
            SELECT category_id FROM Subcategories WHERE Subcategories.subcategory_id = Items.subcategory_id
        )
        WHERE subcategory_id IS NOT NULL 
          AND subcategory_id != ''
          AND category_id != (
            SELECT category_id FROM Subcategories WHERE Subcategories.subcategory_id = Items.subcategory_id
          );
    `, (err) => {
        if (err) {
            console.log(`  ! Notice on Items category sync: ${err.message}`);
        } else {
            console.log('  ✔ Synced item category IDs with subcategory parent categories.');
        }
    });
});

db.close(() => {
    console.log('\nMigration complete! Your database is now fully updated and compatible.');
});
