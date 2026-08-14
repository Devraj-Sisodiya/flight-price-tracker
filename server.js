require('dotenv').config();
const express = require('express');
const db = require('./db');
// Import worker so server and background worker run seamlessly together in 1 process!
require('./worker');

const app = express();
const PORT = process.env.PORT || 3000;

// Express middleware for JSON & Form URL encoding
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * GET /
 * Renders an interactive web interface in Chrome for 1-click testing!
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flight Price Alert Microservice</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
        .container { max-width: 800px; width: 100%; background: #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-top: 0; display: flex; align-items: center; gap: 10px; }
        p { color: #94a3b8; }
        form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; background: #0f172a; padding: 20px; border-radius: 8px; }
        .full-width { grid-column: span 2; }
        label { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; font-weight: 600; margin-bottom: 6px; display: block; }
        input { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 1rem; outline: none; }
        input:focus { border-color: #38bdf8; }
        button { background: #0284c7; color: white; border: none; padding: 14px; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #0369a1; }
        #message { margin-top: 20px; padding: 14px; border-radius: 6px; display: none; font-weight: 500; }
        .success { background: #064e3b; color: #34d399; border: 1px solid #059669; }
        .error { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: #0f172a; color: #38bdf8; font-size: 0.85rem; text-transform: uppercase; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
        .badge-active { background: #1e3a8a; color: #93c5fd; }
        .badge-inactive { background: #14532d; color: #86efac; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✈️ Flight Price Alert Microservice</h1>
        <p>Submit a flight route to start automated background price monitoring with instant email alerts.</p>
        
        <form id="trackForm">
          <div>
            <label>Origin (IATA)</label>
            <input type="text" id="origin" value="DEL" placeholder="e.g. DEL" required>
          </div>
          <div>
            <label>Destination (IATA)</label>
            <input type="text" id="destination" value="BOM" placeholder="e.g. BOM" required>
          </div>
          <div>
            <label>Departure Date</label>
            <input type="date" id="date" value="2026-09-01" required>
          </div>
          <div>
            <label>Target Price (₹)</label>
            <input type="number" id="targetPrice" value="9000" placeholder="e.g. 5000" required>
          </div>
          <div class="full-width">
            <label>Your Email Address</label>
            <input type="email" id="email" placeholder="e.g. your_email@gmail.com" required>
          </div>
          <div class="full-width">
            <button type="submit">Submit Flight Price Alert</button>
          </div>
        </form>

        <div id="message"></div>

        <h2>Active Tracking Requests</h2>
        <table id="requestsTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Route</th>
              <th>Date</th>
              <th>Target</th>
              <th>Last Checked</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr><td colspan="6" style="text-align:center; color:#64748b;">Loading requests...</td></tr>
          </tbody>
        </table>
      </div>

      <script>
        const form = document.getElementById('trackForm');
        const messageDiv = document.getElementById('message');

        async function fetchRequests() {
          try {
            const res = await fetch('/api/track');
            const data = await res.json();
            const tbody = document.getElementById('tableBody');
            
            if (!data.trackingRequests || data.trackingRequests.length === 0) {
              tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No tracking requests found. Submit one above!</td></tr>';
              return;
            }

            tbody.innerHTML = data.trackingRequests.map(r => \`
              <tr>
                <td>#\${r.id}</td>
                <td><strong>\${r.origin} ➔ \${r.destination}</strong></td>
                <td>\${r.departure_date}</td>
                <td style="color:#f59e0b; font-weight:bold;">₹\${r.target_price}</td>
                <td>\${r.last_checked_price ? '₹' + r.last_checked_price : 'Pending...'}</td>
                <td>
                  <span class="badge \${r.is_active ? 'badge-active' : 'badge-inactive'}">
                    \${r.is_active ? '🟢 Monitoring' : '🎉 Alert Sent'}
                  </span>
                </td>
              </tr>
            \`).join('');
          } catch (e) {
            console.error('Failed fetching requests:', e);
          }
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          messageDiv.style.display = 'none';

          const payload = {
            origin: document.getElementById('origin').value,
            destination: document.getElementById('destination').value,
            date: document.getElementById('date').value,
            targetPrice: document.getElementById('targetPrice').value,
            email: document.getElementById('email').value
          };

          try {
            const res = await fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (res.ok) {
              messageDiv.className = 'success';
              messageDiv.textContent = '✅ ' + result.message;
              messageDiv.style.display = 'block';
              fetchRequests();
            } else {
              messageDiv.className = 'error';
              messageDiv.textContent = '❌ ' + (result.message || 'Error creating request');
              messageDiv.style.display = 'block';
            }
          } catch (err) {
            messageDiv.className = 'error';
            messageDiv.textContent = '❌ Failed to connect to API server.';
            messageDiv.style.display = 'block';
          }
        });

        fetchRequests();
        setInterval(fetchRequests, 5000); // Auto refresh table every 5s
      </script>
    </body>
    </html>
  `);
});

/**
 * POST /api/track
 */
app.post('/api/track', (req, res) => {
  const { origin, destination, date, targetPrice, email } = req.body;

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
  console.log(`📌 Open Chrome tab: http://localhost:${PORT}`);
});
