const { getFullMarketQuotes } = require("./upstoxService");
const { loadInstrumentsByMarket } = require("./instrumentService");
const { getMarketData, isGlobalMarket, normalizeMarket: normalizeCacheMarket } = require("./marketCache");
const { num, signal, score } = require("../utils/marketLogic");

const SCANNER_CACHE = {};
const CACHE_TTL = 10000;
const EQUITY_MIN_VOLUME = 2000000;

const OPTION_MARKETS = ["index-option", "equity-stock-option", "future-stock-option"];

const MARKET_ALIASES = {
  forex: "forex-majors",
  "forex-major": "forex-majors",
  "forex-majors": "forex-majors",
  crypto: "crypto-futures",
  "crypto-future": "crypto-futures",
  "crypto-futures": "crypto-futures",
  "crypto-option": "crypto-options",
  "crypto-options": "crypto-options",
  options: "crypto-options",
  global: "global-index",
  "global-index": "global-index",
  "us-stock": "us-stocks",
  "us-stocks": "us-stocks",
  "us-etf": "us-etfs",
  "us-etfs": "us-etfs",
  metals: "metals",
  commodities: "commodities",
  "forex-cross": "forex-cross",
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

const chunk = (arr, size = 80) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

function normalizeMarket(market = "future-stock") {
  const key = String(market || "future-stock")
    .trim()
    .toLowerCase();
  return MARKET_ALIASES[key] || key;
}

function isOptionMarket(market = "") {
  return OPTION_MARKETS.includes(normalizeMarket(market));
}

function safeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function cleanSymbol(value = "") {
  return String(value || "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
}

function safeTradingViewSymbol(row = {}) {
  const market = normalizeMarket(row.market);
  if (isOptionMarket(market)) return "";
  if (row.tvSymbol) return row.tvSymbol;

  const symbol = cleanSymbol(row.underlyingSymbol || row.symbol || row.tradingSymbol);
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

  if (market === "future-stock" || market === "equity-stock" || market === "index-future") {
    if (["SENSEX", "BANKEX"].includes(symbol)) return `BSE:${symbol}`;
    return `NSE:${symbol}`;
  }

  return symbol;
}

function withTradingView(row = {}) {
  const market = normalizeMarket(row.market);

  if (isOptionMarket(market)) {
    return { ...row, tvSymbol: "", tradingViewUrl: "", tradingViewSearchUrl: "" };
  }

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

  for (const part of chunk(keys, 80)) {
    try {
      const q = await getFullMarketQuotes(part);
      finalQuotes = { ...finalQuotes, ...(q || {}) };
    } catch (err) {
      console.log("UPSTOX QUOTE CHUNK ERROR =>", err.message);
    }
  }

  return finalQuotes;
}

function getEquitySignal(move, volume) {
  if (move >= 2 && volume >= EQUITY_MIN_VOLUME) return "BUY";
  if (move <= -2 && volume >= EQUITY_MIN_VOLUME) return "SELL";
  if (move >= 2) return "Top Gainer";
  if (move <= -2) return "Top Loser";
  return "WAIT";
}

function getEquityScore(move, volume) {
  const volumeBoost = volume >= EQUITY_MIN_VOLUME ? 5 : 0;
  return Number((Math.abs(move) + volumeBoost).toFixed(2));
}

function getMoveOnlySignal(move, buyLevel = 1, watchLevel = 0.5) {
  if (move >= buyLevel) return "BUY";
  if (move <= -buyLevel) return "SELL";
  if (move >= watchLevel) return "WATCH BUY";
  if (move <= -watchLevel) return "WATCH SELL";
  return "WAIT";
}

function getMoveOnlyScore(move) {
  return Number(Math.abs(move).toFixed(2));
}

function getFinalSignal(market, move, oiChangePercent, volumeRatio, volume, fundingRate = 0) {
  market = normalizeMarket(market);

  if (market === "equity-stock") return getEquitySignal(move, volume);

  if (market === "crypto-futures" || market === "crypto-options") {
    if (move >= 2 && oiChangePercent >= 7 && fundingRate > 0) return "BUY Long Build-Up";
    if (move <= -2 && oiChangePercent >= 7 && fundingRate < 0) return "SELL Short Build-Up";
    if (move >= 2) return "Top Gainer";
    if (move <= -2) return "Top Loser";
    return "WAIT Watchlist";
  }

  if (market === "forex-majors" || market === "forex-cross" || market === "metals") {
    return getMoveOnlySignal(move, 1, 0.5);
  }

  if (market === "commodities") {
    return getMoveOnlySignal(move, 1.5, 0.75);
  }

  if (market === "global-index" || market === "us-stocks" || market === "us-etfs") {
    return getMoveOnlySignal(move, 2, 1);
  }

  return signal(move, oiChangePercent, volumeRatio);
}

function getFinalScore(market, move, oiChangePercent, volumeRatio, volume) {
  market = normalizeMarket(market);

  if (market === "equity-stock") return getEquityScore(move, volume);

  if (market === "crypto-futures" || market === "crypto-options" || market === "forex-majors" || market === "forex-cross" || market === "metals" || market === "commodities" || market === "global-index" || market === "us-stocks" || market === "us-etfs") {
    return getMoveOnlyScore(move);
  }

  return score(move, oiChangePercent, volumeRatio);
}

function applyTypeFilter(rows, type) {
  const t = String(type || "all").toLowerCase();

  if (t === "all" || t === "allstocks") return rows;
  if (t === "gainers") return rows.filter((r) => num(r.changePercent) > 0);
  if (t === "losers") return rows.filter((r) => num(r.changePercent) < 0);
  if (t === "oi") return rows.filter((r) => Math.abs(num(r.oiChangePercent)) >= 7);
  if (t === "volume") return rows.filter((r) => num(r.volumeRatio) >= 2 || num(r.volume) > 0);

  if (t === "buy" || t === "long" || t === "stronglong" || t === "shortcover") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      if (t === "stronglong") return s.includes("strong") && (s.includes("buy") || s.includes("long"));
      if (t === "shortcover") return s.includes("short covering");
      return s === "buy" || s.includes("watch buy") || s.includes("long build") || s.includes("short covering");
    });
  }

  if (t === "sell" || t === "short" || t === "strongshort" || t === "longunwind") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      if (t === "strongshort") return s.includes("strong") && (s.includes("sell") || s.includes("short"));
      if (t === "longunwind") return s.includes("long unwinding");
      return s === "sell" || s.includes("watch sell") || s.includes("short build") || s.includes("long unwinding");
    });
  }

  return rows;
}

function sortOptionRows(rows = []) {
  return rows.sort((a, b) => {
    const ua = String(a.underlyingSymbol || a.symbol || "");
    const ub = String(b.underlyingSymbol || b.symbol || "");
    const typeOrder = { CE: 1, PE: 2 };
    return ua.localeCompare(ub) || Number(a.strike || 0) - Number(b.strike || 0) || (typeOrder[String(a.optionType || "").toUpperCase()] || 9) - (typeOrder[String(b.optionType || "").toUpperCase()] || 9);
  });
}

function sortNormalRows(rows = []) {
  return rows.sort((a, b) => num(b.score) - num(a.score));
}

function normalizeRows(rows = [], market = "future-stock") {
  market = normalizeMarket(market);

  return rows
    .filter((r) => num(r.ltp) > 0)
    .map((r) => {
      const move = num(r.changePercent);
      const oiChangePercent = num(r.oiChangePercent);
      const volume = num(r.volume);
      const volumeRatio = num(r.volumeRatio) || (volume > 0 ? 1 : 0);
      const fundingRate = num(r.fundingRate);
      const finalSignal = r.signal || getFinalSignal(market, move, oiChangePercent, volumeRatio, volume, fundingRate);
      const finalScore = Number.isFinite(Number(r.score)) ? Number(r.score) : getFinalScore(market, move, oiChangePercent, volumeRatio, volume);

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
        fundingRate,
        signal: finalSignal,
        score: finalScore,
        updatedAt: r.updatedAt || safeNow(),
      });
    });
}

async function buildGlobalScanner(type = "all", market = "crypto-futures") {
  market = normalizeCacheMarket(market);

  let rows = getMarketData(market);
  rows = normalizeRows(rows, market);
  rows = applyTypeFilter(rows, type);

  return sortNormalRows(rows);
}

async function buildScanner(type = "all", market = "future-stock") {
  market = normalizeMarket(market);

  if (isGlobalMarket(market)) return buildGlobalScanner(type, market);

  const cacheKey = `${market}-${type}`;

  if (SCANNER_CACHE[cacheKey] && Date.now() - SCANNER_CACHE[cacheKey].time < CACHE_TTL) {
    return SCANNER_CACHE[cacheKey].data;
  }

  let instruments = [];
  let priceMap = {};

  try {
    if (["index-option", "equity-stock-option", "future-stock-option"].includes(market)) {
      const baseMarket = market === "index-option" ? "index-future" : "future-stock";
      const baseInstruments = await loadInstrumentsByMarket(baseMarket);
      const baseKeys = baseInstruments.map((s) => s.instrumentKey).filter(Boolean);
      const baseQuotes = await getQuotesSafe(baseKeys);

      priceMap = baseInstruments.reduce((acc, item) => {
        const q = getQuoteObject(baseQuotes, item.instrumentKey, item.tradingSymbol);
        const ltp = num(q.last_price);
        if (item.symbol && ltp > 0) acc[item.symbol] = ltp;
        return acc;
      }, {});
    }

    instruments = await loadInstrumentsByMarket(market, false, priceMap);
  } catch (err) {
    console.log(`LOAD INSTRUMENTS ERROR [${market}] =>`, err.message);
    instruments = [];
  }

  const instrumentKeys = instruments.map((s) => s.instrumentKey).filter(Boolean);
  const quotes = await getQuotesSafe(instrumentKeys);

  let rows = instruments.map((stock) => {
    const q = getQuoteObject(quotes, stock.instrumentKey, stock.tradingSymbol);

    const ltp = num(q.last_price);
    const netChange = num(q.net_change);
    const volume = num(q.volume);
    const oi = num(q.oi);
    const oiDayLow = num(q.oi_day_low);
    const fundingRate = num(q.fundingRate || q.funding_rate || stock.fundingRate);
    const move = calcMovePercent(ltp, netChange);
    const oiChangePercent = calcOiChangePercent(oi, oiDayLow);
    const volumeRatio = volume > 0 ? 1 : 0;
    const finalSignal = getFinalSignal(market, move, oiChangePercent, volumeRatio, volume, fundingRate);
    const finalScore = getFinalScore(market, move, oiChangePercent, volumeRatio, volume);

    return withTradingView({
      market,
      symbol: stock.symbol,
      name: stock.name || "",
      sector: stock.sector || "",
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
      volumeRatio,
      fundingRate,
      signal: finalSignal,
      score: finalScore,
      updatedAt: safeNow(),
    });
  });

  rows = rows.filter((r) => r.ltp > 0);
  rows = applyTypeFilter(rows, type);

  const result = isOptionMarket(market) ? sortOptionRows(rows) : sortNormalRows(rows);

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
    buySignals: rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return s === "buy" || s.includes("watch buy") || s.includes("long build") || s.includes("short covering");
    }).length,
    sellSignals: rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return s === "sell" || s.includes("watch sell") || s.includes("short build") || s.includes("long unwinding");
    }).length,
  };
}

module.exports = {
  buildScanner,
  getSummary,
  normalizeMarket,
  withTradingView,
};
