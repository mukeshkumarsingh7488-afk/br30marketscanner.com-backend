const axios = require("axios");
const zlib = require("zlib");

const MASTER_URL = process.env.UPSTOX_MASTER_URL || "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";

const INDEX_SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "SENSEX", "BANKEX"];

const MASTER_CACHE_TTL = 6 * 60 * 60 * 1000;

let cache = {
  loadedAt: null,
  instruments: [],
};

function normalizeMarket(market = "future-stock") {
  const key = String(market || "future-stock")
    .trim()
    .toLowerCase();

  const aliases = {
    future: "future-stock",
    futures: "future-stock",
    "stock-future": "future-stock",
    "future-stock": "future-stock",
    "index-future": "index-future",
    equity: "equity-stock",
    "cash-stock": "equity-stock",
    "equity-stock": "equity-stock",
    "index-option": "index-option",
    "stock-option": "equity-stock-option",
    "equity-stock-option": "equity-stock-option",
    "future-stock-option": "future-stock-option",
  };

  return aliases[key] || key;
}

function safeUpper(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function cleanTicker(value = "") {
  return safeUpper(value)
    .replace(/-EQ$/i, "")
    .replace(/\s+EQ$/i, "")
    .replace(/\.EQ$/i, "")
    .trim();
}

function looksLikeTicker(value = "") {
  const v = cleanTicker(value);
  if (!v) return false;
  if (v.includes(" ")) return false;
  if (v.length > 24) return false;
  return /^[A-Z0-9&_\-]+$/.test(v);
}

function getRawTradingSymbol(x = {}) {
  return x.trading_symbol || x.tradingsymbol || x.symbol || "";
}

function getRawUnderlyingSymbol(x = {}) {
  return x.asset_symbol || x.underlying_symbol || x.underlyingSymbol || "";
}

function getSymbol(x = {}) {
  const segment = safeUpper(x.segment);
  const type = safeUpper(x.instrument_type);

  const tradingSymbol = cleanTicker(getRawTradingSymbol(x));
  const underlyingSymbol = cleanTicker(getRawUnderlyingSymbol(x));
  const name = cleanTicker(x.name);

  if (segment === "NSE_EQ" || segment === "BSE_EQ" || type === "EQ") {
    if (looksLikeTicker(tradingSymbol)) return tradingSymbol;
    if (looksLikeTicker(underlyingSymbol)) return underlyingSymbol;
    return tradingSymbol || underlyingSymbol || name;
  }

  if (["NSE_FO", "BSE_FO"].includes(segment)) {
    if (INDEX_SYMBOLS.includes(underlyingSymbol)) return underlyingSymbol;
    if (looksLikeTicker(underlyingSymbol)) return underlyingSymbol;
    if (looksLikeTicker(tradingSymbol) && !String(tradingSymbol).match(/\d{2}[A-Z]{3}/)) return tradingSymbol;
    return underlyingSymbol || tradingSymbol || name;
  }

  if (looksLikeTicker(tradingSymbol)) return tradingSymbol;
  if (looksLikeTicker(underlyingSymbol)) return underlyingSymbol;

  return tradingSymbol || underlyingSymbol || name;
}

function expiryMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function isFoSegment(x = {}) {
  return ["NSE_FO", "BSE_FO"].includes(safeUpper(x.segment));
}

function getExchangePrefix(segment = "", symbol = "") {
  const seg = safeUpper(segment);
  const sym = safeUpper(symbol);

  if (seg.startsWith("BSE")) return "BSE";
  if (["SENSEX", "BANKEX"].includes(sym)) return "BSE";
  return "NSE";
}

function cleanTvSymbol(symbol = "") {
  return safeUpper(symbol)
    .replace(/&/g, "_")
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanTvSearch(symbol = "") {
  return safeUpper(symbol)
    .replace(/&/g, " ")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTradingViewLinks(symbol, segment = "") {
  const clean = cleanTvSymbol(symbol);
  const search = cleanTvSearch(symbol);
  const exchange = getExchangePrefix(segment, clean || search);
  const tvSymbol = clean ? `${exchange}:${clean}` : "";
  const searchQuery = clean || search || symbol;

  return {
    tvSymbol,
    tradingViewUrl: tvSymbol ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}` : "",
    tradingViewSearchUrl: `https://www.tradingview.com/symbols/search/?query=${encodeURIComponent(searchQuery)}&exchange=${encodeURIComponent(exchange)}`,
  };
}

function makeTradingView(symbol, segment = "") {
  return buildTradingViewLinks(symbol, segment);
}

function makeOptionTvSymbol(underlyingSymbol, segment = "") {
  return buildTradingViewLinks(underlyingSymbol, segment);
}

async function loadMaster(force = false) {
  if (!force && cache.instruments.length && cache.loadedAt && Date.now() - cache.loadedAt < MASTER_CACHE_TTL) {
    return cache.instruments;
  }

  try {
    const res = await axios.get(MASTER_URL, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        Accept: "application/json, application/gzip, */*",
        "User-Agent": "BR30-Market-Scanner/1.0",
      },
    });

    const raw = zlib.gunzipSync(res.data).toString("utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid Upstox master format");
    }

    cache.instruments = parsed;
    cache.loadedAt = Date.now();

    console.log(`✅ Loaded Upstox master instruments: ${cache.instruments.length}`);

    return cache.instruments;
  } catch (err) {
    console.log("UPSTOX MASTER LOAD ERROR =>", err.message);

    if (cache.instruments.length) {
      console.log("⚠️ Using old Upstox master cache");
      return cache.instruments;
    }

    return [];
  }
}

function baseInstrument(item = {}) {
  const symbol = getSymbol(item);
  const tv = makeTradingView(symbol, item.segment);

  return {
    symbol,
    underlyingSymbol: symbol,
    name: item.name || symbol,
    tradingSymbol: getRawTradingSymbol(item) || symbol,
    instrumentKey: item.instrument_key,
    expiry: item.expiry || null,
    lotSize: item.lot_size || item.minimum_lot || 1,
    instrumentType: item.instrument_type || "",
    segment: item.segment || "",
    exchange: getExchangePrefix(item.segment, symbol),
    ...tv,
  };
}

function optionInstrument(item = {}) {
  const underlyingSymbol = getSymbol(item);
  const strike = Number(item.strike_price || 0);
  const optionType = safeUpper(item.instrument_type);
  const tradingSymbol = getRawTradingSymbol(item) || `${underlyingSymbol}${strike}${optionType}`;
  const tv = makeOptionTvSymbol(underlyingSymbol, item.segment);

  return {
    symbol: `${underlyingSymbol} ${strike || ""} ${optionType}`.trim(),
    underlyingSymbol,
    name: item.name || underlyingSymbol,
    tradingSymbol,
    instrumentKey: item.instrument_key,
    expiry: item.expiry || null,
    lotSize: item.lot_size || item.minimum_lot || 1,
    strike,
    optionType,
    instrumentType: item.instrument_type || "",
    segment: item.segment || "",
    exchange: getExchangePrefix(item.segment, underlyingSymbol),
    ...tv,
  };
}

function pickNearestBySymbol(items = []) {
  const grouped = new Map();

  for (const item of items) {
    const symbol = getSymbol(item);
    if (!symbol || !item.instrument_key) continue;

    const exp = expiryMs(item.expiry);
    const old = grouped.get(symbol);

    if (!old || (exp && exp < old.expiryMs)) {
      grouped.set(symbol, {
        ...baseInstrument(item),
        expiryMs: exp,
      });
    }
  }

  return Array.from(grouped.values())
    .map(({ expiryMs, ...rest }) => rest)
    .sort((a, b) => {
      const ia = INDEX_SYMBOLS.indexOf(a.symbol);
      const ib = INDEX_SYMBOLS.indexOf(b.symbol);

      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }

      return String(a.symbol).localeCompare(String(b.symbol));
    });
}

function pickNearestOptionsByIndex(items = [], perIndexLimit = 500) {
  const finalList = [];

  for (const symbol of INDEX_SYMBOLS) {
    const arr = items.filter((x) => getSymbol(x) === symbol);
    if (!arr.length) continue;

    arr.sort((a, b) => expiryMs(a.expiry) - expiryMs(b.expiry));

    const nearestExpiry = expiryMs(arr[0].expiry);

    const nearest = arr
      .filter((x) => expiryMs(x.expiry) === nearestExpiry)
      .sort((a, b) => Number(a.strike_price || 0) - Number(b.strike_price || 0))
      .slice(0, perIndexLimit);

    finalList.push(...nearest);
  }

  return finalList;
}

function pickNearestStockOptions(items = [], limit = 500) {
  return items
    .filter((x) => x.instrument_key)
    .sort((a, b) => expiryMs(a.expiry) - expiryMs(b.expiry) || getSymbol(a).localeCompare(getSymbol(b)) || Number(a.strike_price || 0) - Number(b.strike_price || 0))
    .slice(0, limit);
}

async function loadInstrumentsByMarket(market = "future-stock", force = false) {
  market = normalizeMarket(market);

  const data = await loadMaster(force);
  const now = Date.now();

  if (!Array.isArray(data) || !data.length) {
    return [];
  }

  if (market === "future-stock") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      return safeUpper(x.segment) === "NSE_FO" && safeUpper(x.instrument_type).includes("FUT") && expiryMs(x.expiry) >= now && !INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestBySymbol(list);
  }

  if (market === "index-future") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      return isFoSegment(x) && safeUpper(x.instrument_type).includes("FUT") && expiryMs(x.expiry) >= now && INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestBySymbol(list);
  }

  if (market === "equity-stock") {
    return data
      .filter((x) => safeUpper(x.segment) === "NSE_EQ" && safeUpper(x.instrument_type) === "EQ" && x.instrument_key)
      .slice(0, 500)
      .map(baseInstrument);
  }

  if (market === "index-option") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      const type = safeUpper(x.instrument_type);

      return isFoSegment(x) && ["CE", "PE"].includes(type) && expiryMs(x.expiry) >= now && INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestOptionsByIndex(list, 500).map(optionInstrument);
  }

  if (market === "equity-stock-option" || market === "future-stock-option") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      const type = safeUpper(x.instrument_type);

      return safeUpper(x.segment) === "NSE_FO" && ["CE", "PE"].includes(type) && expiryMs(x.expiry) >= now && !INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestStockOptions(list, 500).map(optionInstrument);
  }

  return loadInstrumentsByMarket("future-stock", force);
}

module.exports = {
  loadInstrumentsByMarket,
  loadStockFutures: () => loadInstrumentsByMarket("future-stock"),
  loadMaster,
  normalizeMarket,
};
