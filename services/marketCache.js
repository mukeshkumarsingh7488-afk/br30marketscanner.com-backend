const MARKET_CACHE = {
  "crypto-futures": { data: [], updatedAt: null, source: "bybit", status: "idle", error: "", message: "" },
  "crypto-options": { data: [], updatedAt: null, source: "bybit", status: "idle", error: "", message: "" },
  "forex-majors": { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
  "forex-cross": { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
  metals: { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
  commodities: { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
  "global-index": { data: [], updatedAt: null, source: "coming-soon", status: "coming-soon", error: "", message: "Global Index Coming Soon" },
  "us-stocks": { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
  "us-etfs": { data: [], updatedAt: null, source: "twelvedata", status: "idle", error: "", message: "" },
};

function normalizeMarket(market = "future-stock") {
  const key = String(market || "future-stock")
    .trim()
    .toLowerCase();

  const aliases = {
    forex: "forex-majors",
    "forex-major": "forex-majors",
    "forex-majors": "forex-majors",
    "forex-cross": "forex-cross",
    crypto: "crypto-futures",
    "crypto-future": "crypto-futures",
    "crypto-futures": "crypto-futures",
    "crypto-option": "crypto-options",
    "crypto-options": "crypto-options",
    options: "crypto-options",
    metal: "metals",
    metals: "metals",
    commodity: "commodities",
    commodities: "commodities",
    "global-index": "global-index",
    "global-indices": "global-index",
    "us-stock": "us-stocks",
    "us-stocks": "us-stocks",
    "us-etf": "us-etfs",
    "us-etfs": "us-etfs",
  };

  return aliases[key] || key;
}

function setMarketData(market, data = [], meta = {}) {
  const key = normalizeMarket(market);

  if (!MARKET_CACHE[key]) {
    MARKET_CACHE[key] = {
      data: [],
      updatedAt: null,
      source: meta.source || "unknown",
      status: "idle",
      error: "",
      message: "",
    };
  }

  MARKET_CACHE[key] = {
    ...MARKET_CACHE[key],
    data: Array.isArray(data) ? data : [],
    updatedAt: meta.updatedAt || new Date().toISOString(),
    source: meta.source || MARKET_CACHE[key].source || "unknown",
    status: meta.status || "ok",
    error: meta.error || "",
    message: meta.message || "",
    responseMs: meta.responseMs || null,
    count: Array.isArray(data) ? data.length : 0,
  };

  return MARKET_CACHE[key];
}

function getMarketData(market) {
  const key = normalizeMarket(market);
  return MARKET_CACHE[key]?.data || [];
}

function getMarketMeta(market) {
  const key = normalizeMarket(market);

  return (
    MARKET_CACHE[key] || {
      data: [],
      updatedAt: null,
      source: "unknown",
      status: "empty",
      error: "Market not found in cache",
      message: "",
      responseMs: null,
      count: 0,
    }
  );
}

function getMarketSnapshot(market) {
  const key = normalizeMarket(market);
  const cache = getMarketMeta(key);

  return {
    market: key,
    data: cache.data || [],
    meta: {
      updatedAt: cache.updatedAt,
      source: cache.source,
      status: cache.status,
      error: cache.error || "",
      message: cache.message || "",
      responseMs: cache.responseMs || null,
      count: cache.count || (cache.data || []).length,
    },
  };
}

function isGlobalMarket(market) {
  const key = normalizeMarket(market);
  return Object.prototype.hasOwnProperty.call(MARKET_CACHE, key);
}

function getAllMarketCache() {
  return MARKET_CACHE;
}

function upsertMarketRow(market, row = {}, meta = {}) {
  const key = normalizeMarket(market);

  if (!MARKET_CACHE[key]) {
    MARKET_CACHE[key] = {
      data: [],
      updatedAt: null,
      source: meta.source || "unknown",
      status: "idle",
      error: "",
      message: "",
    };
  }

  const data = Array.isArray(MARKET_CACHE[key].data) ? MARKET_CACHE[key].data : [];
  const id = row.instrumentKey || row.tradingSymbol || row.symbol || row.sourceSymbol;

  if (!id) return MARKET_CACHE[key];

  const index = data.findIndex((x) => {
    const xid = x.instrumentKey || x.tradingSymbol || x.symbol || x.sourceSymbol;
    return xid === id;
  });

  const nextRow = {
    ...(index >= 0 ? data[index] : {}),
    ...row,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) data[index] = nextRow;
  else data.push(nextRow);

  MARKET_CACHE[key] = {
    ...MARKET_CACHE[key],
    data: data.sort((a, b) => Number(b.score || 0) - Number(a.score || 0)),
    updatedAt: new Date().toISOString(),
    source: meta.source || MARKET_CACHE[key].source || "websocket",
    status: meta.status || "ok",
    error: meta.error || "",
    message: meta.message || "",
    responseMs: meta.responseMs || null,
    count: data.length,
  };

  return MARKET_CACHE[key];
}

module.exports = {
  setMarketData,
  getMarketData,
  getMarketMeta,
  getMarketSnapshot,
  isGlobalMarket,
  getAllMarketCache,
  normalizeMarket,
  upsertMarketRow,
};
