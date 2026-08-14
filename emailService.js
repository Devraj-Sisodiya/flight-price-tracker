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
 * Builds the responsive HTML email template for flight price drop notifications.
 * Note: Email clients (Gmail, Outlook, Apple Mail) require inline styles 
 * because they block external CSS files (<link rel="stylesheet">) for security.
 */
function generateEmailTemplate({ origin, destination, departureDate, targetPrice, currentPrice }) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #003580; margin-top: 0; font-size: 20px;">Good News! Flight Price Alert Triggered</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">The price for your tracked flight route has dropped below your target price.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="background-color: #f8fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Route</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${origin} ➔ ${destination}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Departure Date</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: #0f172a;">${departureDate}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Your Target Price</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: #d97706; font-weight: bold;">₹${targetPrice}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Current Lowest Price</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: #16a34a; font-size: 18px; font-weight: bold;">₹${currentPrice}</td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        Book now to lock in this price. Your price tracking alert for this request has now been fulfilled and marked as inactive.
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
    from: `"Expedia Flight Alert" <${process.env.EMAIL_USER || 'alerts@expedia-tracker.com'}>`,
    to: toEmail,
    subject: `✈️ Price Drop Alert: ${origin} to ${destination} is now ₹${currentPrice}!`,
    html: generateEmailTemplate(flightData)
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EmailService Mock] Simulated alert email sent to ${toEmail} for ${origin} -> ${destination} (Current: ₹${currentPrice})`);
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
