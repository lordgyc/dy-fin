const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid'); // Import uuid
const { sendLogToTelegram, fetchLogsFromTelegram } = require('./telegramBot'); // Import Telegram bot functions

module.exports = (userDataPath) => {
  const app = express();
  const port = 3000;

  app.use(cors());
  app.use(express.json());

  // Construct the database path using userDataPath
  const dbPath = path.join(userDataPath, 'finance.db');
  console.log('Database path:', dbPath);

  // Connect to SQLite database
  const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
          console.error('Error connecting to database:', err.message);
      } else {
          console.log('Connected to the SQLite database.');
          // Create tables after successful connection
          db.serialize(() => {
              db.run(`CREATE TABLE IF NOT EXISTS Vendors (
                  vendor_id TEXT PRIMARY KEY,
                  vendor_name TEXT NOT NULL,
                  tin_number TEXT NOT NULL UNIQUE,
                  contact_info TEXT,
                  address TEXT
              );`);
              db.run(`CREATE TABLE IF NOT EXISTS MRC_Numbers (
                  mrc_id TEXT PRIMARY KEY,
                  vendor_id TEXT NOT NULL,
                  mrc_number TEXT NOT NULL,
                  FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id) ON DELETE CASCADE
              );`);
              db.run(`CREATE TABLE IF NOT EXISTS Categories (
                  category_id TEXT PRIMARY KEY,
                  category_name TEXT NOT NULL UNIQUE
              );`);
              db.run(`CREATE TABLE IF NOT EXISTS Subcategories (
                  subcategory_id TEXT PRIMARY KEY,
                  category_id TEXT NOT NULL,
                  subcategory_name TEXT NOT NULL,
                  UNIQUE (category_id, subcategory_name),
                  FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE
              );`);
              db.run(`CREATE TABLE IF NOT EXISTS Items (
                  item_id TEXT PRIMARY KEY,
                  item_name TEXT NOT NULL,
                  category_id TEXT NOT NULL,
                  subcategory_id TEXT,
                  unit_price REAL NOT NULL,
                  description TEXT,
                  FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE RESTRICT,
                  FOREIGN KEY (subcategory_id) REFERENCES Subcategories(subcategory_id) ON DELETE SET NULL
              );`);
              db.run(`CREATE TABLE IF NOT EXISTS Purchase_Records (
                  purchase_id TEXT PRIMARY KEY,
                  vendor_id TEXT NOT NULL,
                  item_id TEXT NOT NULL,
                  purchase_date DATE NOT NULL,
                  unit TEXT NOT NULL,
                  quantity REAL NOT NULL,
                  unit_price REAL NOT NULL,
                  vat_amount REAL,
                  fs_number TEXT NOT NULL,
                  total_amount REAL NOT NULL,
                  vat_percentage REAL,
                  mrc_number TEXT,
                  FOREIGN KEY (vendor_id) REFERENCES Vendors(vendor_id) ON DELETE RESTRICT,
                  FOREIGN KEY (item_id) REFERENCES Items(item_id) ON DELETE RESTRICT
              );`);

              db.run(`CREATE TABLE IF NOT EXISTS Activity_Logs (
                  log_id TEXT PRIMARY KEY,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  action_type TEXT NOT NULL, /* e.g., 'INSERT', 'UPDATE', 'DELETE' */
                  table_name TEXT NOT NULL,
                  record_id TEXT NOT NULL, /* The UUID of the record affected in its respective table */
                  old_data TEXT, /* JSON string of old record data (for UPDATE/DELETE) */
                  new_data TEXT, /* JSON string of new record data (for INSERT/UPDATE) */
                  synced_to_bot INTEGER DEFAULT 0 /* 0 for not synced, 1 for synced */
              );`);

              // New Config table to store application settings like last synced Telegram update ID
              db.run(`CREATE TABLE IF NOT EXISTS Config (
                  key TEXT PRIMARY KEY,
                  value TEXT
              );`);

              db.run(`CREATE TABLE IF NOT EXISTS Users (
                  user_id TEXT PRIMARY KEY,
                  username TEXT NOT NULL UNIQUE,
                  password TEXT NOT NULL, /* Storing plaintext password - NOT SECURE FOR PRODUCTION */
                  role TEXT NOT NULL DEFAULT 'regular'
              );`);

              db.run(`CREATE INDEX IF NOT EXISTS idx_vendor_tin ON Vendors(tin_number);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_mrc_vendor ON MRC_Numbers(vendor_id);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_item_category ON Items(category_id);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_item_subcategory ON Items(subcategory_id);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_purchase_vendor ON Purchase_Records(vendor_id);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_purchase_item ON Purchase_Records(item_id);`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_purchase_date ON Purchase_Records(purchase_date);`, (err) => {
                  if (err) {
                      // Check if table already exists error
                      if (err.message.includes('already exists')) {
                          console.log('Tables already exist, skipping creation.');
                      } else {
                          console.error('Error creating tables:', err.message);
                      }
                  } else {
                      console.log('All tables created or already exist.');

                      // Insert fake vendor data if tables are empty
                      db.get(`SELECT COUNT(*) as count FROM Vendors`, (err, row) => {
                          if (err) {
                              console.error('Error checking Vendors table:', err.message);
                              return;
                          }
                          if (row.count === 0) {
                              const vendors = [
                                  { name: 'Vendor A', tin: 'TIN-123456', mrcs: ['MRC-001', 'MRC-002'] },
                                  { name: 'Vendor B', tin: 'TIN-789012', mrcs: ['MRC-003'] },
                                  { name: 'Vendor C', tin: 'TIN-345678', mrcs: ['MRC-004', 'MRC-005', 'MRC-006'] },
                                  { name: 'Vendor D', tin: 'TIN-901234', mrcs: [] }
                              ];

                              vendors.forEach(vendor => {
                                  const vendorId = uuidv4();
                                  db.run('INSERT INTO Vendors (vendor_id, vendor_name, tin_number, contact_info, address) VALUES (?, ?, ?, ?, ?)',
                                      [vendorId, vendor.name, vendor.tin, 'N/A', 'N/A'], function(vendorErr) {
                                      if (vendorErr) {
                                          console.error(`Error inserting vendor ${vendor.name}:`, vendorErr.message);
                                      } else {
                                          if (vendor.mrcs.length > 0) {
                                              vendor.mrcs.forEach(mrc => {
                                                  const mrcId = uuidv4();
                                                  db.run('INSERT INTO MRC_Numbers (mrc_id, vendor_id, mrc_number) VALUES (?, ?, ?)', [mrcId, vendorId, mrc], (mrcErr) => {
                                                      if (mrcErr) {
                                                          console.error(`Error inserting MRC ${mrc} for ${vendor.name}:`, mrcErr.message);
                                                      }
                                                  });
                                              });
                                          }
                                          console.log(`Inserted vendor: ${vendor.name} with ID: ${vendorId}`);
                                      }
                                  });
                              });
                          }
                      });

                      // Insert fake category data if table is empty
                      db.get(`SELECT COUNT(*) as count FROM Categories`, (err, row) => {
                          if (err) {
                              console.error('Error checking Categories table:', err.message);
                              return;
                          }
                          if (row.count === 0) {
                              const categories = ['Electronics', 'Office Supplies', 'Food'];
                              categories.forEach(categoryName => {
                                  const categoryId = uuidv4();
                                  db.run('INSERT INTO Categories (category_id, category_name) VALUES (?, ?)', [categoryId, categoryName], function(catErr) {
                                      if (catErr) {
                                          console.error(`Error inserting category ${categoryName}:`, catErr.message);
                                      } else {
                                          console.log(`Inserted category: ${categoryName}`);
                                      }
                                  });
                              });
                          }
                      });

                      // Insert fake subcategory data if table is empty
                      db.get(`SELECT COUNT(*) as count FROM Subcategories`, (err, row) => {
                          if (err) {
                              console.error('Error checking Subcategories table:', err.message);
                              return;
                          }
                          if (row.count === 0) {
                              db.get(`SELECT category_id FROM Categories WHERE category_name = 'Electronics'`, (err, electronicsCat) => {
                                  const electronicsId = electronicsCat ? electronicsCat.category_id : null;
                                  db.get(`SELECT category_id FROM Categories WHERE category_name = 'Office Supplies'`, (err, officeSuppliesCat) => {
                                      const officeSuppliesId = officeSuppliesCat ? officeSuppliesCat.category_id : null;

                                      if (electronicsId) {
                                          const laptopsSubcatId = uuidv4();
                                          db.run('INSERT INTO Subcategories (subcategory_id, category_id, subcategory_name) VALUES (?, ?, ?)', [laptopsSubcatId, electronicsId, 'Laptops'], (subErr) => {
                                              if (subErr) console.error('Error inserting subcategory Laptops:', subErr.message);
                                              else console.log('Inserted subcategory: Laptops');
                                          });
                                          const peripheralsSubcatId = uuidv4();
                                          db.run('INSERT INTO Subcategories (subcategory_id, category_id, subcategory_name) VALUES (?, ?, ?)', [peripheralsSubcatId, electronicsId, 'Peripherals'], (subErr) => {
                                              if (subErr) console.error('Error inserting subcategory Peripherals:', subErr.message);
                                              else console.log('Inserted subcategory: Peripherals');
                                          });
                                      }
                                      if (officeSuppliesId) {
                                          const writingSubcatId = uuidv4();
                                          db.run('INSERT INTO Subcategories (subcategory_id, category_id, subcategory_name) VALUES (?, ?, ?)', [writingSubcatId, officeSuppliesId, 'Writing Instruments'], (subErr) => {
                                              if (subErr) console.error('Error inserting subcategory Writing Instruments:', subErr.message);
                                              else console.log('Inserted subcategory: Writing Instruments');
                                          });
                                          const paperSubcatId = uuidv4();
                                          db.run('INSERT INTO Subcategories (subcategory_id, category_id, subcategory_name) VALUES (?, ?, ?)', [paperSubcatId, officeSuppliesId, 'Paper Products'], (subErr) => {
                                              if (subErr) console.error('Error inserting subcategory Paper Products:', subErr.message);
                                              else console.log('Inserted subcategory: Paper Products');
                                          });
                                      }
                                  });
                              });
                          }
                      });

                      // Insert fake item data if table is empty
                      db.get(`SELECT COUNT(*) as count FROM Items`, (err, row) => {
                          if (err) {
                              console.error('Error checking Items table:', err.message);
                              return;
                          }
                          if (row.count === 0) {
                              db.get(`SELECT category_id FROM Categories WHERE category_name = 'Electronics'`, (err, electronicsCat) => {
                                  const electronicsId = electronicsCat ? electronicsCat.category_id : null;
                                  db.get(`SELECT category_id FROM Categories WHERE category_name = 'Office Supplies'`, (err, officeSuppliesCat) => {
                                      const officeSuppliesId = officeSuppliesCat ? officeSuppliesCat.category_id : null;

                                      // Fetch subcategory IDs
                                      db.get(`SELECT subcategory_id FROM Subcategories WHERE subcategory_name = 'Laptops'`, (err, laptopsSubcat) => {
                                          const laptopsSubcatId = laptopsSubcat ? laptopsSubcat.subcategory_id : null;
                                          db.get(`SELECT subcategory_id FROM Subcategories WHERE subcategory_name = 'Peripherals'`, (err, peripheralsSubcat) => {
                                              const peripheralsSubcatId = peripheralsSubcat ? peripheralsSubcat.subcategory_id : null;
                                              db.get(`SELECT subcategory_id FROM Subcategories WHERE subcategory_name = 'Writing Instruments'`, (err, writingSubcat) => {
                                                  const writingSubcatId = writingSubcat ? writingSubcat.subcategory_id : null;
                                                  db.get(`SELECT subcategory_id FROM Subcategories WHERE subcategory_name = 'Paper Products'`, (err, paperSubcat) => {
                                                      const paperSubcatId = paperSubcat ? paperSubcat.subcategory_id : null;

                                                      const items = [
                                                          { name: 'Laptop', category_id: electronicsId, subcategory_id: laptopsSubcatId, unit_price: 1200.00 },
                                                          { name: 'Gaming Mouse', category_id: electronicsId, subcategory_id: peripheralsSubcatId, unit_price: 60.00 },
                                                          { name: 'Wireless Keyboard', category_id: electronicsId, subcategory_id: peripheralsSubcatId, unit_price: 90.00 },
                                                          { name: 'Notebook (A4)', category_id: officeSuppliesId, subcategory_id: paperSubcatId, unit_price: 5.50 },
                                                          { name: 'Gel Pen (Blue)', category_id: officeSuppliesId, subcategory_id: writingSubcatId, unit_price: 1.20 }
                                                      ];

                                                      items.forEach(item => {
                                                          if (item.category_id) {
                                                              const itemId = uuidv4();
                                                              db.run('INSERT INTO Items (item_id, item_name, category_id, subcategory_id, unit_price, description) VALUES (?, ?, ?, ?, ?, ?)',
                                                                  [itemId, item.name, item.category_id, item.subcategory_id, item.unit_price, 'N/A'], (itemErr) => {
                                                                  if (itemErr) {
                                                                      console.error(`Error inserting item ${item.name}:`, itemErr.message);
                                                                  } else {
                                                                      console.log(`Inserted item: ${item.name}`);
                                                                  }
                                                              });
                                                          }
                                                      });
                                                  });
                                              });
                                          });
                                      });
                                  });
                              });
                          }
                      });

                      // Endpoint to create a default admin user if no users exist - MOVED HERE
                      db.get('SELECT COUNT(*) as count FROM Users', (err, row) => {
                          if (err) {
                              console.error('Error checking users table after creation:', err.message);
                              return;
                          }
                          if (row.count === 0) {
                              const defaultUsername = 'admin';
                              const defaultPassword = 'adminpass'; // In a real app, hash this password!
                              const defaultRole = 'admin';
                              const userId = uuidv4();
                              db.run('INSERT INTO Users (user_id, username, password, role) VALUES (?, ?, ?, ?)', [userId, defaultUsername, defaultPassword, defaultRole], (insertErr) => {
                                  if (insertErr) {
                                      console.error('Error creating default admin user after creation:', insertErr.message);
                                  } else {
                                      console.log('Default admin user created: ' + defaultUsername);
                                  }
                              });
                          }
                      });
                  }
              });
          });
      }
  });

  // Basic API endpoint
  app.get('/', (req, res) => {
      res.send('Finance Management API is running!');
  });

  app.post("/addvendors", (req, res) => {
    const { vendor_name, tin_number, mrc_numbers } = req.body;
    const vendor_id = require('uuid').v4(); // generate unique id

    db.run(
        `INSERT INTO Vendors (vendor_id, vendor_name, tin_number) VALUES (?, ?, ?)`,
        [vendor_id, vendor_name, tin_number],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });

            // Insert MRC numbers if provided
            if (mrc_numbers && Array.isArray(mrc_numbers)) {
                const stmt = db.prepare(`INSERT INTO MRC_Numbers (mrc_id, vendor_id, mrc_number) VALUES (?, ?, ?)`);
                mrc_numbers.forEach(mrc => {
                    stmt.run([require('uuid').v4(), vendor_id, mrc]);
                });
                stmt.finalize();
            }

            // Log the activity
            const log_id = uuidv4();
            const timestamp = new Date().toISOString();
            const action_type = 'INSERT';
            const table_name = 'Vendors';
            const record_id = vendor_id;
            const new_data = JSON.stringify({ vendor_id, vendor_name, tin_number, mrc_numbers });

            db.run(
                `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?, ?, ?)`,
                [log_id, timestamp, action_type, table_name, record_id, new_data],
                (logErr) => {
                    if (logErr) {
                        console.error('Error inserting into Activity_Logs for vendor add:', logErr.message);
                    }
                }
            );

            res.json({ message: "Vendor added", vendor_id });
        }
    );
});
app.put("/updatevendors/:vendor_id", (req, res) => {
    const { vendor_id } = req.params;
    const { vendor_name, tin_number, mrc_numbers } = req.body;

    // First, fetch the existing vendor record for logging purposes
    db.get(`SELECT v.vendor_id, v.vendor_name, v.tin_number, GROUP_CONCAT(m.mrc_number) AS mrc_numbers FROM Vendors v LEFT JOIN MRC_Numbers m ON v.vendor_id = m.vendor_id WHERE v.vendor_id = ? GROUP BY v.vendor_id, v.vendor_name, v.tin_number`, [vendor_id], (err, oldVendor) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!oldVendor) return res.status(404).json({ message: 'Vendor not found.' });

        // Transform oldVendor.mrc_numbers from string to array
        oldVendor.mrc_numbers = oldVendor.mrc_numbers ? oldVendor.mrc_numbers.split(',') : [];

        db.run(
            `UPDATE Vendors SET vendor_name = ?, tin_number = ? WHERE vendor_id = ?`,
            [vendor_name, tin_number, vendor_id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                // Delete old MRC numbers
                db.run(`DELETE FROM MRC_Numbers WHERE vendor_id = ?`, [vendor_id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Insert new MRC numbers
                    if (mrc_numbers && Array.isArray(mrc_numbers)) {
                        const stmt = db.prepare(`INSERT INTO MRC_Numbers (mrc_id, vendor_id, mrc_number) VALUES (?, ?, ?)`);
                        mrc_numbers.forEach(mrc => {
                            stmt.run([require('uuid').v4(), vendor_id, mrc]);
                        });
                        stmt.finalize();
                    }

                    // Fetch the updated vendor record for new_data in logs
                    db.get(`SELECT v.vendor_id, v.vendor_name, v.tin_number, GROUP_CONCAT(m.mrc_number) AS mrc_numbers FROM Vendors v LEFT JOIN MRC_Numbers m ON v.vendor_id = m.vendor_id WHERE v.vendor_id = ? GROUP BY v.vendor_id, v.vendor_name, v.tin_number`, [vendor_id], (err, newVendor) => {
                        if (err) {
                            console.error('Error fetching new vendor data for logging:', err.message);
                            return res.json({ message: "Vendor updated" }); // Proceed even if logging data fetch fails
                        }
                        if (newVendor) {
                            newVendor.mrc_numbers = newVendor.mrc_numbers ? newVendor.mrc_numbers.split(',') : [];

                            // Log the activity
                            const log_id = uuidv4();
                            const timestamp = new Date().toISOString();
                            const action_type = 'UPDATE';
                            const table_name = 'Vendors';
                            const record_id = vendor_id;
                            const old_data = JSON.stringify(oldVendor);
                            const new_data = JSON.stringify(newVendor);

                            db.run(
                                `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [log_id, timestamp, action_type, table_name, record_id, old_data, new_data],
                                (logErr) => {
                                    if (logErr) {
                                        console.error('Error inserting into Activity_Logs for vendor update:', logErr.message);
                                    }
                                }
                            );
                        }
                        res.json({ message: "Vendor updated" });
                    });
                });
            }
        );
    });
});
app.delete("/deletevendors/:vendor_id", (req, res) => {
    const { vendor_id } = req.params;

    db.get(`SELECT v.vendor_id, v.vendor_name, v.tin_number, GROUP_CONCAT(m.mrc_number) AS mrc_numbers FROM Vendors v LEFT JOIN MRC_Numbers m ON v.vendor_id = m.vendor_id WHERE v.vendor_id = ? GROUP BY v.vendor_id, v.vendor_name, v.tin_number`, [vendor_id], (err, oldVendor) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!oldVendor) return res.status(404).json({ message: 'Vendor not found.' });

        oldVendor.mrc_numbers = oldVendor.mrc_numbers ? oldVendor.mrc_numbers.split(',') : [];

        db.run(`DELETE FROM Vendors WHERE vendor_id = ?`, [vendor_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: 'Vendor not found for deletion.' });

            // Log the activity
            const log_id = uuidv4();
            const timestamp = new Date().toISOString();
            const action_type = 'DELETE';
            const table_name = 'Vendors';
            const record_id = vendor_id;
            const old_data = JSON.stringify(oldVendor);

            db.run(
                `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?, ?, ?)`,
                [log_id, timestamp, action_type, table_name, record_id, old_data],
                (logErr) => {
                    if (logErr) {
                        console.error('Error inserting into Activity_Logs for vendor delete:', logErr.message);
                    }
                }
            );
            res.json({ message: "Vendor deleted" });
        });
    });
});

app.get('/vendors', (req, res) => {
    const query = `
        SELECT v.vendor_id, v.vendor_name, v.tin_number, 
               GROUP_CONCAT(m.mrc_number) AS mrc_numbers
        FROM Vendors v
        LEFT JOIN MRC_Numbers m ON v.vendor_id = m.vendor_id
        GROUP BY v.vendor_id, v.vendor_name, v.tin_number
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Convert mrc_numbers string to array
        const result = rows.map(r => ({
            vendor_id: r.vendor_id,
            vendor_name: r.vendor_name,
            tin_number: r.tin_number,
            mrc_numbers: r.mrc_numbers ? r.mrc_numbers.split(',') : []
        }));
        res.json(result);
    });
});

  // CATEGORIES Endpoints
  app.post('/categories', (req, res) => {
      const { category_name } = req.body;
      if (!category_name) {
          return res.status(400).json({ error: 'Category name is required.' });
      }
      const category_id = uuidv4();
      db.run(`INSERT INTO Categories (category_id, category_name) VALUES (?, ?)`, [category_id, category_name], function(err) {
          if (err) {
              console.error('Error adding category:', err.message);
              return res.status(500).json({ error: err.message });
          }
          // Log the activity
          const log_id = uuidv4();
          const timestamp = new Date().toISOString();
          const action_type = 'INSERT';
          const table_name = 'Categories';
          const record_id = category_id;
          const new_data = JSON.stringify({ category_id, category_name });

          db.run(
              `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?, ?, ?)`,
              [log_id, timestamp, action_type, table_name, record_id, new_data],
              (logErr) => {
                  if (logErr) {
                      console.error('Error inserting into Activity_Logs for category add:', logErr.message);
                  }
              }
          );
          res.status(201).json({ message: 'Category added successfully', category_id });
      });
  });

  app.get('/categories', (req, res) => {
      db.all(`SELECT * FROM Categories`, [], (err, rows) => {
          if (err) {
              console.error('Error fetching categories:', err.message);
              return res.status(500).json({ error: err.message });
          }
          res.json(rows);
      });
  });

  app.put('/categories/:category_id', (req, res) => {
      const { category_id } = req.params;
      const { category_name } = req.body;
      if (!category_name) {
          return res.status(400).json({ error: 'Category name is required.' });
      }
      
      db.get(`SELECT * FROM Categories WHERE category_id = ?`, [category_id], (err, oldCategory) => {
          if (err) {
              console.error('Error fetching old category data for logging:', err.message);
              return res.status(500).json({ error: err.message });
          }
          if (!oldCategory) {
              return res.status(404).json({ message: 'Category not found.' });
          }

          db.run(`UPDATE Categories SET category_name = ? WHERE category_id = ?`, [category_name, category_id], function(err) {
              if (err) {
                  console.error('Error updating category:', err.message);
                  return res.status(500).json({ error: err.message });
              }
              if (this.changes === 0) {
                  return res.status(404).json({ message: 'Category not found or no changes made.' });
              }

              db.get(`SELECT * FROM Categories WHERE category_id = ?`, [category_id], (err, newCategory) => {
                  if (err) {
                      console.error('Error fetching new category data for logging:', err.message);
                      return res.json({ message: 'Category updated successfully' });
                  }
                  
                  // Log the activity
                  const log_id = uuidv4();
                  const timestamp = new Date().toISOString();
                  const action_type = 'UPDATE';
                  const table_name = 'Categories';
                  const record_id = category_id;
                  const old_data = JSON.stringify(oldCategory);
                  const new_data = JSON.stringify(newCategory);

                  db.run(
                      `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                      [log_id, timestamp, action_type, table_name, record_id, old_data, new_data],
                      (logErr) => {
                          if (logErr) {
                              console.error('Error inserting into Activity_Logs for category update:', logErr.message);
                          }
                      }
                  );
                  res.json({ message: 'Category updated successfully' });
              });
          });
      });
  });

  app.delete('/categories/:category_id', (req, res) => {
      const { category_id } = req.params;
      
      db.get(`SELECT * FROM Categories WHERE category_id = ?`, [category_id], (err, oldCategory) => {
          if (err) {
              console.error('Error fetching old category data for logging:', err.message);
              return res.status(500).json({ error: err.message });
          }
          if (!oldCategory) {
              return res.status(404).json({ message: 'Category not found.' });
          }

          db.run(`DELETE FROM Categories WHERE category_id = ?`, [category_id], function(err) {
              if (err) {
                  console.error('Error deleting category:', err.message);
                  return res.status(500).json({ error: err.message });
              }
              if (this.changes === 0) {
                  return res.status(404).json({ message: 'Category not found.' });
              }

              // Log the activity
              const log_id = uuidv4();
              const timestamp = new Date().toISOString();
              const action_type = 'DELETE';
              const table_name = 'Categories';
              const record_id = category_id;
              const old_data = JSON.stringify(oldCategory);

              db.run(
                  `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?, ?, ?)`,
                  [log_id, timestamp, action_type, table_name, record_id, old_data],
                  (logErr) => {
                      if (logErr) {
                          console.error('Error inserting into Activity_Logs for category delete:', logErr.message);
                      }
                  }
              );
              res.json({ message: 'Category deleted successfully' });
          });
      });
  });

    // SUBCATEGORIES Endpoints
    app.post('/subcategories', (req, res) => {
        const { category_id, subcategory_name } = req.body;
        if (!category_id || !subcategory_name) {
            return res.status(400).json({ error: 'Category ID and subcategory name are required.' });
        }
        const subcategory_id = uuidv4();
        db.run(`INSERT INTO Subcategories (subcategory_id, category_id, subcategory_name) VALUES (?, ?, ?)`, [subcategory_id, category_id, subcategory_name], function(err) {
            if (err) {
                console.error('Error adding subcategory:', err.message);
                return res.status(500).json({ error: err.message });
            }
            // Log the activity
            const log_id = uuidv4();
            const timestamp = new Date().toISOString();
            const action_type = 'INSERT';
            const table_name = 'Subcategories';
            const record_id = subcategory_id;
            const new_data = JSON.stringify({ subcategory_id, category_id, subcategory_name });

            db.run(
                `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?, ?, ?)`,
                [log_id, timestamp, action_type, table_name, record_id, new_data],
                (logErr) => {
                    if (logErr) {
                        console.error('Error inserting into Activity_Logs for subcategory add:', logErr.message);
                    }
                }
            );
            res.status(201).json({ message: 'Subcategory added successfully', subcategory_id });
        });
    });

    app.get('/subcategories/:category_id', (req, res) => {
        const { category_id } = req.params;
        db.all(`SELECT * FROM Subcategories WHERE category_id = ?`, [category_id], (err, rows) => {
            if (err) {
                console.error('Error fetching subcategories:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });

    app.put('/subcategories/:subcategory_id', (req, res) => {
        const { subcategory_id } = req.params;
        const { subcategory_name, category_id } = req.body;
        if (!subcategory_name || !category_id) {
            return res.status(400).json({ error: 'Subcategory name and category ID are required.' });
        }

        db.get(`SELECT * FROM Subcategories WHERE subcategory_id = ?`, [subcategory_id], (err, oldSubcategory) => {
            if (err) {
                console.error('Error fetching old subcategory data for logging:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (!oldSubcategory) {
                return res.status(404).json({ message: 'Subcategory not found.' });
            }

            db.run(`UPDATE Subcategories SET subcategory_name = ?, category_id = ? WHERE subcategory_id = ?`, [subcategory_name, category_id, subcategory_id], function(err) {
                if (err) {
                    console.error('Error updating subcategory:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Subcategory not found or no changes made.' });
                }

                db.get(`SELECT * FROM Subcategories WHERE subcategory_id = ?`, [subcategory_id], (err, newSubcategory) => {
                    if (err) {
                        console.error('Error fetching new subcategory data for logging:', err.message);
                        return res.json({ message: 'Subcategory updated successfully' });
                    }
                    
                    // Log the activity
                    const log_id = uuidv4();
                    const timestamp = new Date().toISOString();
                    const action_type = 'UPDATE';
                    const table_name = 'Subcategories';
                    const record_id = subcategory_id;
                    const old_data = JSON.stringify(oldSubcategory);
                    const new_data = JSON.stringify(newSubcategory);

                    db.run(
                        `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [log_id, timestamp, action_type, table_name, record_id, old_data, new_data],
                        (logErr) => {
                            if (logErr) {
                                console.error('Error inserting into Activity_Logs for subcategory update:', logErr.message);
                            }
                        }
                    );
                    res.json({ message: 'Subcategory updated successfully' });
                });
            });
        });
    });

    app.delete('/subcategories/:subcategory_id', (req, res) => {
        const { subcategory_id } = req.params;

        db.get(`SELECT * FROM Subcategories WHERE subcategory_id = ?`, [subcategory_id], (err, oldSubcategory) => {
            if (err) {
                console.error('Error fetching old subcategory data for logging:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (!oldSubcategory) {
                return res.status(404).json({ message: 'Subcategory not found.' });
            }

            db.run(`DELETE FROM Subcategories WHERE subcategory_id = ?`, [subcategory_id], function(err) {
                if (err) {
                    console.error('Error deleting subcategory:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Subcategory not found.' });
                }

                // Log the activity
                const log_id = uuidv4();
                const timestamp = new Date().toISOString();
                const action_type = 'DELETE';
                const table_name = 'Subcategories';
                const record_id = subcategory_id;
                const old_data = JSON.stringify(oldSubcategory);

                db.run(
                    `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?, ?, ?)`,
                    [log_id, timestamp, action_type, table_name, record_id, old_data],
                    (logErr) => {
                        if (logErr) {
                            console.error('Error inserting into Activity_Logs for subcategory delete:', logErr.message);
                        }
                    }
                );
                res.json({ message: 'Subcategory deleted successfully' });
            });
        });
    });

    // ITEMS Endpoints
    app.post('/items', (req, res) => {
        const { item_name, category_id, subcategory_id, unit_price, description } = req.body;
        if (!item_name || !category_id || !unit_price) {
            return res.status(400).json({ error: 'Item name, category ID, and unit price are required.' });
        }
        const item_id = uuidv4();
        db.run(`INSERT INTO Items (item_id, item_name, category_id, subcategory_id, unit_price, description) VALUES (?, ?, ?, ?, ?, ?)`, 
            [item_id, item_name, category_id, subcategory_id, unit_price, description], function(err) {
            if (err) {
                console.error('Error adding item:', err.message);
                return res.status(500).json({ error: err.message });
            }
            // Log the activity
            const log_id = uuidv4();
            const timestamp = new Date().toISOString();
            const action_type = 'INSERT';
            const table_name = 'Items';
            const record_id = item_id;
            const new_data = JSON.stringify({ item_id, item_name, category_id, subcategory_id, unit_price, description });

            db.run(
                `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?, ?, ?)`,
                [log_id, timestamp, action_type, table_name, record_id, new_data],
                (logErr) => {
                    if (logErr) {
                        console.error('Error inserting into Activity_Logs for item add:', logErr.message);
                    }
                }
            );
            res.status(201).json({ message: 'Item added successfully', item_id });
        });
    });

    app.get('/items', (req, res) => {
        const { category_id, subcategory_id } = req.query;
        let sql = `SELECT i.item_id, i.item_name, i.unit_price, i.description, c.category_name, s.subcategory_name 
                   FROM Items i
                   JOIN Categories c ON i.category_id = c.category_id
                   LEFT JOIN Subcategories s ON i.subcategory_id = s.subcategory_id`;
        const params = [];
        const conditions = [];

        if (category_id) {
            conditions.push(`i.category_id = ?`);
            params.push(category_id);
        }
        if (subcategory_id) {
            conditions.push(`i.subcategory_id = ?`);
            params.push(subcategory_id);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(` AND `);
        }

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Error fetching items:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });

    app.put('/items/:item_id', (req, res) => {
        const { item_id } = req.params;
        const { item_name, category_id, subcategory_id, unit_price, description } = req.body;
        if (!item_name || !category_id || !unit_price) {
            return res.status(400).json({ error: 'Item name, category ID, and unit price are required.' });
        }

        db.get(`SELECT * FROM Items WHERE item_id = ?`, [item_id], (err, oldItem) => {
            if (err) {
                console.error('Error fetching old item data for logging:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (!oldItem) {
                return res.status(404).json({ message: 'Item not found.' });
            }

            db.run(`UPDATE Items SET item_name = ?, category_id = ?, subcategory_id = ?, unit_price = ?, description = ? WHERE item_id = ?`, 
                [item_name, category_id, subcategory_id, unit_price, description, item_id], function(err) {
                if (err) {
                    console.error('Error updating item:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Item not found or no changes made.' });
                }

                db.get(`SELECT * FROM Items WHERE item_id = ?`, [item_id], (err, newItem) => {
                    if (err) {
                        console.error('Error fetching new item data for logging:', err.message);
                        return res.json({ message: 'Item updated successfully' });
                    }
                    
                    // Log the activity
                    const log_id = uuidv4();
                    const timestamp = new Date().toISOString();
                    const action_type = 'UPDATE';
                    const table_name = 'Items';
                    const record_id = item_id;
                    const old_data = JSON.stringify(oldItem);
                    const new_data = JSON.stringify(newItem);

                    db.run(
                        `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [log_id, timestamp, action_type, table_name, record_id, old_data, new_data],
                        (logErr) => {
                            if (logErr) {
                                console.error('Error inserting into Activity_Logs for item update:', logErr.message);
                            }
                        }
                    );
                    res.json({ message: 'Item updated successfully' });
                });
            });
        });
    });

    app.delete('/items/:item_id', (req, res) => {
        const { item_id } = req.params;

        db.get(`SELECT * FROM Items WHERE item_id = ?`, [item_id], (err, oldItem) => {
            if (err) {
                console.error('Error fetching old item data for logging:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (!oldItem) {
                return res.status(404).json({ message: 'Item not found.' });
            }

            db.run(`DELETE FROM Items WHERE item_id = ?`, [item_id], function(err) {
                if (err) {
                    console.error('Error deleting item:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Item not found.' });
                }

                // Log the activity
                const log_id = uuidv4();
                const timestamp = new Date().toISOString();
                const action_type = 'DELETE';
                const table_name = 'Items';
                const record_id = item_id;
                const old_data = JSON.stringify(oldItem);

                db.run(
                    `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?, ?, ?)`,
                    [log_id, timestamp, action_type, table_name, record_id, old_data],
                    (logErr) => {
                        if (logErr) {
                            console.error('Error inserting into Activity_Logs for item delete:', logErr.message);
                        }
                    }
                );
                res.json({ message: 'Item deleted successfully' });
            });
        });
    });

  // Endpoint to search vendors for autocomplete and get their TIN and MRC numbers
  app.get('/search-vendors', (req, res) => {
      const searchTerm = '%' + req.query.query + '%'; // Add % for LIKE search
      const sql = `
          SELECT
              v.vendor_id,
              v.vendor_name,
              v.tin_number,
              GROUP_CONCAT(m.mrc_number) AS mrc_numbers
          FROM
              Vendors v
          LEFT JOIN
              MRC_Numbers m ON v.vendor_id = m.vendor_id
          WHERE
              v.vendor_name LIKE ?
          GROUP BY
              v.vendor_id, v.vendor_name, v.tin_number
          LIMIT 10;
      `;

      db.all(sql, [searchTerm], (err, rows) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else {
              // Parse mrc_numbers from comma-separated string to array
              const vendors = rows.map(row => ({
                  vendor_id: row.vendor_id,
                  vendor_name: row.vendor_name,
                  tin_number: row.tin_number,
                  mrc_numbers: row.mrc_numbers ? row.mrc_numbers.split(',') : []
              }));
              res.json(vendors);
          }
      });
  });
  app.get('/export/vat-report', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).send('Start date and end date are required for export.');
    }

    const sql = `
        SELECT
            v.vendor_name AS "Vendor Name", 
            v.tin_number AS "TIN No",
            pr.purchase_date AS "Purchase Date", 
            i.item_name AS "Item Name",
            pr.quantity AS "Quantity", 
            pr.unit_price AS "Unit Price", 
            pr.vat_percentage AS "VAT %",
            pr.vat_amount AS "VAT Amount",
            (pr.total_amount - pr.vat_amount) AS "Base Total",
            pr.total_amount AS "Total Amount"
        FROM Purchase_Records pr
        JOIN Vendors v ON pr.vendor_id = v.vendor_id
        JOIN Items i ON pr.item_id = i.item_id
        WHERE DATE(pr.purchase_date) BETWEEN ? AND ?
        ORDER BY v.vendor_name, pr.purchase_date;
    `;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error('Error fetching data for Excel export:', err.message);
            return res.status(500).send('Failed to fetch data for report.');
        }

        try {
            // 1. Create a new workbook and a worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(rows);

            // 2. Append the worksheet to the workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'VAT Report');

            // 3. Generate a buffer (a temporary binary representation of the file)
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            // 4. Set headers to tell the browser to download the file
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="VAT_Report_${startDate}_to_${endDate}.xlsx"`
            );
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );

            // 5. Send the file buffer as the response
            res.send(buffer);

        } catch (error) {
            console.error('Failed to generate Excel file:', error);
            res.status(500).send('Error generating Excel file.');
        }
    });
  });

  // Endpoint to search items for autocomplete and get their unit price
  app.get('/search-items', (req, res) => {
      const searchTerm = '%' + req.query.query + '%';
      const sql = `
          SELECT
              item_id,
              item_name,
              unit_price
          FROM
              Items
          WHERE
              item_name LIKE ?
          LIMIT 10;
      `;

      db.all(sql, [searchTerm], (err, rows) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else {
              res.json(rows);
          }
      });
  });

  // Login endpoint
  app.post('/login', (req, res) => {
      const { username, password } = req.body;
      db.get('SELECT * FROM Users WHERE username = ? AND password = ?', [username, password], (err, user) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else if (user) {
              res.json({ message: 'Login successful', user: { user_id: user.user_id, username: user.username, role: user.role } });
          } else {
              res.status(401).json({ message: 'Invalid username or password' });
          }
      });
  });

  // Endpoint to save purchase records
  app.post('/save-purchase-records', (req, res) => {
      const record = req.body; // Expect a single record object

      if (!record || typeof record !== 'object') {
          return res.status(400).json({ message: 'Invalid purchase record provided.' });
      }

      db.serialize(() => {
          db.run('BEGIN TRANSACTION;');

          const stmt = db.prepare(
              `INSERT INTO Purchase_Records (
                  purchase_id, vendor_id, item_id, purchase_date, unit, quantity, unit_price, vat_amount, fs_number, total_amount, vat_percentage, mrc_number
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          );

          const purchase_id = uuidv4();
          const vendor_id = record.vendorId;
          const item_id = record.itemId;
          const totalAmount = record.baseTotal + record.totalVat; // Calculate total from baseTotal and totalVat

          stmt.run(
              purchase_id, vendor_id, item_id, record.purchaseDate, record.unit,
              record.quantity, record.unitPrice, record.totalVat, record.fsNumber, totalAmount, record.vatPercentage, record.mrcNo
          , function(err) {
              if (err) {
                  console.error('Error inserting record:', err.message);
                  db.run('ROLLBACK;'); // Rollback on error
                  return res.status(500).json({ error: err.message });
              } else {
                  console.log(`A row has been inserted with rowid ${purchase_id}`);

                  // Insert into Activity_Logs
                  const log_id = uuidv4();
                  const timestamp = new Date().toISOString();
                  const action_type = 'INSERT';
                  const table_name = 'Purchase_Records';
                  const record_id = purchase_id;
                  const new_data = JSON.stringify(record);

                  db.run(
                      `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, new_data) VALUES (?, ?, ?, ?, ?, ?)`,
                      [log_id, timestamp, action_type, table_name, record_id, new_data],
                      (logErr) => {
                          if (logErr) {
                              console.error('Error inserting into Activity_Logs:', logErr.message);
                              // Decide how to handle log insertion failure (e.g., rollback main transaction or just log error)
                              // For now, we'll proceed with committing the main transaction but log the error.
                          }
                      }
                  );

                  stmt.finalize();
                  db.run('COMMIT;', (err) => {
                      if (err) {
                          res.status(500).json({ error: err.message });
                      } else {
                          res.json({ message: 'Purchase record saved successfully.' });
                      }
                  });
              }
          });
      });
  });

  // New endpoint to fetch the last 10 purchase records
  app.get('/last-10-purchase-records', (req, res) => {
      const sql = `
          SELECT
              pr.purchase_id, pr.purchase_date, pr.unit, pr.quantity, pr.unit_price,
              pr.vat_amount, pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number,
              v.vendor_name, v.tin_number, i.item_name
          FROM Purchase_Records pr
          JOIN Vendors v ON pr.vendor_id = v.vendor_id
          JOIN Items i ON pr.item_id = i.item_id
          ORDER BY pr.purchase_id DESC LIMIT 10;
      `;
      db.all(sql, [], (err, rows) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else {
              // mrc_numbers is now a single column in Purchase_Records, no need for parsing an array
              res.json(rows);
          }
      });
  });

  // Endpoint for syncing logs with Telegram bot
  app.post('/sync-logs', async (req, res) => {
      let sentLogsCount = 0;
      let fetchedLogsCount = 0;
      let syncMessage = '';
      let errorDetails = null;

      try {
          // 1. Fetch and send unsynced logs
          const unsyncedLogs = await new Promise((resolve, reject) => {
              db.all(`SELECT * FROM Activity_Logs WHERE synced_to_bot = 0`, [], (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              });
          });

          if (unsyncedLogs.length > 0) {
              const success = await sendLogToTelegram(unsyncedLogs);
              if (success) {
                  const logIdsToMarkSynced = unsyncedLogs.map(log => log.log_id);
                  await new Promise((resolve, reject) => {
                      db.run(`UPDATE Activity_Logs SET synced_to_bot = 1 WHERE log_id IN (${logIdsToMarkSynced.map(() => '?').join(',')})`, logIdsToMarkSynced, (err) => {
                          if (err) reject(err);
                          else resolve();
                      });
                  });
                  sentLogsCount = logIdsToMarkSynced.length;
                  syncMessage += `Synced ${sentLogsCount} logs with Telegram. `;
                  console.log(`Synced ${sentLogsCount} logs with Telegram.`);
              } else {
                  syncMessage += 'Failed to send some logs to Telegram. ';
                  errorDetails = 'Failed to send unsynced logs.';
              }
          } else {
              syncMessage += 'No unsynced logs to send. ';
          }

          let fetchedLogsCount = 0;
          const lastFetchedUpdateId = await new Promise((resolve, reject) => {
              db.get(`SELECT value FROM Config WHERE key = 'last_fetched_telegram_update_id'`, (err, row) => {
                  if (err) reject(err);
                  else resolve(row ? parseInt(row.value, 10) : 0); // Default to 0 if not found
              });
          });
          const { logs: incomingLogs, newLastUpdateId } = await fetchLogsFromTelegram(lastFetchedUpdateId);
          
          if (incomingLogs.length > 0) {
              for (const log of incomingLogs) {
                  try {
                      const new_data = log.new_data ? JSON.parse(log.new_data) : null;
                      const old_data = log.old_data ? JSON.parse(log.old_data) : null;

                      if (log.table_name === 'Purchase_Records') {
                          if (log.action_type === 'INSERT' && new_data) {
                              const existingRecord = await new Promise((resolve, reject) => {
                                  db.get(`SELECT purchase_id FROM Purchase_Records WHERE purchase_id = ?`, [log.record_id], (err, row) => {
                                      if (err) reject(err);
                                      else resolve(row);
                                  });
                              });
                              if (!existingRecord) {
                                  await new Promise((resolve, reject) => {
                                      db.run(`INSERT INTO Purchase_Records (purchase_id, vendor_id, item_id, purchase_date, unit, quantity, unit_price, vat_amount, fs_number, total_amount, vat_percentage, mrc_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                          [log.record_id, new_data.vendorId, new_data.itemId, new_data.purchaseDate, new_data.unit, new_data.quantity, new_data.unitPrice, new_data.totalVat, new_data.fsNumber, (new_data.baseTotal + new_data.totalVat), new_data.vatPercentage, new_data.mrcNo],
                                          (err) => {
                                              if (err) reject(err);
                                              else resolve();
                                          }
                                      );
                                  });
                                  fetchedLogsCount++;
                                  console.log(`Applied INSERT for Purchase_Records: ${log.record_id}`);
                              } else {
                                  console.log(`Skipped INSERT for existing record: ${log.record_id}`);
                              }
                          } else if (log.action_type === 'DELETE') {
                              await new Promise((resolve, reject) => {
                                  db.run(`DELETE FROM Purchase_Records WHERE purchase_id = ?`, [log.record_id], (err) => {
                                      if (err) reject(err);
                                      else resolve();
                                  });
                              });
                              fetchedLogsCount++;
                              console.log(`Applied DELETE for Purchase_Records: ${log.record_id}`);
                          } // TODO: Handle UPDATE for Purchase_Records if rows become editable
                      }
                  } catch (applyError) {
                      console.error(`Error applying incoming log ${log.log_id}:`, applyError.message);
                      errorDetails = errorDetails ? `${errorDetails}; Error applying log ${log.log_id}: ${applyError.message}` : `Error applying log ${log.log_id}: ${applyError.message}`;
                  }
              }
              syncMessage += `Fetched ${incomingLogs.length} updates from Telegram. Applied ${fetchedLogsCount} logs. `;
          } else {
              syncMessage += `No new updates fetched from Telegram (Last update ID: ${lastFetchedUpdateId}). `;
          }
          
          if (newLastUpdateId > lastFetchedUpdateId) {
              await new Promise((resolve, reject) => {
                  db.run(`INSERT OR REPLACE INTO Config (key, value) VALUES (?, ?)`, ['last_fetched_telegram_update_id', newLastUpdateId.toString()], (err) => {
                      if (err) reject(err);
                      else resolve();
                  });
              });
              console.log(`Updated last_fetched_telegram_update_id to ${newLastUpdateId}`);
          }

          if (errorDetails) {
              res.status(500).json({ message: `Sync completed with errors: ${syncMessage}`, sentCount: sentLogsCount, fetchedCount: fetchedLogsCount, error: errorDetails });
          } else {
              // Final consolidated success message
              let finalMessage = `Sync completed: ${sentLogsCount} logs sent. `;
              if (incomingLogs.length > 0) {
                  finalMessage += `Fetched ${incomingLogs.length} updates from Telegram. `;
                  if (fetchedLogsCount > 0) {
                      finalMessage += `Applied ${fetchedLogsCount} incoming logs.`;
                  } else {
                      finalMessage += `No new records applied from fetched updates.`;
                  }
              } else {
                  finalMessage += `No new updates fetched from Telegram.`;
              }
              res.json({ message: finalMessage, sentCount: sentLogsCount, fetchedCount: fetchedLogsCount });
          }

      } catch (error) {
          console.error('Unhandled error during log sync:', error);
          res.status(500).json({ error: 'Unhandled error during log sync.', details: error.message });
      }
  });

  // Endpoint to delete a purchase record
  app.delete('/purchase-records/:id', (req, res) => {
      const purchase_id = req.params.id;

      db.serialize(() => {
          db.run('BEGIN TRANSACTION;');

          // First, fetch the record to log its old_data
          db.get(`SELECT * FROM Purchase_Records WHERE purchase_id = ?`, [purchase_id], (err, oldRecord) => {
              if (err) {
                  console.error('Error fetching record for deletion logging:', err.message);
                  db.run('ROLLBACK;');
                  return res.status(500).json({ error: err.message });
              }
              if (!oldRecord) {
                  db.run('ROLLBACK;');
                  return res.status(404).json({ message: 'Record not found.' });
              }

              // Perform the delete operation
              db.run(`DELETE FROM Purchase_Records WHERE purchase_id = ?`, [purchase_id], function(deleteErr) {
                  if (deleteErr) {
                      console.error('Error deleting record:', deleteErr.message);
                      db.run('ROLLBACK;');
                      return res.status(500).json({ error: deleteErr.message });
                  }
                  if (this.changes === 0) {
                      db.run('ROLLBACK;');
                      return res.status(404).json({ message: 'Record not found for deletion.' });
                  }

                  console.log(`A row has been deleted with ID ${purchase_id}`);

                  // Insert into Activity_Logs
                  const log_id = uuidv4();
                  const timestamp = new Date().toISOString();
                  const action_type = 'DELETE';
                  const table_name = 'Purchase_Records';
                  const record_id = purchase_id;
                  const old_data = JSON.stringify(oldRecord);

                  db.run(
                      `INSERT INTO Activity_Logs (log_id, timestamp, action_type, table_name, record_id, old_data) VALUES (?, ?, ?, ?, ?, ?)`,
                      [log_id, timestamp, action_type, table_name, record_id, old_data],
                      (logErr) => {
                          if (logErr) {
                              console.error('Error inserting delete log into Activity_Logs:', logErr.message);
                              // Decide how to handle log insertion failure (e.g., rollback main transaction or just log error)
                          }
                      }
                  );

                  db.run('COMMIT;', (commitErr) => {
                      if (commitErr) {
                          res.status(500).json({ error: commitErr.message });
                      } else {
                          res.json({ message: 'Purchase record deleted successfully.' });
                      }
                  });
              });
          });
      });
  });
  app.get('/reports/jv',(req,res) =>{
    const {singledate} = req.query
    if(!singledate){
        return res.status(400).json({error: "selected a date please"})
    }
    const sql = `SELECT 
                    i.item_name,
                    p.total_amount
                FROM Purchase_Records p
                JOIN Items i ON p.item_id = i.item_id
                WHERE DATE(p.purchase_date) = ?;
`;
        db.all(sql, [singledate], (err, rows) => {
            if (err) {
                console.error('Error fetching VAT report:', err.message);
                res.status(500).json({ error: 'Failed to fetch VAT report.' });
            } else {
                res.json(rows);
            }
});         
})
  // New endpoint for VAT Report
  app.get('/reports/vat', (req, res) => {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required.' });
      }

      const finalEndDate = endDate;

      const sql = `
          SELECT
              pr.purchase_id, pr.purchase_date, pr.quantity, pr.unit_price, pr.vat_amount,
              pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number,
              v.vendor_name, v.tin_number, i.item_name
          FROM Purchase_Records pr
          JOIN Vendors v ON pr.vendor_id = v.vendor_id
          JOIN Items i ON pr.item_id = i.item_id
          WHERE DATE(pr.purchase_date) BETWEEN ? AND ?
          ORDER BY v.vendor_name, pr.purchase_date;
      `;

      db.all(sql, [startDate, finalEndDate], (err, rows) => {
          if (err) {
              console.error('Error fetching VAT report:', err.message);
              res.status(500).json({ error: 'Failed to fetch VAT report.' });
          } else {
              res.json(rows);
          }
      });
  });

  return app;
};
