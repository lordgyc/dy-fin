const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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

  app.get('/vendors', (req, res) => {
      db.all('SELECT * FROM Vendors', (err, rows) => {
          if (err) {
              res.status(500).json({ error: err.message });
          } else {
              res.json(rows);
          }
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
      try {
          // 1. Fetch unsynced logs
          const unsyncedLogs = await new Promise((resolve, reject) => {
              db.all(`SELECT * FROM Activity_Logs WHERE synced_to_bot = 0`, [], (err, rows) => {
                  if (err) reject(err);
                  else resolve(rows);
              });
          });

          if (unsyncedLogs.length > 0) {
              const success = await sendLogToTelegram(unsyncedLogs);
              if (success) {
                  // 2. Mark logs as synced if successfully sent
                  const logIdsToMarkSynced = unsyncedLogs.map(log => log.log_id);
                  await new Promise((resolve, reject) => {
                      // Use IN clause to update multiple logs at once
                      db.run(`UPDATE Activity_Logs SET synced_to_bot = 1 WHERE log_id IN (${logIdsToMarkSynced.map(() => '?').join(',')})`, logIdsToMarkSynced, (err) => {
                          if (err) reject(err);
                          else resolve();
                      });
                  });
                  res.json({ message: `Synced ${logIdsToMarkSynced.length} logs with Telegram.`, sentCount: logIdsToMarkSynced.length });
              } else {
                  res.status(500).json({ error: 'Failed to send some logs to Telegram.' });
              }
          } else {
              res.json({ message: 'No unsynced logs to send.', sentCount: 0 });
          }

          // 3. Fetch new logs from Telegram (placeholder for now)
          // const newLogs = await fetchLogsFromTelegram(); 
          // TODO: Implement logic to apply newLogs to local DB with conflict resolution

      } catch (error) {
          console.error('Error during log sync:', error);
          res.status(500).json({ error: 'Failed to sync logs.', details: error.message });
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

  return app;
};
