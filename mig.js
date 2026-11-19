const XLSX = require("xlsx");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");   // npm install uuid

const db = new sqlite3.Database("./finance.db");

// Helper: run DB query with promise
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function insertVendorsFromExcel(filePath, sheetName) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let currentVendor = null;
    let currentVendorID = null;

    for (let i = 1; i < rows.length; i++) {   // skip header row
        const row = rows[i];

        const vendorName = row[1];  // vendor name column
        const tin = row[2];         // TIN column
        const mrc = row[3];         // MRC column

        // CASE 1 — New vendor row
        if (vendorName && vendorName.trim() !== "") {
            currentVendor = vendorName.trim();
            const tinNumber = tin ? String(tin).trim() : "";

            // Generate vendor_id
            currentVendorID = `vendor_${uuidv4()}`;

            // Insert vendor
            await runQuery(
                `INSERT INTO Vendors (vendor_id, vendor_name, tin_number, contact_info, address)
                 VALUES (?, ?, ?, ?, ?)`,
                [currentVendorID, currentVendor, tinNumber, "", ""]
            );

            console.log(`✔ Added Vendor: ${currentVendor} (${tinNumber})`);

            // Insert first MRC if exists
            if (mrc) {
                await insertMRC(currentVendorID, mrc);
            }
        }

        // CASE 2 — Blank vendor but has MRC → belongs to previous vendor
        else if (mrc && currentVendorID) {
            await insertMRC(currentVendorID, mrc);
        }
    }

    console.log("🎉 Import complete!");
    db.close();
}

async function insertMRC(vendorID, mrcNumber) {
    const mrcID = `mrc_${uuidv4()}`;

    await runQuery(
        `INSERT INTO MRC_Numbers (mrc_id, vendor_id, mrc_number)
         VALUES (?, ?, ?)`,
        [mrcID, vendorID, String(mrcNumber).trim()]
    );

    console.log(`   → MRC added: ${mrcNumber}`);
}

// Example usage
insertVendorsFromExcel("main.xlsx", "VENDORS");
