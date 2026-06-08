const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../config/upstoxConfig");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "User-Agent": "BR30-Market-Scanner/1.0",
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function chunkArray(arr = [], size = 80) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function cleanKeys(keys = []) {
  return [
    ...new Set(
      keys
        .filter(Boolean)
        .map((k) => String(k).trim())
        .filter(Boolean)
    ),
  ];
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.response?.data?.errors?.[0]?.message || error?.response?.data?.error || error.message || "Upstox API failed";
}

async function getQuoteChunk(chunk = [], attempt = 1) {
  if (!chunk.length) return {};

  try {
    const res = await api.get("/market-quote/quotes", {
      params: { instrument_key: chunk.join(",") },
    });

    return res.data?.data || {};
  } catch (error) {
    const status = error?.response?.status;
    const msg = getErrorMessage(error);

    console.log(`UPSTOX CHUNK ERROR => attempt ${attempt} | size ${chunk.length} | status ${status || "NO_STATUS"} | ${msg}`);

    if (attempt < 3 && (error.code === "ECONNABORTED" || status === 429 || status >= 500 || !status)) {
      await sleep(1000 * attempt);
      return getQuoteChunk(chunk, attempt + 1);
    }

    throw error;
  }
}

async function getFullMarketQuotes(instrumentKeys = []) {
  if (!ACCESS_TOKEN) {
    console.log("UPSTOX TOKEN ERROR => UPSTOX_ACCESS_TOKEN missing");
    return {};
  }

  const keys = cleanKeys(instrumentKeys);
  if (!keys.length) return {};

  const chunks = chunkArray(keys, 80);
  let finalData = {};

  console.log(`UPSTOX QUOTE START => totalKeys ${keys.length} | chunks ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];

    try {
      const data = await getQuoteChunk(part);
      finalData = { ...finalData, ...(data || {}) };
    } catch (error) {
      console.log(`UPSTOX QUOTE ERROR => chunk ${i + 1}/${chunks.length} |`, getErrorMessage(error));

      if (error?.response?.status === 401) console.log("UPSTOX AUTH ERROR => Access token expired or invalid");
      if (error?.response?.status === 429) console.log("UPSTOX RATE LIMIT => Too many requests");
    }

    await sleep(150);
  }

  console.log(`UPSTOX QUOTE DONE => received ${Object.keys(finalData).length}/${keys.length}`);

  return finalData;
}

module.exports = {
  getFullMarketQuotes,
};
