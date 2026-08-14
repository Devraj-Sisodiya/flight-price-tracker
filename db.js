const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolve the path to the database file in the project root
const dbPath = path.resolve(__dirname, 'tracker.db');

// Connect to SQLite database (creates tracker.db if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Initialize database schema synchronously using serialize
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS TrackingRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      target_price REAL NOT NULL,
      user_email TEXT NOT NULL,
      last_checked_price REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create TrackingRequests table:', err.message);
    } else {
      console.log('TrackingRequests table is ready.');
    }
  });
});

module.exports = db;
