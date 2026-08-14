require('dotenv').config();
const cron = require('node-cron');
const db = require('./db');
const { getFlightPrice } = require('./amadeusService');
const { sendPriceAlertEmail } = require('./emailService');

/**
 * Queries SQLite for all active tracking requests, fetches current flight prices,
 * updates SQLite records, and dispatches email alerts when current price <= target price.
 */
async function checkFlightPrices() {
  const timestamp = new Date().toISOString();
  console.log(`\n[Worker Cron ${timestamp}] Running periodic flight price scan...`);

  db.all('SELECT * FROM TrackingRequests WHERE is_active = 1', async (err, rows) => {
    if (err) {
      console.error('[Worker DB Error] Failed fetching active tracking requests:', err.message);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('[Worker] No active tracking requests found in database.');
      return;
    }

    console.log(`[Worker] Found ${rows.length} active tracking request(s) to process.`);

    for (const req of rows) {
      const { id, origin, destination, departure_date, target_price, user_email } = req;

      try {
        console.log(`[Worker] Checking Request #${id}: ${origin} -> ${destination} on ${departure_date} (Target: ₹${target_price})`);

        // Fetch current price from external API / mock fallback
        const currentPrice = await getFlightPrice(origin, destination, departure_date);

        // Alert condition evaluation
        if (currentPrice <= target_price) {
          console.log(`🎉 [ALERT TRIGGERED] Request #${id}: Current price ₹${currentPrice} <= Target ₹${target_price}!`);

          const emailSent = await sendPriceAlertEmail(user_email, {
            origin,
            destination,
            departureDate: departure_date,
            targetPrice: target_price,
            currentPrice: currentPrice
          });

          if (emailSent) {
            // Atomically record price & deactivate request to avoid duplicate alerts and UI race conditions
            db.run(
              'UPDATE TrackingRequests SET last_checked_price = ?, is_active = 0 WHERE id = ?',
              [currentPrice, id],
              (deactivateErr) => {
                if (deactivateErr) {
                  console.error(`[Worker DB Error] Deactivation failed for Request #${id}:`, deactivateErr.message);
                } else {
                  console.log(`[Worker DB] Request #${id} fulfilled & marked inactive (is_active = 0).`);
                }
              }
            );
          }
        } else {
          // Record latest checked price in SQLite when target not met
          db.run(
            'UPDATE TrackingRequests SET last_checked_price = ? WHERE id = ?',
            [currentPrice, id],
            (updateErr) => {
              if (updateErr) {
                console.error(`[Worker DB Error] Failed updating price for Request #${id}:`, updateErr.message);
              }
            }
          );
          console.log(`[Worker] Request #${id}: Current price ₹${currentPrice} > Target ₹${target_price}. Monitoring continues.`);
        }
      } catch (reqErr) {
        console.error(`[Worker Error] Failed processing tracking request #${id}:`, reqErr.message);
      }
    }
  });
}

// Cron schedule expression: runs every 30 seconds by default for testing/demo
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * * *';

console.log(`[Worker Daemon] Flight Price Alert Worker started. Schedule: "${CRON_SCHEDULE}"`);

cron.schedule(CRON_SCHEDULE, () => {
  checkFlightPrices();
});

// Trigger immediate check on worker start
checkFlightPrices();

module.exports = { checkFlightPrices };
