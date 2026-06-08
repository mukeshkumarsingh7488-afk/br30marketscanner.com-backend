const { setMarketData, getMarketMeta } = require("./marketCache");
const { fetchTwelveDataRows } = require("./twelveDataService");
const { startTwelveDataWs, isTwelveWsHealthy, getTwelveWsHealth } = require("./twelveDataWsService");

let started = false;
let twelveWsFallbackRunning = false;
let twelveRestOnlyRunning = false;

const TWELVE_WS_MARKETS = ["forex-majors", "forex-cross", "metals", "commodities"];
const TWELVE_REST_ONLY_MARKETS = ["metal-stocks", "us-stocks", "us-etfs"];

const INTERVALS = {
  twelveFallbackCheck: Number(process.env.TWELVE_FALLBACK_CHECK_MS || 20000),
  twelveRestOnly: Number(process.env.TWELVE_REST_ONLY_REFRESH_MS || 60000),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function nowTime() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

async function safeRun(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.log(`❌ [${nowTime()}] MARKET ENGINE ERROR [${name}] => ${err.message}`);
  }
}

function updateCachePreserveOnEmpty(market, rows, meta = {}) {
  const isOk = Array.isArray(rows) && rows.length > 0;
  const oldCache = getMarketMeta(market);
  const oldRows = Array.isArray(oldCache?.data) ? oldCache.data : [];

  if (isOk) {
    setMarketData(market, rows, {
      source: meta.source || "unknown",
      status: "ok",
      error: "",
      message: meta.message || "",
      updatedAt: new Date().toISOString(),
      responseMs: meta.responseMs || null,
    });

    console.log(`✅ [${nowTime()}] ${market} cache updated | Rows: ${rows.length} | ${meta.responseMs || 0}ms`);
    return;
  }

  if (oldRows.length) {
    setMarketData(market, oldRows, {
      source: meta.source || oldCache.source || "unknown",
      status: "stale",
      error: meta.error || `Latest ${market} fetch failed, old cache preserved`,
      message: "Old cache preserved",
      updatedAt: oldCache.updatedAt || new Date().toISOString(),
      responseMs: meta.responseMs || null,
    });

    console.log(`🛡️ [${nowTime()}] ${market} fetch failed/empty, old cache preserved | Old Rows: ${oldRows.length} | ${meta.responseMs || 0}ms`);
    return;
  }

  setMarketData(market, [], {
    source: meta.source || "unknown",
    status: "empty",
    error: meta.error || `No ${market} data`,
    message: meta.message || "",
    updatedAt: new Date().toISOString(),
    responseMs: meta.responseMs || null,
  });

  console.log(`⚠️ [${nowTime()}] ${market} cache empty | Rows: 0 | ${meta.responseMs || 0}ms`);
}

async function updateTwelveMarket(market, source = "twelvedata-rest", message = "REST update") {
  const startedAt = Date.now();
  const rows = await fetchTwelveDataRows(market);

  updateCachePreserveOnEmpty(market, rows, {
    source,
    responseMs: Date.now() - startedAt,
    error: `No ${market} TwelveData rows`,
    message,
  });
}

async function updateWsFallbackMarkets(reason = "ws-stale-or-down") {
  if (twelveWsFallbackRunning) {
    console.log(`⏳ [${nowTime()}] WS markets REST fallback skipped: previous fallback still running`);
    return;
  }

  twelveWsFallbackRunning = true;
  const startedAt = Date.now();

  try {
    console.log(`🛡️ [${nowTime()}] WS markets REST fallback starting | Reason: ${reason}`);

    for (const market of TWELVE_WS_MARKETS) {
      await safeRun(`ws-fallback-${market}`, () => updateTwelveMarket(market, "twelvedata-rest-fallback", "WS fallback REST"));
      await sleep(Number(process.env.TWELVE_MARKET_DELAY_MS || 300));
    }

    console.log(`🌍 [${nowTime()}] WS markets REST fallback completed | Markets: ${TWELVE_WS_MARKETS.length} | ${Date.now() - startedAt}ms`);
  } finally {
    twelveWsFallbackRunning = false;
  }
}

async function updateRestOnlyMarkets(reason = "rest-only-refresh") {
  if (twelveRestOnlyRunning) {
    console.log(`⏳ [${nowTime()}] REST-only markets skipped: previous cycle still running`);
    return;
  }

  twelveRestOnlyRunning = true;
  const startedAt = Date.now();

  try {
    console.log(`🌍 [${nowTime()}] REST-only markets update starting | Reason: ${reason}`);

    for (const market of TWELVE_REST_ONLY_MARKETS) {
      await safeRun(`rest-only-${market}`, () => updateTwelveMarket(market, "twelvedata-rest", "REST-only market update"));
      await sleep(Number(process.env.TWELVE_MARKET_DELAY_MS || 300));
    }

    console.log(`✅ [${nowTime()}] REST-only markets update completed | Markets: ${TWELVE_REST_ONLY_MARKETS.length} | ${Date.now() - startedAt}ms`);
  } finally {
    twelveRestOnlyRunning = false;
  }
}

function runTwelveWsFallbackIfNeeded() {
  const health = typeof getTwelveWsHealth === "function" ? getTwelveWsHealth() : {};
  const healthy = isTwelveWsHealthy();

  if (healthy) {
    console.log(`✅ [${nowTime()}] TwelveData WS healthy, WS-market REST fallback skipped`);
    return;
  }

  console.log(`🛡️ [${nowTime()}] TwelveData WS stale/down, running WS-market REST fallback | ${JSON.stringify(health)}`);
  safeRun("twelve-ws-market-rest-fallback", () => updateWsFallbackMarkets("ws-stale-or-down"));
}

function startMarketEngine() {
  if (started) {
    console.log("⚠️ BR30 Market Engine already running");
    return;
  }

  started = true;

  console.log("🚀 BR30 Market Engine Starting...");
  console.log(`⚡ TwelveData WS Primary: ${String(process.env.TWELVE_WS_ENABLED || "false").toLowerCase() === "true" ? "enabled" : "disabled"}`);
  console.log(`🛡️ WS Fallback Check: ${INTERVALS.twelveFallbackCheck}ms`);
  console.log(`🌍 REST-only Refresh: ${INTERVALS.twelveRestOnly}ms`);
  console.log("✅ Indian Market / Upstox untouched");
  console.log("🟡 Crypto Futures/Options => Coming Soon");
  console.log("🟡 Global Index => Coming Soon");
  console.log("✅ WS Markets => Forex/Metals/Commodities");
  console.log("✅ REST-only Markets => Metal Stocks/US Stocks/US ETFs");

  startTwelveDataWs();

  safeRun("rest-only-first-load", () => updateRestOnlyMarkets("first-load-rest-only-cache-seed"));

  setTimeout(() => {
    runTwelveWsFallbackIfNeeded();
  }, 5000);

  setInterval(() => {
    runTwelveWsFallbackIfNeeded();
  }, INTERVALS.twelveFallbackCheck);

  setInterval(() => {
    safeRun("rest-only-interval", () => updateRestOnlyMarkets("rest-only-interval"));
  }, INTERVALS.twelveRestOnly);

  console.log("✅ BR30 Market Engine Started Successfully");
}

module.exports = {
  startMarketEngine,
};
