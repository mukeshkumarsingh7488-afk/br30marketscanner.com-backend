const { getFullMarketQuotes } = require("./upstoxService");
const { loadInstrumentsByMarket } = require("./instrumentService");
const { getMarketData, isGlobalMarket, normalizeMarket: normalizeCacheMarket } = require("./marketCache");
const { num, signal, score } = require("../utils/marketLogic");

const SCANNER_CACHE = {};
const BASE_SYMBOL_CACHE = {};
const CACHE_TTL = Number(process.env.SCANNER_CACHE_TTL || 3000);
const QUOTE_CHUNK_SIZE = Number(process.env.UPSTOX_QUOTE_CHUNK_SIZE || 50);

const EQUITY_ACTIVE_LIMIT = Number(process.env.EQUITY_ACTIVE_LIMIT || 250);
const FUTURE_ACTIVE_LIMIT = Number(process.env.FUTURE_ACTIVE_LIMIT || 200);
const OPTION_BASE_SYMBOL_LIMIT = Number(process.env.OPTION_BASE_SYMBOL_LIMIT || 80);

const INDEX_ORDER = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "SENSEX", "BANKEX"];

const MARKET_ALIASES = {
  forex: "forex-majors",
  "forex-major": "forex-majors",
  "forex-majors": "forex-majors",
  crypto: "crypto-futures",
  "crypto-future": "crypto-futures",
  "crypto-futures": "crypto-futures",
  global: "global-index",
  "global-index": "global-index",
  "us-stock": "us-stocks",
  "us-stocks": "us-stocks",
  "us-etf": "us-etfs",
  "us-etfs": "us-etfs",
  metals: "metals",
  commodities: "commodities",
  "forex-cross": "forex-cross",
};

const chunk = (arr = [], size = 50) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

function normalizeMarket(market = "future-stock") {
  const key = String(market || "future-stock")
    .trim()
    .toLowerCase();
  return MARKET_ALIASES[key] || key;
}

function safeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function safeTradingViewSymbol(row = {}) {
  if (row.tvSymbol) return row.tvSymbol;

  const market = normalizeMarket(row.market);
  const symbol = String(row.symbol || row.tradingSymbol || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  if (!symbol) return "";

  if (market === "crypto-futures") return `BYBIT:${symbol}.P`;
  if (market === "forex-majors" || market === "forex-cross") return `FX:${symbol}`;

  if (market === "metals") {
    if (symbol.includes("XAU")) return "OANDA:XAUUSD";
    if (symbol.includes("XAG")) return "OANDA:XAGUSD";
    if (symbol.includes("XPT")) return "OANDA:XPTUSD";
    if (symbol.includes("XPD")) return "OANDA:XPDUSD";
    return `OANDA:${symbol}`;
  }

  if (market === "us-stocks") return row.exchange ? `${row.exchange}:${symbol}` : `NASDAQ:${symbol}`;
  if (market === "us-etfs") return row.exchange ? `${row.exchange}:${symbol}` : `AMEX:${symbol}`;

  if (market === "index-option" || market === "future-stock" || market === "equity-stock" || market === "index-future") {
    if (["SENSEX", "BANKEX"].includes(symbol)) return `BSE:${symbol}`;
    return `NSE:${symbol}`;
  }

  return symbol;
}

function withTradingView(row = {}) {
  const tvSymbol = safeTradingViewSymbol(row);
  return {
    ...row,
    tvSymbol,
    tradingViewUrl: row.tradingViewUrl || (tvSymbol ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}` : ""),
  };
}

function calcMovePercent(ltp, netChange) {
  ltp = num(ltp);
  netChange = num(netChange);
  const prevClose = ltp - netChange;
  if (!ltp || !prevClose) return 0;
  return Number(((netChange / prevClose) * 100).toFixed(2));
}

function calcOiChangePercent(currentOi, oiDayLow) {
  currentOi = num(currentOi);
  oiDayLow = num(oiDayLow);
  if (!currentOi || !oiDayLow) return 0;
  return Number((((currentOi - oiDayLow) / oiDayLow) * 100).toFixed(2));
}

function getQuoteObject(quotes, instrumentKey, tradingSymbol) {
  return Object.values(quotes || {}).find((q) => q.instrument_token === instrumentKey) || quotes?.[instrumentKey] || quotes?.[`NSE_FO:${tradingSymbol}`] || quotes?.[`BSE_FO:${tradingSymbol}`] || quotes?.[`NSE_EQ:${tradingSymbol}`] || {};
}

async function getQuotesSafe(keys = []) {
  let finalQuotes = {};

  for (const part of chunk(keys, QUOTE_CHUNK_SIZE)) {
    try {
      const q = await getFullMarketQuotes(part);
      finalQuotes = { ...finalQuotes, ...(q || {}) };
    } catch (err) {
      console.log("UPSTOX QUOTE CHUNK ERROR =>", err.message);
    }
  }

  return finalQuotes;
}

function getBaseExitSignal(signalValue = "") {
  const s = String(signalValue || "").toLowerCase();

  if (s.includes("top gainer") || s.includes("top loser")) return "WAIT";
  if (s.includes("long build-up") || s.includes("strong long") || s.includes("short covering")) return "HOLD BUY";
  if (s.includes("short build-up") || s.includes("strong short") || s.includes("long unwinding")) return "HOLD SELL";

  return "WAIT";
}

async function attachExitSignals(rows = []) {
  return rows.map((r) => ({
    ...r,
    exitSignal: getBaseExitSignal(r.signal),
  }));
}

function normalizeRows(rows = [], market = "future-stock") {
  return rows
    .filter((r) => num(r.ltp) > 0)
    .map((r) => {
      const move = num(r.changePercent);
      const oiChangePercent = num(r.oiChangePercent);
      const volumeRatio = num(r.volumeRatio) || (num(r.volume) > 0 ? 1 : 0);
      const finalSignal = r.signal || signal(move, oiChangePercent, volumeRatio);
      const finalScore = Number.isFinite(Number(r.score)) ? Number(r.score) : score(move, oiChangePercent, volumeRatio);

      return withTradingView({
        market,
        ...r,
        ltp: num(r.ltp),
        changePercent: move,
        oi: num(r.oi),
        oiDayLow: num(r.oiDayLow),
        oiChangePercent,
        volume: num(r.volume),
        volumeRatio,
        signal: finalSignal,
        exitSignal: r.exitSignal || getBaseExitSignal(finalSignal),
        score: finalScore,
        updatedAt: r.updatedAt || safeNow(),
      });
    });
}

function applyTypeFilter(rows, type) {
  const t = String(type || "all").toLowerCase();

  if (t === "gainers") return rows.filter((r) => num(r.changePercent) > 0);
  if (t === "losers") return rows.filter((r) => num(r.changePercent) < 0);
  if (t === "oi") return rows.filter((r) => Math.abs(num(r.oiChangePercent)) >= 7);
  if (t === "volume") return rows.filter((r) => num(r.volumeRatio) >= 2 || num(r.volume) > 0);

  if (t === "buy") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return !s.includes("top gainer") && (s.includes("buy") || s.includes("long") || s.includes("short covering"));
    });
  }

  if (t === "sell") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return !s.includes("top loser") && (s.includes("sell") || s.includes("short") || s.includes("long unwinding"));
    });
  }

  return rows;
}

function calcRow(stock, quote, market) {
  const ltp = num(quote.last_price);
  const netChange = num(quote.net_change);
  const volume = num(quote.volume);
  const oi = num(quote.oi);
  const oiDayLow = num(quote.oi_day_low);
  const move = calcMovePercent(ltp, netChange);
  const oiChangePercent = calcOiChangePercent(oi, oiDayLow);
  const volX = volume > 0 ? 1 : 0;
  const finalSignal = signal(move, oiChangePercent, volX);

  return withTradingView({
    market,
    symbol: stock.symbol,
    underlyingSymbol: stock.underlyingSymbol || stock.symbol,
    tradingSymbol: stock.tradingSymbol,
    instrumentKey: stock.instrumentKey,
    tvSymbol: stock.tvSymbol,
    tradingViewUrl: stock.tradingViewUrl,
    tradingViewSearchUrl: stock.tradingViewSearchUrl,
    expiry: stock.expiry,
    lotSize: stock.lotSize,
    strike: Number(stock.strike || 0),
    optionType: String(stock.optionType || "").toUpperCase(),
    ltp,
    changePercent: move,
    oi,
    oiDayLow,
    oiChangePercent,
    volume,
    volumeRatio: volX,
    signal: finalSignal,
    exitSignal: getBaseExitSignal(finalSignal),
    score: score(move, oiChangePercent, volX),
    updatedAt: safeNow(),
  });
}

function sortByVolumeThenScore(rows = []) {
  return [...rows].sort((a, b) => num(b.volume) - num(a.volume) || num(b.score) - num(a.score) || Math.abs(num(b.changePercent)) - Math.abs(num(a.changePercent)));
}

function sortByScore(rows = []) {
  return [...rows].sort((a, b) => num(b.score) - num(a.score) || num(b.volume) - num(a.volume));
}

function groupOptionRows(rows = []) {
  return [...rows].sort((a, b) => {
    const sym = String(a.underlyingSymbol || a.symbol).localeCompare(String(b.underlyingSymbol || b.symbol));
    if (sym !== 0) return sym;

    const ea = new Date(a.expiry || 0).getTime();
    const eb = new Date(b.expiry || 0).getTime();
    if (ea !== eb) return ea - eb;

    const sa = num(a.strike);
    const sb = num(b.strike);
    if (sa !== sb) return sa - sb;

    const oa = String(a.optionType || "");
    const ob = String(b.optionType || "");
    if (oa === "PE" && ob === "CE") return -1;
    if (oa === "CE" && ob === "PE") return 1;
    return oa.localeCompare(ob);
  });
}

function getTopBaseSymbols(rows = [], limit = OPTION_BASE_SYMBOL_LIMIT) {
  return sortByVolumeThenScore(rows)
    .filter((r) => r.symbol && num(r.ltp) > 0)
    .slice(0, limit)
    .map((r) => r.symbol);
}

function saveBaseSymbols(key, rows = [], limit = OPTION_BASE_SYMBOL_LIMIT) {
  const symbols = getTopBaseSymbols(rows, limit);
  if (symbols.length) {
    BASE_SYMBOL_CACHE[key] = {
      time: Date.now(),
      symbols,
    };
  }
  return symbols;
}

function getCachedBaseSymbols(key) {
  const item = BASE_SYMBOL_CACHE[key];
  if (!item || !Array.isArray(item.symbols) || !item.symbols.length) return [];
  return item.symbols;
}

async function buildGlobalScanner(type = "all", market = "crypto-futures") {
  market = normalizeCacheMarket(market);

  let rows = getMarketData(market);

  rows = normalizeRows(rows, market);
  rows = applyTypeFilter(rows, type);

  return rows.sort((a, b) => num(b.score) - num(a.score));
}

async function buildIndianRows(market = "future-stock", options = {}) {
  let instruments = [];

  try {
    instruments = await loadInstrumentsByMarket(market, false, options);
  } catch (err) {
    console.log(`LOAD INSTRUMENTS ERROR [${market}] =>`, err.message);
    instruments = [];
  }

  const instrumentKeys = instruments.map((s) => s.instrumentKey).filter(Boolean);
  const quotes = await getQuotesSafe(instrumentKeys);

  let rows = instruments
    .map((stock) => {
      const q = getQuoteObject(quotes, stock.instrumentKey, stock.tradingSymbol);
      return calcRow(stock, q, market);
    })
    .filter((r) => r.ltp > 0);

  rows = await attachExitSignals(rows);

  return rows;
}

async function buildBaseMarketAndSymbols(baseMarket, activeLimit) {
  const baseRows = await buildIndianRows(baseMarket);
  const sorted = sortByVolumeThenScore(baseRows).slice(0, activeLimit);
  const symbols = saveBaseSymbols(baseMarket, sorted, OPTION_BASE_SYMBOL_LIMIT);
  return { rows: sorted, symbols };
}

async function buildScanner(type = "all", market = "future-stock") {
  market = normalizeMarket(market);

  if (isGlobalMarket(market)) {
    return buildGlobalScanner(type, market);
  }

  const cacheKey = `${market}-${type}`;

  if (SCANNER_CACHE[cacheKey] && Date.now() - SCANNER_CACHE[cacheKey].time < CACHE_TTL) {
    return SCANNER_CACHE[cacheKey].data;
  }

  let result = [];

  if (market === "equity-stock") {
    const { rows } = await buildBaseMarketAndSymbols("equity-stock", EQUITY_ACTIVE_LIMIT);
    result = sortByVolumeThenScore(rows);
  } else if (market === "future-stock") {
    const { rows } = await buildBaseMarketAndSymbols("future-stock", FUTURE_ACTIVE_LIMIT);
    result = sortByVolumeThenScore(rows);
  } else if (market === "equity-stock-option") {
    let baseSymbols = getCachedBaseSymbols("equity-stock");
    if (!baseSymbols.length) {
      const base = await buildBaseMarketAndSymbols("equity-stock", EQUITY_ACTIVE_LIMIT);
      baseSymbols = base.symbols;
    }

    const rows = await buildIndianRows("equity-stock-option", { baseSymbols });
    result = groupOptionRows(rows);
  } else if (market === "future-stock-option") {
    let baseSymbols = getCachedBaseSymbols("future-stock");
    if (!baseSymbols.length) {
      const base = await buildBaseMarketAndSymbols("future-stock", FUTURE_ACTIVE_LIMIT);
      baseSymbols = base.symbols;
    }

    const rows = await buildIndianRows("future-stock-option", { baseSymbols });
    result = groupOptionRows(rows);
  } else if (market === "index-future") {
    const rows = await buildIndianRows("index-future");
    result = INDEX_ORDER.map((sym) => rows.find((r) => r.symbol === sym)).filter(Boolean);
  } else if (market === "index-option") {
    const rows = await buildIndianRows("index-option");
    result = groupOptionRows(rows);
  } else {
    const rows = await buildIndianRows(market);
    result = sortByScore(rows);
  }

  result = applyTypeFilter(result, type);

  SCANNER_CACHE[cacheKey] = {
    time: Date.now(),
    data: result,
  };

  return result;
}

async function getSummary(market = "future-stock") {
  market = normalizeMarket(market);

  const rows = await buildScanner("all", market);

  return {
    totalStocks: rows.length,
    gainers: rows.filter((r) => num(r.changePercent) > 0).length,
    losers: rows.filter((r) => num(r.changePercent) < 0).length,
    oiSignals: rows.filter((r) => Math.abs(num(r.oiChangePercent)) >= 7).length,
    buySignals: rows.filter((r) => ["HOLD BUY"].includes(getBaseExitSignal(r.signal))).length,
    sellSignals: rows.filter((r) => ["HOLD SELL"].includes(getBaseExitSignal(r.signal))).length,
  };
}

module.exports = {
  buildScanner,
  getSummary,
  normalizeMarket,
  withTradingView,
};
