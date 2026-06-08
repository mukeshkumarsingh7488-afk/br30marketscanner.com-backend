const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../config/upstoxConfig");

const UPSTOX_TIMEOUT_MS = Number(process.env.UPSTOX_TIMEOUT_MS || 30000);
const UPSTOX_CHUNK_SIZE = Number(process.env.UPSTOX_CHUNK_SIZE || 40);
const UPSTOX_CHUNK_DELAY_MS = Number(process.env.UPSTOX_CHUNK_DELAY_MS || 350);
const UPSTOX_RETRY_DELAY_MS = Number(process.env.UPSTOX_RETRY_DELAY_MS || 1200);
const UPSTOX_MAX_RETRIES = Number(process.env.UPSTOX_MAX_RETRIES || 3);

let quoteQueue = Promise.resolve();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: UPSTOX_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "User-Agent": "BR30-Market-Scanner/1.0",
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(arr = [], size = UPSTOX_CHUNK_SIZE) {
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

function isRetryable(error) {
  const status = error?.response?.status;
  return error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT" || status === 408 || status === 429 || status >= 500 || !status;
}

async function getQuoteChunk(part = [], attempt = 1) {
  if (!part.length) return {};

  try {
    const res = await api.get("/market-quote/quotes", {
      params: {
        instrument_key: part.join(","),
      },
    });

    return res.data?.data || {};
  } catch (error) {
    const status = error?.response?.status;
    const msg = getErrorMessage(error);

    console.log(`UPSTOX CHUNK ERROR => attempt ${attempt}/${UPSTOX_MAX_RETRIES} | size ${part.length} | status ${status || "NO_STATUS"} | ${msg}`);

    if (attempt < UPSTOX_MAX_RETRIES && isRetryable(error)) {
      await sleep(UPSTOX_RETRY_DELAY_MS * attempt);
      return getQuoteChunk(part, attempt + 1);
    }

    throw error;
  }
}

async function fetchQuotesSequential(keys = []) {
  const chunks = chunkArray(keys);
  let finalData = {};

  console.log(`UPSTOX QUOTE START => totalKeys ${keys.length} | chunkSize ${UPSTOX_CHUNK_SIZE} | chunks ${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];

    try {
      const data = await getQuoteChunk(part);
      finalData = { ...finalData, ...(data || {}) };

      console.log(`UPSTOX CHUNK DONE => ${i + 1}/${chunks.length} | received ${Object.keys(data || {}).length}/${part.length}`);
    } catch (error) {
      console.log(`UPSTOX QUOTE ERROR => chunk ${i + 1}/${chunks.length} | ${getErrorMessage(error)}`);

      if (error?.response?.status === 401) {
        console.log("UPSTOX AUTH ERROR => Access token expired or invalid");
      }

      if (error?.response?.status === 429) {
        console.log("UPSTOX RATE LIMIT => Too many requests");
      }
    }

    if (i < chunks.length - 1) {
      await sleep(UPSTOX_CHUNK_DELAY_MS);
    }
  }

  console.log(`UPSTOX QUOTE DONE => received ${Object.keys(finalData).length}/${keys.length}`);

  return finalData;
}

async function runQueued(task) {
  const run = quoteQueue.then(task, task);
  quoteQueue = run.catch(() => {});
  return run;
}

async function getFullMarketQuotes(instrumentKeys = []) {
  if (!ACCESS_TOKEN) {
    console.log("UPSTOX TOKEN ERROR => UPSTOX_ACCESS_TOKEN missing");
    return {};
  }

  const keys = cleanKeys(instrumentKeys);
  if (!keys.length) return {};

  return runQueued(() => fetchQuotesSequential(keys));
}

module.exports = {
  getFullMarketQuotes,
};
