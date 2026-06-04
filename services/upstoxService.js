const axios = require("axios");
const { BASE_URL } = require("../config/upstoxConfig");

function getAccessToken() {
  return process.env.UPSTOX_ACCESS_TOKEN || "";
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "User-Agent": "BR30-Market-Scanner/1.0",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function chunkArray(arr = [], size = 100) {
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

async function getQuoteChunk(chunk = []) {
  if (!chunk.length) return {};

  const res = await api.get("/market-quote/quotes", {
    params: {
      instrument_key: chunk.join(","),
    },
  });

  return res.data?.data || {};
}

async function getFullMarketQuotes(instrumentKeys = []) {
  if (!getAccessToken()) {
    console.log("UPSTOX TOKEN ERROR => UPSTOX_ACCESS_TOKEN missing");
    return {};
  }

  const keys = cleanKeys(instrumentKeys);
  if (!keys.length) return {};

  const chunks = chunkArray(keys, 100);
  let finalData = {};

  for (const part of chunks) {
    try {
      const data = await getQuoteChunk(part);
      finalData = { ...finalData, ...(data || {}) };
    } catch (error) {
      console.log("UPSTOX QUOTE ERROR =>", getErrorMessage(error));

      if (error?.response?.status === 401) {
        console.log("UPSTOX AUTH ERROR => Access token expired or invalid");
      }

      if (error?.response?.status === 429) {
        console.log("UPSTOX RATE LIMIT => Too many requests");
      }
    }
  }

  return finalData;
}

async function getIntradayCandles(instrumentKey, unit = "minutes", interval = 5) {
  if (!getAccessToken()) {
    console.log("UPSTOX TOKEN ERROR => UPSTOX_ACCESS_TOKEN missing");
    return [];
  }

  if (!instrumentKey) return [];

  try {
    const encodedKey = encodeURIComponent(instrumentKey);

    const res = await api.get(`/historical-candle/intraday/${encodedKey}/${unit}/${interval}`);

    return Array.isArray(res.data?.data?.candles) ? res.data.data.candles : [];
  } catch (error) {
    console.log("UPSTOX CANDLE ERROR =>", instrumentKey, getErrorMessage(error));
    return [];
  }
}

module.exports = {
  getFullMarketQuotes,
  getIntradayCandles,
};
