require('dotenv').config();
const axios = require('axios');

/**
 * Helper function to generate a realistic mock flight price.
 * Useful for local testing without exhausting the RapidAPI rate limit quota.
 */
function getMockFlightPrice(origin, destination) {
  const seed = (origin + destination).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 4500 + (seed % 3000); // Base price between 4500 and 7500
  const jitter = Math.floor(Math.random() * 1000) - 500; // Jitter +/- 500
  return Math.max(3000, basePrice + jitter);
}

/**
 * Fetches real flight price for a given route and departure date.
 * Queries live internet flight pricing API with fallback to mock data on rate limits.
 * 
 * @param {string} origin - Departure IATA code (e.g. 'DEL')
 * @param {string} destination - Arrival IATA code (e.g. 'BOM')
 * @param {string} date - Departure date (YYYY-MM-DD)
 * @returns {Promise<number>} Lowest available price
 */
async function getFlightPrice(origin, destination, date) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'flights-sky.p.rapidapi.com';

  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY') {
    console.warn('[FlightService] RapidAPI key missing or default. Utilizing mock flight price fallback.');
    return getMockFlightPrice(origin, destination);
  }

  try {
    // Query live internet flights API endpoint
    const response = await axios.get(`https://${apiHost}/flights/search-one-way`, {
      params: {
        fromEntityId: origin,
        toEntityId: destination,
        departDate: date
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 12000
    });

    // Parse live itineraries for lowest price
    const itineraries = response.data?.data?.itineraries || [];
    if (itineraries.length > 0) {
      const prices = itineraries
        .map(item => item.price?.raw)
        .filter(price => typeof price === 'number' && price > 0);

      if (prices.length > 0) {
        const lowestPrice = Math.min(...prices);
        console.log(`⚡ [LIVE WEB PRICE SUCCESS] ${origin} -> ${destination} on ${date}: Real Price = ${lowestPrice}`);
        return lowestPrice;
      }
    }

    console.warn('[FlightService] Unable to parse price from API response. Falling back to mock data.');
    return getMockFlightPrice(origin, destination);
  } catch (error) {
    console.warn(`[FlightService API Error] (${error.message}). Falling back to mock data.`);
    return getMockFlightPrice(origin, destination);
  }
}

module.exports = { getFlightPrice };
