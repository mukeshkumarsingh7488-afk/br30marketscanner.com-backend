const MARKET_CACHE = {
  "crypto-futures": { data: [], updatedAt: null, source: "bybit", status: "idle" },
  "forex-majors": { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  "forex-cross": { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  metals: { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  commodities: { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  "global-index": { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  "us-stocks": { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
  "us-etfs": { data: [], updatedAt: null, source: "twelvedata", status: "idle" },
};

function normalizeMarket(market = "future-stock") {
  const key = String(market || "future-stock")
    .trim()
    .toLowerCase();
  if (key === "forex") return "forex-majors";
  if (key === "forex-major") return "forex-majors";
  if (key === "crypto") return "crypto-futures";
  return key;
}

function setMarketData(market, data = [], meta = {}) {
  market = normalizeMarket(market);

  if (!MARKET_CACHE[market]) {
    MARKET_CACHE[market] = { data: [], updatedAt: null, source: meta.source || "unknown", status: "idle" };
  }

  MARKET_CACHE[market] = {
    data: Array.isArray(data) ? data : [],
    updatedAt: new Date().toISOString(),
    source: meta.source || MARKET_CACHE[market].source || "unknown",
    status: meta.status || "ok",
    error: meta.error || "",
  };

  return MARKET_CACHE[market];
}

function getMarketData(market) {
  market = normalizeMarket(market);
  return MARKET_CACHE[market]?.data || [];
}

function getMarketMeta(market) {
  market = normalizeMarket(market);
  return MARKET_CACHE[market] || { data: [], updatedAt: null, source: "unknown", status: "empty" };
}

function isGlobalMarket(market) {
  market = normalizeMarket(market);
  return Object.prototype.hasOwnProperty.call(MARKET_CACHE, market);
}

function getAllMarketCache() {
  return MARKET_CACHE;
}

module.exports = {
  setMarketData,
  getMarketData,
  getMarketMeta,
  isGlobalMarket,
  getAllMarketCache,
  normalizeMarket,
};
