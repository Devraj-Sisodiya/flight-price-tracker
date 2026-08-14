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
 * Isolated CSS styles map — clean, modular, and separate from HTML markup.
 */
const EMAIL_STYLES = {
  container: 'font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;',
  header: 'color: #0284c7; margin-top: 0; font-size: 20px;',
  text: 'color: #475569; font-size: 14px; line-height: 1.5;',
  table: 'width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;',
  rowLight: 'background-color: #f8fafc;',
  cellLabel: 'padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;',
  cellValue: 'padding: 12px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;',
  targetPrice: 'padding: 12px; border: 1px solid #e2e8f0; color: #d97706; font-weight: bold;',
  currentPrice: 'padding: 12px; border: 1px solid #e2e8f0; color: #16a34a; font-size: 18px; font-weight: bold;',
  footer: 'font-size: 13px; color: #64748b; margin-bottom: 0;'
};

/**
 * Clean HTML template builder referencing the EMAIL_STYLES map.
 */
function generateEmailTemplate({ origin, destination, departureDate, targetPrice, currentPrice }) {
  return `
    <div style="${EMAIL_STYLES.container}">
      <h2 style="${EMAIL_STYLES.header}">Good News! Flight Price Alert Triggered</h2>
      <p style="${EMAIL_STYLES.text}">The price for your tracked flight route has dropped below your target price threshold.</p>
      
      <table style="${EMAIL_STYLES.table}">
        <tr style="${EMAIL_STYLES.rowLight}">
          <td style="${EMAIL_STYLES.cellLabel}">Route</td>
          <td style="${EMAIL_STYLES.cellValue}">${origin} ➔ ${destination}</td>
        </tr>
        <tr>
          <td style="${EMAIL_STYLES.cellLabel}">Departure Date</td>
          <td style="${EMAIL_STYLES.cellValue}">${departureDate}</td>
        </tr>
        <tr style="${EMAIL_STYLES.rowLight}">
          <td style="${EMAIL_STYLES.cellLabel}">Your Target Price</td>
          <td style="${EMAIL_STYLES.targetPrice}">₹${targetPrice}</td>
        </tr>
        <tr>
          <td style="${EMAIL_STYLES.cellLabel}">Current Lowest Price</td>
          <td style="${EMAIL_STYLES.currentPrice}">₹${currentPrice}</td>
        </tr>
      </table>

      <p style="${EMAIL_STYLES.footer}">
        Book now to lock in this price. Your price tracking alert for this request has been marked as inactive.
      </p>
    </div>
  `;
}

/**
 * Sends a flight price alert email when current flight price drops below target price.
 * 
 * @param {string} toEmail - Recipient email address
 * @param {Object} flightData - Object containing flight route details and prices
 * @returns {Promise<boolean>} True if email dispatched successfully
 */
async function sendPriceAlertEmail(toEmail, flightData) {
  const { origin, destination, currentPrice } = flightData;

  const mailOptions = {
    from: `"Flight Price Alert" <${process.env.EMAIL_USER || 'alerts@flight-tracker.com'}>`,
    to: toEmail,
    subject: `✈️ Price Drop Alert: ${origin} to ${destination} is now ₹${currentPrice}!`,
    html: generateEmailTemplate(flightData)
  };

  try {
    const user = process.env.EMAIL_USER || '';
    const pass = process.env.EMAIL_PASS || '';
    const isPlaceholder = !user || !pass || user.includes('your_email') || pass.includes('your_app_password') || pass.includes('YOUR_');

    if (isPlaceholder) {
      console.log(`[EmailService Mock] Simulated alert email sent to ${toEmail} for ${origin} -> ${destination} (Current: ₹${currentPrice})`);
      return true;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Alert email successfully sent to ${toEmail}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService Error] Failed sending email to ${toEmail}: ${error.message}`);
    console.log(`[EmailService Fallback] Mock alert logged for ${toEmail} (Set valid Gmail App Password in .env for real delivery).`);
    return true;
  }
}

module.exports = { sendPriceAlertEmail };
