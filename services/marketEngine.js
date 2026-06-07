const { setMarketData } = require("./marketCache");
const { fetchBybitCryptoRows, fetchBybitCryptoOptionRows } = require("./bybitService");
const { fetchTwelveDataRows } = require("./twelveDataService");

let started = false;
let cryptoRunning = false;
let twelveRunning = false;

const TWELVE_MARKETS = ["forex-majors", "forex-cross", "metals", "commodities", "us-stocks", "us-etfs"];

const INTERVALS = {
  crypto: Number(process.env.CRYPTO_REFRESH_MS || 3000),
  twelve: Number(process.env.TWELVE_REFRESH_MS || 3000),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nowTime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

function markComingSoon() {
  setMarketData("global-index", [], {
    source: "coming-soon",
    status: "coming-soon",
    error: "",
    message: "Global Index Coming Soon",
    updatedAt: new Date().toISOString(),
  });

  console.log(`🟡 [${nowTime()}] Global Index => Coming Soon`);
}

async function safeRun(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.log(`❌ [${nowTime()}] MARKET ENGINE ERROR [${name}] => ${err.message}`);
  }
}

function updateCache(market, rows, meta = {}) {
  const isOk = Array.isArray(rows) && rows.length > 0;

  setMarketData(market, isOk ? rows : [], {
    source: meta.source || "unknown",
    status: isOk ? "ok" : "empty",
    error: isOk ? "" : meta.error || `No ${market} data`,
    message: meta.message || "",
    updatedAt: new Date().toISOString(),
    responseMs: meta.responseMs || null,
  });

  console.log(`${isOk ? "✅" : "⚠️"} [${nowTime()}] ${market} cache ${isOk ? "updated" : "empty"} | Rows: ${Array.isArray(rows) ? rows.length : 0} | ${meta.responseMs || 0}ms`);
}

async function updateCrypto() {
  if (cryptoRunning) {
    console.log(`⏳ [${nowTime()}] Crypto update skipped: previous update still running`);
    return;
  }

  cryptoRunning = true;
  const startedAt = Date.now();

  try {
    const futuresRows = await fetchBybitCryptoRows();

    updateCache("crypto-futures", futuresRows, {
      source: "bybit",
      responseMs: Date.now() - startedAt,
      error: "No crypto futures data",
    });

    const optionStartedAt = Date.now();

    if (typeof fetchBybitCryptoOptionRows === "function") {
      const optionRows = await fetchBybitCryptoOptionRows();

      updateCache("crypto-options", optionRows, {
        source: "bybit",
        responseMs: Date.now() - optionStartedAt,
        error: "No crypto options daily expiry data",
        message: "Crypto Options Daily Expiry",
      });
    } else {
      setMarketData("crypto-options", [], {
        source: "bybit",
        status: "empty",
        error: "fetchBybitCryptoOptionRows function not found",
        message: "Crypto Options Daily Expiry",
        updatedAt: new Date().toISOString(),
        responseMs: 0,
      });

      console.log(`⚠️ [${nowTime()}] crypto-options skipped | fetchBybitCryptoOptionRows not found`);
    }

    console.log(`🪙 [${nowTime()}] Bybit crypto cycle completed | ${Date.now() - startedAt}ms`);
  } finally {
    cryptoRunning = false;
  }
}

async function updateTwelveMarket(market) {
  const startedAt = Date.now();
  const rows = await fetchTwelveDataRows(market);

  updateCache(market, rows, {
    source: "twelvedata",
    responseMs: Date.now() - startedAt,
    error: "No TwelveData rows",
  });
}

async function updateAllTwelveMarkets() {
  if (twelveRunning) {
    console.log(`⏳ [${nowTime()}] TwelveData update skipped: previous update still running`);
    return;
  }

  twelveRunning = true;
  const startedAt = Date.now();

  try {
    for (const market of TWELVE_MARKETS) {
      await safeRun(market, () => updateTwelveMarket(market));
      await sleep(Number(process.env.TWELVE_MARKET_DELAY_MS || 150));
    }

    markComingSoon();

    console.log(`🌍 [${nowTime()}] TwelveData cycle completed | Markets: ${TWELVE_MARKETS.length} | ${Date.now() - startedAt}ms`);
  } finally {
    twelveRunning = false;
  }
}

function startMarketEngine() {
  if (started) {
    console.log("⚠️ BR30 Market Engine already running");
    return;
  }

  started = true;

  console.log("🚀 BR30 Market Engine Starting...");
  console.log(`⚡ Crypto Refresh: ${INTERVALS.crypto}ms`);
  console.log(`⚡ TwelveData Refresh: ${INTERVALS.twelve}ms`);
  console.log("✅ Indian Market / Upstox untouched");
  console.log("✅ Crypto Futures => Bybit");
  console.log("✅ Crypto Options Daily Expiry => Bybit");
  console.log("✅ Forex/Metals/Commodities/US Stocks/US ETFs => TwelveData");
  console.log("✅ Global Index => Coming Soon");

  markComingSoon();

  safeRun("crypto-first-load", updateCrypto);
  safeRun("twelve-first-load", updateAllTwelveMarkets);

  setInterval(() => {
    safeRun("crypto-interval", updateCrypto);
  }, INTERVALS.crypto);

  setInterval(() => {
    safeRun("twelve-interval", updateAllTwelveMarkets);
  }, INTERVALS.twelve);

  console.log("✅ BR30 Market Engine Started Successfully");
}

module.exports = {
  startMarketEngine,
};
