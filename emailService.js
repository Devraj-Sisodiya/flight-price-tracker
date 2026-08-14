require('dotenv').config();
const nodemailer = require('nodemailer');

// Configure SMTP Transporter using Gmail service or custom SMTP settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends a flight price alert email when current flight price drops below target price.
 * 
 * @param {string} toEmail - Recipient email address
 * @param {Object} flightData - Object containing flight route details and prices
 * @param {string} flightData.origin - Departure airport IATA code
 * @param {string} flightData.destination - Arrival airport IATA code
 * @param {string} flightData.departureDate - Departure date (YYYY-MM-DD)
 * @param {number} flightData.targetPrice - Target price threshold set by user
 * @param {number} flightData.currentPrice - Current lowest price detected
 * @returns {Promise<boolean>} True if email dispatched successfully
 */
async function sendPriceAlertEmail(toEmail, flightData) {
  const { origin, destination, departureDate, targetPrice, currentPrice } = flightData;

  const mailOptions = {
    from: `"Expedia Flight Alert" <${process.env.EMAIL_USER || 'alerts@expedia-tracker.com'}>`,
    to: toEmail,
    subject: `✈️ Price Drop Alert: ${origin} to ${destination} is now ₹${currentPrice}!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #003580;">Good News! Flight Price Alert Triggered</h2>
        <p>The price for your tracked flight route has dropped below your target price.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Route</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${origin} ➔ ${destination}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Departure Date</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${departureDate}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Your Target Price</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #e67e22; font-weight: bold;">₹${targetPrice}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Current Lowest Price</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #27ae60; font-size: 1.2em; font-weight: bold;">₹${currentPrice}</td>
          </tr>
        </table>

        <p style="font-size: 0.9em; color: #666;">
          Book now to lock in this price. Your price tracking alert for this request has now been fulfilled and marked as inactive.
        </p>
      </div>
    `
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EmailService Mock] Simulated alert email sent to ${toEmail} for ${origin} -> ${destination} (Current: ₹${currentPrice}, Target: ₹${targetPrice})`);
      return true;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Alert email successfully sent to ${toEmail}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed sending email to ${toEmail}: ${error.message}`);
    return false;
  }
}

module.exports = { sendPriceAlertEmail };
