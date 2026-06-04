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
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
    params: { instrument_key: chunk.join(",") },
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
      if (error?.response?.status === 401) console.log("UPSTOX AUTH ERROR => Access token expired or invalid");
      if (error?.response?.status === 429) console.log("UPSTOX RATE LIMIT => Too many requests");
    }
  }

  return finalData;
}

function aggregateToFiveMinute(candles = []) {
  if (!Array.isArray(candles) || !candles.length) return [];

  const sorted = [...candles].reverse();
  const result = [];

  for (let i = 0; i < sorted.length; i += 5) {
    const group = sorted.slice(i, i + 5);
    if (group.length < 5) continue;

    const first = group[0];
    const last = group[group.length - 1];

    const time = first[0];
    const open = Number(first[1] || 0);
    const high = Math.max(...group.map((c) => Number(c[2] || 0)));
    const low = Math.min(...group.map((c) => Number(c[3] || 0)));
    const close = Number(last[4] || 0);
    const volume = group.reduce((sum, c) => sum + Number(c[5] || 0), 0);
    const oi = Number(last[6] || 0);

    result.push([time, open, high, low, close, volume, oi]);
  }

  return result.reverse();
}

module.exports = {
  getFullMarketQuotes,
};
