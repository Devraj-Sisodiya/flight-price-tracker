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
 * Resolves IATA airport code (e.g. 'DEL') to Sky Scrapper Entity ID & Sky ID.
 */
async function getEntityDetails(iataCode, apiKey, apiHost) {
  try {
    const res = await axios.get(`https://${apiHost}/api/v1/flights/auto-complete`, {
      params: { query: iataCode },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 5000
    });

    if (res.data && res.data.data && res.data.data.length > 0) {
      const item = res.data.data[0];
      return { skyId: item.skyId || iataCode, entityId: item.entityId };
    }
  } catch (err) {
    console.warn(`[FlightService Entity Lookup Note] Using IATA code fallback for ${iataCode}.`);
  }
  return { skyId: iataCode, entityId: iataCode };
}

/**
 * Fetches flight price for a given route and departure date.
 * Queries RapidAPI Sky Scrapper with a fallback to mock data on rate limits or failures.
 * 
 * @param {string} origin - Departure IATA code (e.g. 'DEL')
 * @param {string} destination - Arrival IATA code (e.g. 'BOM')
 * @param {string} date - Departure date (YYYY-MM-DD)
 * @returns {Promise<number>} Lowest available price
 */
async function getFlightPrice(origin, destination, date) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'sky-scrapper.p.rapidapi.com';

  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY') {
    console.warn('[FlightService] RapidAPI key missing or default. Utilizing mock flight price fallback.');
    return getMockFlightPrice(origin, destination);
  }

  try {
    // Step 1: Resolve Entity IDs required by Sky Scrapper API
    const originDetails = await getEntityDetails(origin, apiKey, apiHost);
    const destDetails = await getEntityDetails(destination, apiKey, apiHost);

    // Step 2: Query Live Flight Prices
    const response = await axios.get(`https://${apiHost}/api/v1/flights/searchFlights`, {
      params: {
        originSkyId: originDetails.skyId,
        destinationSkyId: destDetails.skyId,
        originEntityId: originDetails.entityId,
        destinationEntityId: destDetails.entityId,
        date: date,
        cabinClass: 'economy',
        adults: '1'
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 10000
    });

    // Parse itineraries for cheapest price
    const itineraries = response.data?.data?.itineraries || [];
    if (itineraries.length > 0) {
      const prices = itineraries.map(item => item.price?.raw).filter(Boolean);
      if (prices.length > 0) {
        const lowestPrice = Math.min(...prices);
        console.log(`[FlightService Live API] ${origin} -> ${destination} on ${date}: ₹${lowestPrice}`);
        return lowestPrice;
      }
    }

    console.warn('[FlightService] Unable to parse price from API response. Falling back to mock data.');
    return getMockFlightPrice(origin, destination);
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.warn(`[FlightService 403 Not Subscribed] Your RapidAPI key is valid, but NOT subscribed to Sky Scrapper on RapidAPI yet. Visit https://rapidapi.com to click "Subscribe" (Free). Falling back to mock data.`);
    } else {
      console.warn(`[FlightService API Error] (${error.message}). Falling back to mock data.`);
    }
    return getMockFlightPrice(origin, destination);
  }
}

module.exports = { getFlightPrice };
