const { getFullMarketQuotes } = require("./upstoxService");
const { loadInstrumentsByMarket } = require("./instrumentService");
const { getMarketData, isGlobalMarket, normalizeMarket: normalizeCacheMarket } = require("./marketCache");
const { num, signal, score } = require("../utils/marketLogic");

const SCANNER_CACHE = {};
const CACHE_TTL = Number(process.env.SCANNER_CACHE_TTL || 3000);
const QUOTE_CHUNK_SIZE = Number(process.env.UPSTOX_QUOTE_CHUNK_SIZE || 50);
const EQUITY_MIN_VOLUME = Number(process.env.EQUITY_MIN_VOLUME || 2000000);

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
  if (market === "us-stocks") return row.exchange ? `${row.exchange}:${symbol}` : `NASDAQ:${symbol}`;
  if (market === "us-etfs") return row.exchange ? `${row.exchange}:${symbol}` : `AMEX:${symbol}`;
  if (["SENSEX", "BANKEX"].includes(symbol)) return `BSE:${symbol}`;
  return `NSE:${symbol}`;
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

function getScannerSignal(market, move, oiChangePercent, volumeRatio, volume) {
  if (market === "equity-stock") {
    if (move >= 2 && volume >= EQUITY_MIN_VOLUME) return "BUY";
    if (move <= -2 && volume >= EQUITY_MIN_VOLUME) return "SELL";
    if (move > 0) return "Top Gainer";
    if (move < 0) return "Top Loser";
    return "WAIT";
  }

  const s = signal(move, oiChangePercent, volumeRatio);
  const sl = String(s || "").toLowerCase();

  if (sl.includes("top gainer")) return "Top Gainer";
  if (sl.includes("top loser")) return "Top Loser";

  return s || "WAIT";
}

function getScannerScore(market, move, oiChangePercent, volumeRatio, volume) {
  if (market === "equity-stock") {
    const volScore = volume >= EQUITY_MIN_VOLUME ? 5 : 0;
    return Number((Math.abs(move) + volScore).toFixed(2));
  }

  return score(move, oiChangePercent, volumeRatio);
}

function normalizeRows(rows = [], market = "future-stock") {
  return rows
    .filter((r) => num(r.ltp) > 0)
    .map((r) => {
      const move = num(r.changePercent);
      const oiChangePercent = num(r.oiChangePercent);
      const volume = num(r.volume);
      const volumeRatio = num(r.volumeRatio) || (volume > 0 ? 1 : 0);
      const finalSignal = r.signal || getScannerSignal(market, move, oiChangePercent, volumeRatio, volume);
      const finalScore = Number.isFinite(Number(r.score)) ? Number(r.score) : getScannerScore(market, move, oiChangePercent, volumeRatio, volume);

      return withTradingView({
        market,
        ...r,
        ltp: num(r.ltp),
        changePercent: move,
        oi: num(r.oi),
        oiDayLow: num(r.oiDayLow),
        oiChangePercent,
        volume,
        volumeRatio,
        signal: finalSignal,
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
      return s === "buy" || s.includes("long build") || s.includes("short covering");
    });
  }

  if (t === "sell") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return s === "sell" || s.includes("short build") || s.includes("long unwinding");
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
  const finalSignal = getScannerSignal(market, move, oiChangePercent, volX, volume);

  return withTradingView({
    market,
    symbol: stock.symbol,
    underlyingSymbol: stock.underlyingSymbol || stock.symbol,
    tradingSymbol: stock.tradingSymbol,
    instrumentKey: stock.instrumentKey,
    tvSymbol: stock.tvSymbol,
    tradingViewUrl: stock.tradingViewUrl,
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
    score: getScannerScore(market, move, oiChangePercent, volX, volume),
    updatedAt: safeNow(),
  });
}

function sortByScore(rows = []) {
  return [...rows].sort((a, b) => num(b.score) - num(a.score) || num(b.volume) - num(a.volume));
}

function sortByVolumeThenScore(rows = []) {
  return [...rows].sort((a, b) => num(b.volume) - num(a.volume) || num(b.score) - num(a.score));
}

function groupOptionRows(rows = []) {
  return [...rows].sort((a, b) => {
    const sym = String(a.underlyingSymbol || a.symbol).localeCompare(String(b.underlyingSymbol || b.symbol));
    if (sym !== 0) return sym;

    const sa = num(a.strike);
    const sb = num(b.strike);
    if (sa !== sb) return sa - sb;

    if (a.optionType === "PE" && b.optionType === "CE") return -1;
    if (a.optionType === "CE" && b.optionType === "PE") return 1;
    return 0;
  });
}

async function buildGlobalScanner(type = "all", market = "crypto-futures") {
  market = normalizeCacheMarket(market);

  let rows = getMarketData(market);
  rows = normalizeRows(rows, market);
  rows = applyTypeFilter(rows, type);

  return rows.sort((a, b) => num(b.score) - num(a.score));
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

  let instruments = [];

  try {
    instruments = await loadInstrumentsByMarket(market);
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

  rows = applyTypeFilter(rows, type);

  let result;

  if (market === "index-option" || market === "equity-stock-option" || market === "future-stock-option") {
    result = groupOptionRows(rows);
  } else if (market === "equity-stock" || market === "future-stock") {
    result = sortByVolumeThenScore(rows);
  } else {
    result = sortByScore(rows);
  }

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
    buySignals: rows.filter(
      (r) =>
        String(r.signal || "").toLowerCase() === "buy" ||
        String(r.signal || "")
          .toLowerCase()
          .includes("long build") ||
        String(r.signal || "")
          .toLowerCase()
          .includes("short covering")
    ).length,
    sellSignals: rows.filter(
      (r) =>
        String(r.signal || "").toLowerCase() === "sell" ||
        String(r.signal || "")
          .toLowerCase()
          .includes("short build") ||
        String(r.signal || "")
          .toLowerCase()
          .includes("long unwinding")
    ).length,
  };
}

module.exports = {
  buildScanner,
  getSummary,
  normalizeMarket,
  withTradingView,
};
