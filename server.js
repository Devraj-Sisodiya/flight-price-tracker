require('dotenv').config();
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Express JSON middleware to parse incoming body requests
app.use(express.json());

/**
 * POST /api/track
 * Registers a new flight price alert request in SQLite database.
 * 
 * Body parameters:
 *  - origin (string, e.g. "DEL")
 *  - destination (string, e.g. "BOM")
 *  - date (string, YYYY-MM-DD, e.g. "2026-09-01")
 *  - targetPrice (number, e.g. 5000)
 *  - email (string, e.g. "user@example.com")
 */
app.post('/api/track', (req, res) => {
  const { origin, destination, date, targetPrice, email } = req.body;

  // Strict payload validation
  if (!origin || !destination || !date || !targetPrice || !email) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required parameters. Required: origin, destination, date, targetPrice, email'
    });
  }

  const cleanOrigin = origin.trim().toUpperCase();
  const cleanDestination = destination.trim().toUpperCase();
  const parsedPrice = parseFloat(targetPrice);

  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'targetPrice must be a valid positive number.'
    });
  }

  const sql = `
    INSERT INTO TrackingRequests (origin, destination, departure_date, target_price, user_email, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `;

  db.run(sql, [cleanOrigin, cleanDestination, date, parsedPrice, email.trim()], function (err) {
    if (err) {
      console.error('[Server DB Error] Failed saving tracking request:', err.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Database insertion error.'
      });
    }

    console.log(`[Server API] Tracking request created with ID #${this.lastID} for ${cleanOrigin} ➔ ${cleanDestination}`);

    return res.status(201).json({
      message: 'Flight price alert registered successfully!',
      data: {
        id: this.lastID,
        origin: cleanOrigin,
        destination: cleanDestination,
        departure_date: date,
        target_price: parsedPrice,
        user_email: email.trim(),
        is_active: 1
      }
    });
  });
});

/**
 * GET /api/track
 * Helper endpoint to retrieve all tracking requests from database.
 */
app.get('/api/track', (req, res) => {
  db.all('SELECT * FROM TrackingRequests ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('[Server DB Error] Query failed:', err.message);
      return res.status(500).json({ error: 'Database query failure.' });
    }
    return res.json({
      count: rows.length,
      trackingRequests: rows
    });
  });
});

// Start API Web Server
app.listen(PORT, () => {
  console.log(`🚀 [Server] Flight Price Alert Microservice running on http://localhost:${PORT}`);
  console.log(`📌 POST http://localhost:${PORT}/api/track`);
  console.log(`📌 GET  http://localhost:${PORT}/api/track`);
});
