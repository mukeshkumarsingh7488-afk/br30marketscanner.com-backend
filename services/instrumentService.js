const axios = require("axios");
const zlib = require("zlib");

const MASTER_URL = process.env.UPSTOX_MASTER_URL || "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";

const INDEX_SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "SENSEX", "BANKEX"];

const LIQUID_FNO_STOCKS = [
  "RELIANCE",
  "HDFCBANK",
  "ICICIBANK",
  "INFY",
  "TCS",
  "LT",
  "ITC",
  "SBIN",
  "BHARTIARTL",
  "AXISBANK",
  "KOTAKBANK",
  "HINDUNILVR",
  "BAJFINANCE",
  "ASIANPAINT",
  "MARUTI",
  "SUNPHARMA",
  "TITAN",
  "ULTRACEMCO",
  "NTPC",
  "POWERGRID",
  "ONGC",
  "TATAMOTORS",
  "M&M",
  "JSWSTEEL",
  "TATASTEEL",
  "WIPRO",
  "TECHM",
  "HCLTECH",
  "COALINDIA",
  "ADANIENT",
  "ADANIPORTS",
  "BAJAJFINSV",
  "GRASIM",
  "HINDALCO",
  "NESTLEIND",
  "CIPLA",
  "DRREDDY",
  "DIVISLAB",
  "EICHERMOT",
  "HEROMOTOCO",
  "APOLLOHOSP",
  "BRITANNIA",
  "BPCL",
  "INDUSINDBK",
  "BAJAJ-AUTO",
  "TATACONSUM",
  "SHRIRAMFIN",
  "SBILIFE",
  "HDFCLIFE",
  "LTIM",
  "DMART",
  "JIOFIN",
  "IRFC",
  "PNB",
  "BANKBARODA",
  "CANBK",
  "IDFCFIRSTB",
  "FEDERALBNK",
  "AUBANK",
  "RBLBANK",
  "BANDHANBNK",
  "YESBANK",
  "PEL",
  "LICHSGFIN",
  "CHOLAFIN",
  "MUTHOOTFIN",
  "IEX",
  "MCX",
  "CDSL",
  "BSE",
  "ABB",
  "SIEMENS",
  "BEL",
  "HAL",
  "BHEL",
  "CUMMINSIND",
  "POLYCAB",
  "DIXON",
  "VOLTAS",
  "BLUESTARCO",
  "HAVELLS",
  "CROMPTON",
  "DLF",
  "LODHA",
  "OBEROIRLTY",
  "GODREJPROP",
  "TATAPOWER",
  "ADANIENSOL",
  "ADANIGREEN",
  "NHPC",
  "SJVN",
  "IREDA",
  "RVNL",
  "IRCTC",
  "CONCOR",
  "INDIGO",
  "ZOMATO",
  "NYKAA",
  "PAYTM",
  "NAUKRI",
  "POLICYBZR",
  "LAURUSLABS",
  "BIOCON",
  "LUPIN",
  "AUROPHARMA",
  "TORNTPHARM",
  "GLENMARK",
  "ZYDUSLIFE",
  "ALKEM",
  "MAXHEALTH",
  "FORTIS",
  "ASHOKLEY",
  "TVSMOTOR",
  "BAJAJ-AUTO",
  "MOTHERSON",
  "BOSCHLTD",
  "EXIDEIND",
  "TATACHEM",
  "UPL",
  "PIDILITIND",
  "SRF",
  "AARTIIND",
  "DEEPAKNTR",
  "GNFC",
  "PIIND",
  "INDUSTOWER",
  "IDEA",
  "TATACOMM",
  "OFSS",
  "MPHASIS",
  "PERSISTENT",
  "COFORGE",
  "LTTS",
  "KPITTECH",
  "PAGEIND",
  "TRENT",
  "DMART",
  "COLPAL",
  "DABUR",
  "MARICO",
  "GODREJCP",
  "UBL",
  "UNITDSPR",
  "AMBUJACEM",
  "ACC",
  "SHREECEM",
  "RAMCOCEM",
  "SAIL",
  "JINDALSTEL",
  "NMDC",
  "VEDL",
  "HINDCOPPER",
  "MANAPPURAM",
  "ABCAPITAL",
  "LICI",
  "IRB",
  "PNCINFRA",
];

const NIFTY_50 = [
  "RELIANCE",
  "HDFCBANK",
  "ICICIBANK",
  "INFY",
  "TCS",
  "LT",
  "ITC",
  "SBIN",
  "BHARTIARTL",
  "AXISBANK",
  "KOTAKBANK",
  "HINDUNILVR",
  "BAJFINANCE",
  "ASIANPAINT",
  "MARUTI",
  "SUNPHARMA",
  "TITAN",
  "ULTRACEMCO",
  "NTPC",
  "POWERGRID",
  "ONGC",
  "TATAMOTORS",
  "M&M",
  "JSWSTEEL",
  "TATASTEEL",
  "WIPRO",
  "TECHM",
  "HCLTECH",
  "COALINDIA",
  "ADANIENT",
  "ADANIPORTS",
  "BAJAJFINSV",
  "GRASIM",
  "HINDALCO",
  "NESTLEIND",
  "CIPLA",
  "DRREDDY",
  "DIVISLAB",
  "EICHERMOT",
  "HEROMOTOCO",
  "APOLLOHOSP",
  "BRITANNIA",
  "BPCL",
  "INDUSINDBK",
  "BAJAJ-AUTO",
  "TATACONSUM",
  "SHRIRAMFIN",
  "SBILIFE",
  "HDFCLIFE",
  "LTIM",
];

const MASTER_CACHE_TTL = 6 * 60 * 60 * 1000;

let cache = { loadedAt: null, instruments: [] };

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

function cleanName(value = "") {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSymbol(x = {}) {
  const segment = safeUpper(x.segment);
  const type = safeUpper(x.instrument_type);
  const tradingSymbol = safeUpper(x.trading_symbol || x.tradingsymbol || x.symbol || "")
    .replace(/-EQ$/i, "")
    .replace(/\s+EQ$/i, "")
    .trim();
  const underlyingSymbol = safeUpper(x.asset_symbol || x.underlying_symbol || "");
  const name = safeUpper(x.name || "");
  if (segment === "NSE_EQ" || type === "EQ") return tradingSymbol || underlyingSymbol || name;
  return underlyingSymbol || tradingSymbol || name;
}

function getSector(item = {}) {
  return cleanName(item.sector || item.industry || item.industry_name || item.sector_name || "");
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
  const searchQuery = search || clean || symbol;
  return {
    tvSymbol,
    tradingViewUrl: tvSymbol ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}` : "",
    tradingViewSearchUrl: `https://www.tradingview.com/symbols/search/?query=${encodeURIComponent(searchQuery)}&exchange=${encodeURIComponent(exchange)}`,
  };
}

function blankTradingView() {
  return { tvSymbol: "", tradingViewUrl: "", tradingViewSearchUrl: "" };
}

async function loadMaster(force = false) {
  if (!force && cache.instruments.length && cache.loadedAt && Date.now() - cache.loadedAt < MASTER_CACHE_TTL) return cache.instruments;

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

    if (!Array.isArray(parsed)) throw new Error("Invalid Upstox master format");

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
  const tv = buildTradingViewLinks(symbol, item.segment);
  return {
    symbol,
    underlyingSymbol: symbol,
    name: cleanName(item.name || symbol),
    sector: getSector(item),
    tradingSymbol: item.trading_symbol || symbol,
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
  return {
    symbol: `${underlyingSymbol} ${strike || ""} ${optionType}`.trim(),
    underlyingSymbol,
    name: cleanName(item.name || underlyingSymbol),
    sector: getSector(item),
    tradingSymbol: item.trading_symbol || `${underlyingSymbol}${strike}${optionType}`,
    instrumentKey: item.instrument_key,
    expiry: item.expiry || null,
    lotSize: item.lot_size || item.minimum_lot || 1,
    strike,
    optionType,
    instrumentType: item.instrument_type || "",
    segment: item.segment || "",
    exchange: getExchangePrefix(item.segment, underlyingSymbol),
    ...blankTradingView(),
  };
}

function sortByPriority(list = [], priority = []) {
  return list.sort((a, b) => {
    const ia = priority.indexOf(a.symbol);
    const ib = priority.indexOf(b.symbol);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return String(a.symbol).localeCompare(String(b.symbol));
  });
}

function pickNearestBySymbol(items = [], priority = []) {
  const grouped = new Map();

  for (const item of items) {
    const symbol = getSymbol(item);
    if (!symbol || !item.instrument_key) continue;

    const exp = expiryMs(item.expiry);
    const old = grouped.get(symbol);

    if (!old || (exp && exp < old.expiryMs)) {
      grouped.set(symbol, { ...baseInstrument(item), expiryMs: exp });
    }
  }

  return sortByPriority(
    Array.from(grouped.values()).map(({ expiryMs, ...rest }) => rest),
    priority
  );
}

function getNearestExpiryItems(items = []) {
  const now = Date.now();
  const valid = items.filter((x) => x.instrument_key && expiryMs(x.expiry) >= now);
  if (!valid.length) return [];
  valid.sort((a, b) => expiryMs(a.expiry) - expiryMs(b.expiry));
  const nearestExpiry = expiryMs(valid[0].expiry);
  return valid.filter((x) => expiryMs(x.expiry) === nearestExpiry);
}

function nearestStrike(strikes = [], target = 0) {
  if (!strikes.length || !target) return 0;
  return strikes.reduce((best, strike) => {
    if (!best) return strike;
    return Math.abs(strike - target) < Math.abs(best - target) ? strike : best;
  }, 0);
}

function pickFixedItmCePeOptions(items = [], underlyingSymbols = [], priceMap = {}) {
  const finalList = [];

  for (const symbol of underlyingSymbols) {
    const basePrice = Number(priceMap[symbol] || 0);
    const symbolOptions = items.filter((x) => getSymbol(x) === symbol);
    const nearest = getNearestExpiryItems(symbolOptions);
    if (!nearest.length) continue;

    const ces = nearest.filter((x) => safeUpper(x.instrument_type) === "CE");
    const pes = nearest.filter((x) => safeUpper(x.instrument_type) === "PE");

    const strikes = [...new Set(nearest.map((x) => Number(x.strike_price || 0)).filter(Boolean))].sort((a, b) => a - b);
    if (!strikes.length) continue;

    const ceTarget = basePrice ? basePrice - 200 : strikes[Math.floor(strikes.length / 2)];
    const peTarget = basePrice ? basePrice + 200 : strikes[Math.floor(strikes.length / 2)];

    const ceStrike = nearestStrike(strikes, ceTarget);
    const peStrike = nearestStrike(strikes, peTarget);

    const ce = ces.find((x) => Number(x.strike_price || 0) === ceStrike) || ces[0];
    const pe = pes.find((x) => Number(x.strike_price || 0) === peStrike) || pes[0];

    if (ce) finalList.push(ce);
    if (pe) finalList.push(pe);
  }

  return finalList;
}

async function loadInstrumentsByMarket(market = "future-stock", force = false, priceMap = {}) {
  market = normalizeMarket(market);

  const data = await loadMaster(force);
  const now = Date.now();

  if (!Array.isArray(data) || !data.length) return [];

  if (market === "future-stock") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      return safeUpper(x.segment) === "NSE_FO" && safeUpper(x.instrument_type).includes("FUT") && expiryMs(x.expiry) >= now && LIQUID_FNO_STOCKS.includes(symbol) && !INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestBySymbol(list, LIQUID_FNO_STOCKS);
  }

  if (market === "index-future") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      return isFoSegment(x) && safeUpper(x.instrument_type).includes("FUT") && expiryMs(x.expiry) >= now && INDEX_SYMBOLS.includes(symbol) && x.instrument_key;
    });

    return pickNearestBySymbol(list, INDEX_SYMBOLS);
  }

  if (market === "equity-stock") {
    return data
      .filter((x) => safeUpper(x.segment) === "NSE_EQ" && safeUpper(x.instrument_type) === "EQ" && x.instrument_key)
      .slice(0, 500)
      .map(baseInstrument);
  }

  if (market === "index-option") {
    const indexFutures = await loadInstrumentsByMarket("index-future", force);
    const symbols = indexFutures.map((x) => x.symbol).filter(Boolean);

    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      const type = safeUpper(x.instrument_type);
      return isFoSegment(x) && ["CE", "PE"].includes(type) && expiryMs(x.expiry) >= now && symbols.includes(symbol) && x.instrument_key;
    });

    return pickFixedItmCePeOptions(list, symbols, priceMap).map(optionInstrument);
  }

  if (market === "equity-stock-option") {
    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      const type = safeUpper(x.instrument_type);
      return safeUpper(x.segment) === "NSE_FO" && ["CE", "PE"].includes(type) && expiryMs(x.expiry) >= now && NIFTY_50.includes(symbol) && x.instrument_key;
    });

    return pickAtmCePeOptions(list, NIFTY_50).map(optionInstrument);
  }

  if (market === "future-stock-option") {
    const futureStocks = await loadInstrumentsByMarket("future-stock", force);
    const symbols = futureStocks.map((x) => x.symbol).filter(Boolean);

    const list = data.filter((x) => {
      const symbol = getSymbol(x);
      const type = safeUpper(x.instrument_type);
      return safeUpper(x.segment) === "NSE_FO" && ["CE", "PE"].includes(type) && expiryMs(x.expiry) >= now && symbols.includes(symbol) && x.instrument_key;
    });

    return pickFixedItmCePeOptions(list, symbols, priceMap).map(optionInstrument);
  }

  return loadInstrumentsByMarket("future-stock", force);
}

module.exports = {
  loadInstrumentsByMarket,
  loadStockFutures: () => loadInstrumentsByMarket("future-stock"),
  loadMaster,
  normalizeMarket,
};
