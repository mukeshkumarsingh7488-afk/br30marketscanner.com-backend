const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../config/upstoxConfig");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "User-Agent": "BR30-Market-Scanner/1.0",
  },
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
  if (!ACCESS_TOKEN) {
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

module.exports = {
  getFullMarketQuotes,
};
