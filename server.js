const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3')
const path = require('path');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid'); // Import uuid
const { sendLogToTelegram, fetchLogsFromTelegram } = require('./telegramBot'); // Import Telegram bot functions
const puppeteer = require('puppeteer');
const fs = require('fs'); // Import the file system module

module.exports = (userDataPath) => {
  const app = express();
  const port = 3000;

  // Read report.css content once when the server starts
  let reportCssContent = '';
  try {
      reportCssContent = fs.readFileSync(path.join(__dirname, 'report.css'), 'utf8');
  } catch (error) {
      console.error('Error reading report.css:', error.message);
  }

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '.'))); // Serve static files from the current directory

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
              // *** MODIFICATION START ***
              // Added posted_date column
              db.run(`CREATE TABLE IF NOT EXISTS Purchase_Records (
                  purchase_id TEXT PRIMARY KEY,
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
                  FOREIGN KEY (item_id) REFERENCES Items(item_id) ON DELETE RESTRICT
              );`);
              // *** MODIFICATION END ***

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
      db.all(`SELECT * FROM Categories ORDER BY category_name`, [], (err, rows) => {
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
                  if (err.message.includes('SQLITE_CONSTRAINT')) {
                    return res.status(409).json({ error: 'Cannot delete category. It is currently in use by one or more items.' });
                  }
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

    // NOTE: /subcategories/list must come BEFORE /subcategories/:category_id 
    // to avoid "list" being treated as a category_id parameter
    app.get('/subcategories/list', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        console.log('Endpoint /subcategories/list called');
        
        // Use the same query pattern as the working /subcategories/:category_id endpoint
        const sql = `SELECT subcategory_id, subcategory_name, category_id FROM Subcategories ORDER BY subcategory_name`;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error('Error fetching subcategories list:', err.message);
                console.error('SQL Error details:', err);
                return res.status(500).json({ error: 'Failed to fetch subcategories list.', details: err.message });
            }
            
            console.log(`Subcategories list query returned ${rows ? rows.length : 0} rows`);
            
            // Verify we got data
            if (rows && rows.length > 0) {
                console.log('Sample subcategory:', rows[0]);
                console.log('First 3 subcategories:', rows.slice(0, 3));
            } else {
                // Check if table actually has data
                db.get(`SELECT COUNT(*) as count FROM Subcategories`, [], (countErr, countRow) => {
                    if (!countErr && countRow) {
                        console.log(`Database reports ${countRow.count} subcategories exist`);
                        if (countRow.count > 0) {
                            console.error('WARNING: Database has subcategories but SELECT returned 0 rows!');
                        }
                    }
                });
            }
            
            res.json(rows || []);
        });
    });

    app.get('/subcategories/:category_id', (req, res) => {
        const { category_id } = req.params;
        db.all(`SELECT * FROM Subcategories WHERE category_id = ? ORDER BY subcategory_name`, [category_id], (err, rows) => {
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
        if (!item_name || !category_id || unit_price === undefined) {
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
        let conditions = [];

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
        sql += ` ORDER BY i.item_name`;

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
        if (!item_name || !category_id || unit_price === undefined) {
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
            pr.mrc_number AS "MRC No",
            pr.purchase_date AS "Purchase Date",
            pr.fs_number AS "FS Number",
            i.item_name AS "Item Name",
            pr.quantity AS "Quantity", 
            pr.unit_price AS "Unit Price", 
            pr.vat_percentage AS "VAT %",
            pr.vat_amount AS "VAT Amount",
            (pr.total_amount - COALESCE(pr.vat_amount, 0)) AS "Base Total",
            pr.total_amount AS "Total Amount"
        FROM Purchase_Records pr
        JOIN Vendors v ON pr.vendor_id = v.vendor_id
        JOIN Items i ON pr.item_id = i.item_id
        WHERE DATE(pr.posted_date) BETWEEN ? AND ? AND pr.vat_amount > 0
        ORDER BY v.vendor_name, pr.posted_date;
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

  app.get('/export/yearly-report', (req, res) => {
    const { subcategory_id, startDate, endDate, etYear } = req.query;

    if (!subcategory_id || !startDate || !endDate) {
        return res.status(400).send('Subcategory ID, start date, and end date are required for export.');
    }

    // First, get the subcategory name for the filename
    db.get(`SELECT subcategory_name FROM Subcategories WHERE subcategory_id = ?`, [subcategory_id], (nameErr, subcategory) => {
        if (nameErr) {
            console.error('Error fetching subcategory name:', nameErr.message);
            return res.status(500).send('Failed to fetch subcategory name.');
        }

        const subcategoryName = subcategory ? subcategory.subcategory_name.replace(/[^a-z0-9]/gi, '_') : 'Unknown';
        const fileNameYear = etYear || new Date(startDate).getFullYear();

        const sql = `
            SELECT
                v.vendor_name AS "Vendor Name", 
                v.tin_number AS "TIN No",
                pr.mrc_number AS "MRC No",
                pr.purchase_date AS "Purchase Date",
                pr.fs_number AS "FS Number",
                i.item_name AS "Item Name",
                pr.quantity AS "Quantity", 
                pr.unit_price AS "Unit Price", 
                pr.vat_percentage AS "VAT %",
                pr.vat_amount AS "VAT Amount",
                (pr.total_amount - COALESCE(pr.vat_amount, 0)) AS "Base Total",
                pr.total_amount AS "Total Amount"
            FROM Purchase_Records pr
            JOIN Vendors v ON pr.vendor_id = v.vendor_id
            JOIN Items i ON pr.item_id = i.item_id
            WHERE i.subcategory_id = ? 
              AND DATE(pr.posted_date) BETWEEN ? AND ?
              AND pr.vat_amount > 0
            ORDER BY pr.posted_date, v.vendor_name;
        `;

        db.all(sql, [subcategory_id, startDate, endDate], (err, rows) => {
            if (err) {
                console.error('Error fetching data for Excel export:', err.message);
                return res.status(500).send('Failed to fetch data for report.');
            }

            try {
                // 1. Create a new workbook and a worksheet
                const workbook = XLSX.utils.book_new();
                const worksheet = XLSX.utils.json_to_sheet(rows);

                // 2. Append the worksheet to the workbook
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Yearly Report');

                // 3. Generate a buffer (a temporary binary representation of the file)
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

                // 4. Set headers to tell the browser to download the file
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="Yearly_Report_${subcategoryName}_${fileNameYear}.xlsx"`
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

  // *** START: UPDATED AND FIXED ENDPOINT ***
  // Endpoint to save or update purchase records
  app.post('/save-purchase-records', async (req, res) => {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
          return res.status(400).json({ message: 'Invalid or empty records data provided.' });
      }

      // Use a separate function to process each record
      const processRecord = (record) => {
          return new Promise(async (resolve, reject) => {
              // --- Auto-create Vendor/Item if they don't exist ---
              let vendorId = record.vendorId;
              if (!vendorId && record.vendorName) {
                  try {
                      const newVendor = await new Promise((res, rej) => {
                          const newId = uuidv4();
                          // First, try to insert. If it fails due to UNIQUE constraint, do nothing.
                          db.run('INSERT INTO Vendors (vendor_id, vendor_name, tin_number) VALUES (?, ?, ?)', [newId, record.vendorName, record.tinNo], function(err) {
                              if (err && err.code !== 'SQLITE_CONSTRAINT') {
                                  return rej(err);
                              }
                              // Always query for the vendor by TIN to get the correct ID, whether it was just inserted or already existed.
                              db.get('SELECT vendor_id FROM Vendors WHERE tin_number = ?', [record.tinNo], (err, row) => {
                                  if (err) return rej(err);
                                  res(row ? row.vendor_id : null);
                              });
                          });
                      });
                      vendorId = newVendor;
                  } catch (err) { return reject(err); }
              }

              let itemId = record.itemId;
              if (!itemId && record.itemName) {
                  try {
                      const newItem = await new Promise((res, rej) => {
                          const newId = uuidv4();
                          // Using 'default-category-id' as a placeholder since category isn't selected in the UI.
                          // In a real application, you'd want a more robust way to handle this.
                          db.run('INSERT INTO Items (item_id, item_name, category_id, unit_price) VALUES (?, ?, ?, ?)', [newId, record.itemName, 'default-category-id', record.unitPrice], function(err) {
                             if(err && err.code !== 'SQLITE_CONSTRAINT') return rej(err);
                             db.get('SELECT item_id FROM Items WHERE item_name = ?', [record.itemName], (err, row) => {
                                 if (err) return rej(err);
                                 res(row ? row.item_id : null);
                             });
                          });
                      });
                      itemId = newItem;
                  } catch(err) { return reject(err); }
              }
              // --- End of auto-creation ---

              if (!vendorId || !itemId) {
                  return reject(new Error(`Could not find or create vendor/item for record: ${record.itemName || 'N/A'}`));
              }
              
              if (record.purchaseId) { // This is an existing record, so UPDATE it.
                  const updateQuery = `
                      UPDATE Purchase_Records
                      SET vendor_id = ?, item_id = ?, purchase_date = ?, unit = ?, quantity = ?,
                          unit_price = ?, vat_amount = ?, fs_number = ?, total_amount = ?,
                          vat_percentage = ?, mrc_number = ?, status = ?
                      WHERE purchase_id = ?`;
                  db.run(updateQuery, [
                      vendorId, itemId, record.purchaseDate, record.unit, record.quantity,
                      record.unitPrice, record.vat_amount, record.fsNumber, record.total_amount,
                      record.vatPercentage, record.mrcNo, record.status, record.purchaseId
                  ], function(err) {
                      if (err) return reject(err);
                      console.log(`Updated record ${record.purchaseId}`);
                      // Log the update activity
                      const log_id = uuidv4();
                      db.run(`INSERT INTO Activity_Logs (log_id, action_type, table_name, record_id, new_data) VALUES (?, 'UPDATE', 'Purchase_Records', ?, ?)`, [log_id, record.purchaseId, JSON.stringify(record)]);
                      resolve({ id: record.purchaseId, status: 'updated' });
                  });

              } else { // This is a new record, so INSERT it.
                  const newPurchaseId = uuidv4();
                  const insertQuery = `
                      INSERT INTO Purchase_Records (
                          purchase_id, vendor_id, item_id, purchase_date, unit, quantity,
                          unit_price, vat_amount, fs_number, total_amount, vat_percentage, mrc_number, status
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                  db.run(insertQuery, [
                      newPurchaseId, vendorId, itemId, record.purchaseDate, record.unit, record.quantity,
                      record.unitPrice, record.vat_amount, record.fsNumber, record.total_amount,
                      record.vatPercentage, record.mrcNo, record.status
                  ], function(err) {
                      if (err) return reject(err);
                      console.log(`Inserted new record ${newPurchaseId}`);
                      // Log the insert activity
                      const log_id = uuidv4();
                      db.run(`INSERT INTO Activity_Logs (log_id, action_type, table_name, record_id, new_data) VALUES (?, 'INSERT', 'Purchase_Records', ?, ?)`, [log_id, newPurchaseId, JSON.stringify(record)]);
                      resolve({ id: newPurchaseId, status: 'inserted' });
                  });
              }
          });
      };

      // Execute all record processing promises within a transaction
      db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          Promise.all(records.map(processRecord))
              .then(results => {
                  db.run('COMMIT', (err) => {
                      if (err) {
                          console.error('Commit failed:', err);
                          res.status(500).json({ message: 'Transaction commit failed.', error: err.message });
                      } else {
                          res.status(200).json({ message: 'Records saved successfully!', results });
                      }
                  });
              })
              .catch(error => {
                  db.run('ROLLBACK', (err) => {
                      if (err) console.error('Rollback failed:', err);
                      console.error('Error in /save-purchase-records, transaction rolled back:', error);
                      res.status(500).json({ message: 'An error occurred while saving, transaction rolled back.', error: error.message });
                  });
              });
      });
  });
  // *** END: UPDATED AND FIXED ENDPOINT ***

  // New endpoint to fetch the last 10 purchase records
  app.get('/saved-purchase-records', (req, res) => {
      const sql = `
          SELECT
              pr.purchase_id, pr.purchase_date, pr.posted_date, pr.unit, pr.quantity, pr.unit_price,
              pr.vat_amount, pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number,
              v.vendor_id, v.vendor_name, v.tin_number, 
              i.item_id, i.item_name
          FROM Purchase_Records pr
          JOIN Vendors v ON pr.vendor_id = v.vendor_id
          JOIN Items i ON pr.item_id = i.item_id
          WHERE pr.status = 'saved'
          ORDER BY pr.purchase_date DESC
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

  // *** NEW ENDPOINT START ***
  // Endpoint to fetch posted purchase records by a specific posted_date
  app.get('/posted-purchase-records', (req, res) => {
      const { date } = req.query;
      if (!date) {
          return res.status(400).json({ error: 'A date parameter is required.' });
      }

      const sql = `
          SELECT
              pr.purchase_id, pr.purchase_date, pr.posted_date, pr.unit, pr.quantity, pr.unit_price,
              pr.vat_amount, pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number,
              v.vendor_id, v.vendor_name, v.tin_number,
              i.item_id, i.item_name
            FROM Purchase_Records pr
            JOIN Vendors v ON pr.vendor_id = v.vendor_id
            JOIN Items i ON pr.item_id = i.item_id
            WHERE pr.posted_date = ?
            ORDER BY pr.posted_date DESC
        `;

      db.all(sql, [date], (err, rows) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else {
              res.json(rows);
          }
      });
  });
  // *** NEW ENDPOINT END ***

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
                                            [log.record_id, new_data.vendorId, new_data.itemId, new_data.purchaseDate, new_data.unit, new_data.quantity, new_data.unitPrice, new_data.vat_amount, new_data.fsNumber, (new_data.base_total + new_data.vat_amount), new_data.vatPercentage, new_data.mrcNo],
                                            (err) => {
                                                if (err) reject(err);
                                                else resolve();
                                            }
                                        );
                                    })
                           
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
    app.get('/subcategories/all', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    console.error("greet - subcategories/all endpoint hit"); // Changed to console.error
      const sql = `
          SELECT subcategory_name FROM Subcategories;
      `;
      db.all(sql, [], (err, rows) => {
          if (err) {
              console.error('Error fetching all subcategories:', err.message);
              return res.status(500).json({ error: 'Failed to fetch all subcategories.' });
          }
          console.error('Subcategories fetched from DB:', rows); // Changed to console.error
          const subcategoryNames = rows.map(row => row.subcategory_name);
          console.error("run - sending subcategories response"); // Changed to console.error
          res.json(subcategoryNames);
      });
  });

  
  
  // *** MODIFICATION START: Updated JV Report Logic ***
  app.get('/reports/jv',(req,res) =>{
    const {singledate} = req.query;
    if(!singledate){
        return res.status(400).json({error: "A date must be selected."});
    }
    
    // Query for individual purchase records on the selected day
    const detailsSql = `
        SELECT
            i.item_name,
            (p.total_amount - COALESCE(p.vat_amount, 0)) AS base_total
        FROM Purchase_Records p
        JOIN Items i ON p.item_id = i.item_id
        WHERE DATE(p.posted_date) = ?;
    `;

    // Query for the daily totals
    const totalsSql = `
        SELECT
            SUM(COALESCE(p.vat_amount, 0)) AS total_vat,
            SUM(p.total_amount) AS grand_total
        FROM Purchase_Records p
        WHERE DATE(p.posted_date) = ?;
    `;

    // Execute both queries and combine the results
    db.all(detailsSql, [singledate], (err, detailsRows) => {
        if (err) {
            console.error('Error fetching JV report details:', err.message);
            return res.status(500).json({ error: 'Failed to fetch JV report details.' });
        }
        db.get(totalsSql, [singledate], (totalsErr, totalsRow) => {
            if (totalsErr) {
                console.error('Error fetching JV report totals:', totalsErr.message);
                return res.status(500).json({ error: 'Failed to fetch JV report totals.' });
            }
            res.json({
                details: detailsRows || [],
                totals: totalsRow || { total_vat: 0, grand_total: 0 }
            });
        });
    });         
  });
  // *** MODIFICATION END ***

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
              pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number, pr.unit,
              v.vendor_name, v.tin_number, i.item_name
          FROM Purchase_Records pr
          JOIN Vendors v ON pr.vendor_id = v.vendor_id
          JOIN Items i ON pr.item_id = i.item_id
          WHERE DATE(pr.posted_date) BETWEEN ? AND ? AND pr.vat_amount > 0
          ORDER BY v.vendor_name, pr.posted_date;
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

  // New endpoint for Yearly Report
  app.get('/reports/yearly', (req, res) => {
      const { subcategory_id, startDate, endDate } = req.query;

      if (!subcategory_id || !startDate || !endDate) {
          return res.status(400).json({ error: 'Subcategory ID, start date, and end date are required.' });
      }

      const sql = `
          SELECT
              pr.purchase_id, pr.purchase_date, pr.quantity, pr.unit_price, pr.vat_amount,
              pr.fs_number, pr.total_amount, pr.vat_percentage, pr.mrc_number, pr.unit,
              v.vendor_name, v.tin_number, i.item_name
          FROM Purchase_Records pr
          JOIN Vendors v ON pr.vendor_id = v.vendor_id
          JOIN Items i ON pr.item_id = i.item_id
          WHERE i.subcategory_id = ? 
            AND DATE(pr.posted_date) BETWEEN ? AND ?
            AND pr.vat_amount > 0
          ORDER BY pr.posted_date, v.vendor_name;
      `;

      db.all(sql, [subcategory_id, startDate, endDate], (err, rows) => {
          if (err) {
              console.error('Error fetching Yearly report:', err.message);
              res.status(500).json({ error: 'Failed to fetch Yearly report.' });
          } else {
              res.json(rows);
          }
      });
  });
  // *** MODIFICATION START: ADDED DETAILED LOGGING TO THE POSTING PROCESS ***
  app.post('/change-from-saved-to-posted', (req, res) => {
    let { purchase_ids } = req.body;

    if (!Array.isArray(purchase_ids) || purchase_ids.length === 0) {
      return res.status(400).json({ error: 'purchase_ids must be a non-empty array.' });
    }

    // Use a transaction to ensure all updates and logs are processed or none are.
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      let updatedCount = 0;
      const promises = purchase_ids.map(id => {
        return new Promise((resolve, reject) => {
          let oldRecordData = null;

          // 1. Fetch the record *before* updating to get old_data for logging
          db.get(`SELECT * FROM Purchase_Records WHERE purchase_id = ? AND status = 'saved'`, [id], (err, oldRecord) => {
            if (err) return reject(err);
            if (!oldRecord) {
              // If the record is not found or already posted, we can just resolve and skip it.
              return resolve(); 
            }
            oldRecordData = JSON.stringify(oldRecord);

            // 2. Perform the update to change status and set posted_date
            const sql = `UPDATE Purchase_Records SET status = 'posted', posted_date = CURRENT_DATE WHERE purchase_id = ?`;
            db.run(sql, [id], function(updateErr) {
              if (updateErr) return reject(updateErr);
              
              if (this.changes > 0) {
                  updatedCount++;
              } else {
                 // No changes were made, so no need to log.
                 return resolve();
              }

              // 3. Fetch the record *after* updating to get new_data
              db.get(`SELECT * FROM Purchase_Records WHERE purchase_id = ?`, [id], (fetchErr, newRecord) => {
                if (fetchErr) return reject(fetchErr);

                // 4. Insert the change into Activity_Logs
                const log_id = uuidv4();
                const newRecordData = JSON.stringify(newRecord);
                const logSql = `
                  INSERT INTO Activity_Logs 
                    (log_id, action_type, table_name, record_id, old_data, new_data) 
                  VALUES (?, 'UPDATE', 'Purchase_Records', ?, ?, ?)
                `;
                db.run(logSql, [log_id, id, oldRecordData, newRecordData], (logErr) => {
                  if (logErr) return reject(logErr);
                  resolve(); // Successfully updated and logged this ID
                });
              });
            });
          });
        });
      });

      // Execute all promises
      Promise.all(promises)
        .then(() => {
          // If all promises succeed, commit the transaction
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              res.status(500).json({ error: 'Failed to commit transaction: ' + commitErr.message });
            } else {
              res.json({
                message: `Changed ${updatedCount} purchase record(s) to posted and logged changes.`,
                updatedCount: updatedCount
              });
            }
          });
        })
        .catch(error => {
          // If any promise fails, roll back the entire transaction
          db.run('ROLLBACK', (rollbackErr) => {
             if (rollbackErr) console.error('Rollback failed:', rollbackErr.message);
             res.status(500).json({ error: 'An error occurred, transaction rolled back: ' + error.message });
          });
        });
    });
  });
  // *** MODIFICATION END ***
  // server.js

app.get('/reports/summary', (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required.' });
    }

    // --- MODIFIED SQL QUERY ---
    // This query now joins the Subcategories table, groups by subcategory name,
    // and uses COALESCE to handle items that don't have a subcategory.
    const sql = `
        SELECT
            pr.posted_date AS purchase_date, -- Alias posted_date as purchase_date for frontend compatibility
            COALESCE(s.subcategory_name, 'Other') AS item_name, -- Alias subcategory as item_name for the frontend
            SUM(pr.total_amount - COALESCE(pr.vat_amount, 0)) AS base_total,
            SUM(COALESCE(pr.vat_amount, 0)) AS total_vat
        FROM Purchase_Records pr
        JOIN Items i ON pr.item_id = i.item_id
        LEFT JOIN Subcategories s ON i.subcategory_id = s.subcategory_id -- Use LEFT JOIN to include items without a subcategory
        WHERE DATE(pr.posted_date) BETWEEN ? AND ?
        GROUP BY pr.posted_date, COALESCE(s.subcategory_name, 'Other') -- Group by the subcategory name
        ORDER BY pr.posted_date, item_name;
    `;

    db.all(sql, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error('Error fetching Summary report:', err.message);
            res.status(500).json({ error: 'Failed to fetch Summary report.' });
        } else {
            res.json(rows);
        }
    });
});
  // --- Gregorian ↔ Ethiopian Calendar Converter ---
  const JDN_OFFSET_ETHIOPIC = 1723856;

  function gregorianToJDN(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  function jdnToEthiopic(jdn) {
    const r = (jdn - JDN_OFFSET_ETHIOPIC) % 1461;
    const n = (r % 365) + 365 * Math.floor(r / 1460);
    const year = 4 * Math.floor((jdn - JDN_OFFSET_ETHIOPIC) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
    const month = Math.floor(n / 30) + 1;
    const day = (n % 30) + 1;
    return { year, month, day };
  }
  
  function gregorianToEthiopic(y, m, d) {
    const jdn = gregorianToJDN(y, m, d);
    return jdnToEthiopic(jdn);
  }
  app.get('/export/jv-pdf', async (req, res) => {
    const { singledate } = req.query;
    if (!singledate) {
        return res.status(400).json({ error: "A date must be selected." });
    }

    let browser;
    try {
        // Fetch data just like the original JV report endpoint
        const detailsSql = `
            SELECT i.item_name, (p.total_amount - COALESCE(p.vat_amount, 0)) AS base_total
            FROM Purchase_Records p JOIN Items i ON p.item_id = i.item_id WHERE DATE(p.posted_date) = ?;
        `;
        const totalsSql = `
            SELECT SUM(COALESCE(p.vat_amount, 0)) AS total_vat, SUM(p.total_amount) AS grand_total
            FROM Purchase_Records p WHERE DATE(p.posted_date) = ?;
        `;

        const details = await new Promise((resolve, reject) => db.all(detailsSql, [singledate], (err, rows) => err ? reject(err) : resolve(rows)));
        const totals = await new Promise((resolve, reject) => db.get(totalsSql, [singledate], (err, row) => err ? reject(err) : resolve(row)));

        // --- REPLICATE UI LOGIC FOR PDF ---
        const totalVatSum = totals.total_vat || 0;
        const cashTotalSum = totals.grand_total || 0;
        const totalVatBirr = Math.floor(totalVatSum);
        const totalVatCents = Math.round((totalVatSum - totalVatBirr) * 100);
        const cashTotalBirr = Math.floor(cashTotalSum);
        const cashTotalCents = Math.round((cashTotalSum - cashTotalBirr) * 100);

        // Generate HTML content for the PDF, mirroring the UI
        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>JV Report</title>
                <style>${reportCssContent}</style> <!-- Inject CSS content directly -->
            </head>
            <body>
                <h1 class="report-header">Lambadina</h1>
                <h2 class="report-title">Journal Voucher Report for ${singledate}</h2>
                <table class="table jv-report-table">
                    <thead>
                        <tr>
                            <th rowspan="2">Items</th>
                            <th colspan="2" class="is-numeric">Debt</th>
                            <th colspan="2" class="is-numeric">Credit</th>
                        </tr>
                        <tr>
                            <th class="is-numeric">Birr</th>
                            <th class="is-numeric">Cents</th>
                            <th class="is-numeric">Birr</th>
                            <th class="is-numeric">Cents</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details.map(record => {
                            const baseTotal = record.base_total || 0;
                            const birr = Math.floor(baseTotal);
                            const cents = Math.round((baseTotal - birr) * 100);
                            return `
                                <tr>
                                    <td>${record.item_name}</td>
                                    <td class="is-numeric">${birr}</td>
                                    <td class="is-numeric">${cents}</td>
                                    <td class="is-numeric"></td>
                                    <td class="is-numeric"></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td><strong>Total VAT</strong></td>
                            <td class="is-numeric"><strong>${totalVatBirr}</strong></td>
                            <td class="is-numeric"><strong>${totalVatCents}</strong></td>
                            <td class="is-numeric"></td>
                            <td class="is-numeric"></td>
                        </tr>
                        <tr>
                            <td><strong>Cash</strong></td>
                            <td class="is-numeric"></td>
                            <td class="is-numeric"></td>
                            <td class="is-numeric"><strong>${cashTotalBirr}</strong></td>
                            <td class="is-numeric"><strong>${cashTotalCents}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

        // Use Puppeteer to generate PDF
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(content, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="JV_Report_${singledate}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Failed to generate JV PDF:', error);
        res.status(500).send('Error generating PDF file.');
    } finally {
        if (browser) await browser.close();
    }
});
// *** NEW ENDPOINT: Summary Report to PDF (Server-Side) ***
// server.js

// *** NEW ENDPOINT: Summary Report to PDF (Server-Side) ***
app.get('/export/summary-pdf', async (req, res) => {
    const { startDate, endDate, etYear, etMonth } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required.' });
    }

    const getEthiopianMonthName = (monthNumber) => {
        const monthNames = [
            "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
            "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
        ];
        return monthNames[monthNumber - 1] || '';
    };

    const reportTitle = etYear && etMonth
        ? `Summary Report for ${getEthiopianMonthName(etMonth)} ${etYear}`
        : `Summary Report (${startDate} to ${endDate})`;


    let browser;
    try {
        // --- MODIFIED SQL QUERY ---
        // Apply the same change here for consistency in the PDF.
        const sql = `
            SELECT
                pr.posted_date AS purchase_date, -- Alias posted_date as purchase_date for frontend compatibility
                COALESCE(s.subcategory_name, 'Other') AS item_name, -- Alias subcategory as item_name
                SUM(pr.total_amount - COALESCE(pr.vat_amount, 0)) AS base_total,
                SUM(COALESCE(pr.vat_amount, 0)) AS total_vat
            FROM Purchase_Records pr
            JOIN Items i ON pr.item_id = i.item_id
            LEFT JOIN Subcategories s ON i.subcategory_id = s.subcategory_id
            WHERE DATE(pr.posted_date) BETWEEN ? AND ?
            GROUP BY pr.posted_date, COALESCE(s.subcategory_name, 'Other')
            ORDER BY pr.posted_date, item_name;
        `;
        const reportData = await new Promise((resolve, reject) => db.all(sql, [startDate, endDate], (err, rows) => err ? reject(err) : resolve(rows)));

        // ... THE REST OF THE PDF GENERATION CODE REMAINS EXACTLY THE SAME ...
        // It will automatically work because of the 'item_name' alias.
        
        if (reportData.length === 0) return res.status(404).send('No data found for the selected range.');

        const allUniqueItems = [...new Set(reportData.map(record => record.item_name))].sort();
        const groupedByDate = reportData.reduce((acc, record) => {
            const date = record.purchase_date;
            if (!acc[date]) {
                acc[date] = { items: {}, dailyTotalVat: 0 };
            }
            acc[date].items[record.item_name] = (acc[date].items[record.item_name] || 0) + record.base_total;
            acc[date].dailyTotalVat += record.total_vat;
            return acc;
        }, {});

        const columnTotals = { totalVat: 0 };
        allUniqueItems.forEach(item => columnTotals[item] = 0);
        reportData.forEach(record => {
            columnTotals[record.item_name] += record.base_total;
            columnTotals.totalVat += record.total_vat;
        });

        const allDatesInMonth = [];
        let currentDate = new Date(startDate + 'T00:00:00');
        const lastDate = new Date(endDate + 'T00:00:00');
        const formatDate = (date) => date.toISOString().split('T')[0];
        while (currentDate <= lastDate) {
            allDatesInMonth.push(formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const fixedColumns = ['Date'];
        const totalVatColumn = 'Total VAT';
        const allDataColumns = [...allUniqueItems, totalVatColumn];
        const maxColumnsPerPage = 6;
        const maxDataColumnsPerPage = maxColumnsPerPage - fixedColumns.length;

        let allContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Summary Report</title>
                <style>${reportCssContent}</style> <!-- Inject CSS content directly -->
            </head>
            <body>
                <h1 class="report-header">Lambadina</h1>
                <h2 class="report-subtitle">${reportTitle}</h2>
        `;

        for (let i = 0; i < allDataColumns.length; i += maxDataColumnsPerPage) {
            const currentChunkColumns = allDataColumns.slice(i, i + maxDataColumnsPerPage);
            const isLastPage = (i + maxDataColumnsPerPage) >= allDataColumns.length;

            let tableHeaders = `<th>${fixedColumns[0]}</th>` + currentChunkColumns.map(colName => `<th class="${colName === totalVatColumn ? 'is-numeric' : ''}">${colName}</th>`).join('');

            let tableBodyRows = '';
            allDatesInMonth.forEach(date => {
                const dateData = groupedByDate[date];
                let rowHtml = `<td>${new Date(date + 'T00:00:00').toLocaleDateString()}</td>`;
                currentChunkColumns.forEach(colName => {
                    if (colName === totalVatColumn) {
                        const dailyVat = dateData ? (dateData.dailyTotalVat || 0) : 0;
                        rowHtml += `<td class="is-numeric">${dailyVat > 0 ? dailyVat.toFixed(2) : '-'}</td>`;
                    } else {
                        const baseTotal = dateData ? (dateData.items[colName] || 0) : 0;
                        rowHtml += `<td class="is-numeric">${baseTotal > 0 ? baseTotal.toFixed(2) : '-'}</td>`;
                    }
                });
                tableBodyRows += `<tr>${rowHtml}</tr>`;
            });

            allContent += `
                <table class="table summary-report-table ${!isLastPage ? 'page-break' : ''}">
                    <thead><tr>${tableHeaders}</tr></thead>
                    <tbody>${tableBodyRows}</tbody>
                </table>
            `;
        }

        // Now, generate the single grand total footer table
        let grandTotalFooterHtml = `<td><strong>Grand Total</strong></td>`;
        allDataColumns.forEach(colName => { // Iterate over ALL columns for the grand total
            if (colName === totalVatColumn) {
                const grandTotalVat = columnTotals.totalVat || 0;
                grandTotalFooterHtml += `<td class="is-numeric"><strong>${grandTotalVat > 0 ? grandTotalVat.toFixed(2) : '-'}</strong></td>`;
            } else {
                const total = columnTotals[colName] || 0;
                grandTotalFooterHtml += `<td class="is-numeric"><strong>${total > 0 ? total.toFixed(2) : '-'}</strong></td>`;
            }
        });

        allContent += `
            <table class="table summary-report-table grand-total-table">
                <tfoot>
                    <tr>${grandTotalFooterHtml}</tr>
                </tfoot>
            </table>
        `;

        allContent += `</body></html>`;

        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(allContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Summary_Report.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Failed to generate Summary PDF:', error);
        res.status(500).send('Error generating PDF file.');
    } finally {
        if (browser) await browser.close();
    }
});

  // *** NEW ENDPOINT: Gregorian to Ethiopian Date Conversion ***
  app.get('/convert-to-ethiopian', (req, res) => {
      const { date } = req.query;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ error: 'A valid date query parameter (YYYY-MM-DD) is required.' });
      }

      try {
          const [year, month, day] = date.split('-').map(Number);
          const ethiopianDate = gregorianToEthiopic(year, month, day);
          res.json(ethiopianDate);
      } catch (error) {
          res.status(500).json({ error: 'An error occurred during date conversion.', details: error.message });
      }
  });

  // *** NEW ENDPOINT: Get Gregorian Range for Ethiopian Month ***
  app.get('/get-gregorian-range', (req, res) => {
      const etYear = parseInt(req.query.year, 10);
      const etMonth = parseInt(req.query.month, 10);
      
      if (!etYear || !etMonth || isNaN(etYear) || isNaN(etMonth)) {
          return res.status(400).json({ error: 'Valid "year" and "month" query parameters are required.' });
      }

      try {
          // The Gregorian year in which the Ethiopian year begins
          const gregYear = etYear + 7;
          
          // Determine the Gregorian date for Meskerem 1 (Ethiopian New Year)
          // It's on Sep 12 in the Gregorian year *preceding* a leap year
          const newYearDay = new Date(gregYear, 8, 11);
          if ((gregYear + 1) % 4 === 0 && (gregYear + 1) % 100 !== 0 || (gregYear + 1) % 400 === 0) {
              newYearDay.setDate(12);
          }

          // Calculate the start date by adding the month offset
          const startOffset = (etMonth - 1) * 30;
          const startDate = new Date(newYearDay.getTime());
          startDate.setDate(newYearDay.getDate() + startOffset);
          
          // Determine the number of days in the Ethiopian month
          let daysInMonth = 30;
          if (etMonth === 13) {
              const isEthLeap = (etYear + 1) % 4 === 0;
              daysInMonth = isEthLeap ? 6 : 5;
          }
          
          // Calculate the end date
          const endDate = new Date(startDate.getTime());
          endDate.setDate(startDate.getDate() + daysInMonth - 1);

          // Helper to format dates as YYYY-MM-DD
          const formatDate = (d) => d.toISOString().split('T')[0];
          
          res.json({
              startDate: formatDate(startDate),
              endDate: formatDate(endDate)
          });
      } catch (error) {
          res.status(500).json({ error: 'An error occurred while calculating the date range.', details: error.message });
      }
  });

  // *** NEW ENDPOINT: Get Gregorian Year Range for Ethiopian Year ***
  app.get('/get-gregorian-year-range', (req, res) => {
      const etYear = parseInt(req.query.year, 10);
      
      if (!etYear || isNaN(etYear)) {
          return res.status(400).json({ error: 'Valid "year" query parameter is required.' });
      }

      try {
          // The Gregorian year in which the Ethiopian year begins
          const gregYear = etYear + 7;
          
          // Determine the Gregorian date for Meskerem 1 (Ethiopian New Year)
          const newYearDay = new Date(gregYear, 8, 11);
          if ((gregYear + 1) % 4 === 0 && (gregYear + 1) % 100 !== 0 || (gregYear + 1) % 400 === 0) {
              newYearDay.setDate(12);
          }

          // Start date is Meskerem 1
          const startDate = new Date(newYearDay.getTime());
          
          // End date is Pagume last day (13th month last day of Ethiopian year)
          // Calculate date for Pagume 1 (after 12 months * 30 days = 360 days)
          const pagume1Date = new Date(newYearDay.getTime());
          pagume1Date.setDate(newYearDay.getDate() + 360);
          
          // Determine number of days in Pagume (13th month)
          const isEthLeap = (etYear + 1) % 4 === 0;
          const daysInPagume = isEthLeap ? 6 : 5;
          
          // End date is the last day of Pagume
          const endDate = new Date(pagume1Date.getTime());
          endDate.setDate(pagume1Date.getDate() + daysInPagume - 1);

          // Helper to format dates as YYYY-MM-DD
          const formatDate = (d) => d.toISOString().split('T')[0];
          
          res.json({
              startDate: formatDate(startDate),
              endDate: formatDate(endDate)
          });
      } catch (error) {
          res.status(500).json({ error: 'An error occurred while calculating the year range.', details: error.message });
      }
  });




  return app;
};
