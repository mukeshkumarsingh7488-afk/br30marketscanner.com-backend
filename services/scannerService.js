const { getFullMarketQuotes } = require("./upstoxService");
const { loadInstrumentsByMarket } = require("./instrumentService");
const { getMarketData, isGlobalMarket, normalizeMarket: normalizeCacheMarket } = require("./marketCache");
const { num, signal, score } = require("../utils/marketLogic");

const SCANNER_CACHE = {};
const CACHE_TTL = 3000;

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

const chunk = (arr, size = 40) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

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

function filterIndexOptionATM(rows) {
  const finalRows = [];

  for (const index of INDEX_ORDER) {
    const indexRows = rows.filter((r) => r.underlyingSymbol === index);
    if (!indexRows.length) continue;

    const strikes = [...new Set(indexRows.map((r) => Number(r.strike || 0)).filter(Boolean))].sort((a, b) => a - b);
    const ceRows = indexRows.filter((r) => String(r.optionType).toUpperCase() === "CE");
    const peRows = indexRows.filter((r) => String(r.optionType).toUpperCase() === "PE");

    let atmStrike = strikes[Math.floor(strikes.length / 2)];

    const pairDiff = strikes
      .map((strike) => {
        const ce = ceRows.find((r) => Number(r.strike) === strike);
        const pe = peRows.find((r) => Number(r.strike) === strike);
        return { strike, diff: ce && pe ? Math.abs(Number(ce.ltp || 0) - Number(pe.ltp || 0)) : Infinity };
      })
      .sort((a, b) => a.diff - b.diff);

    if (pairDiff[0] && pairDiff[0].diff !== Infinity) atmStrike = pairDiff[0].strike;

    const lower = strikes.filter((s) => s < atmStrike).slice(-9);
    const upper = strikes.filter((s) => s > atmStrike).slice(0, 10);
    const selectedStrikes = [...lower, atmStrike, ...upper].slice(0, 20);

    for (const strike of selectedStrikes) {
      const pe = peRows.find((r) => Number(r.strike) === strike);
      const ce = ceRows.find((r) => Number(r.strike) === strike);
      if (pe) finalRows.push(pe);
      if (ce) finalRows.push(ce);
    }
  }

  return finalRows;
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
      return s.includes("buy") || s.includes("long") || s.includes("top gainer");
    });
  }

  if (t === "sell") {
    return rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return s.includes("sell") || s.includes("short") || s.includes("top loser");
    });
  }

  return rows;
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

  return rows.sort((a, b) => num(b.score) - num(a.score));
}

async function buildScanner(type = "all", market = "future-stock") {
  market = normalizeMarket(market);

  if (isGlobalMarket(market)) {
    return buildGlobalScanner(type, market);
  }

  const cacheKey = `${market}-${type}`;
  const ttl = CACHE_TTL;

  if (SCANNER_CACHE[cacheKey] && Date.now() - SCANNER_CACHE[cacheKey].time < ttl) {
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

  let rows = instruments.map((stock) => {
    const q = getQuoteObject(quotes, stock.instrumentKey, stock.tradingSymbol);
    const ltp = num(q.last_price);
    const netChange = num(q.net_change);
    const volume = num(q.volume);
    const oi = num(q.oi);
    const oiDayLow = num(q.oi_day_low);
    const move = calcMovePercent(ltp, netChange);
    const oiChangePercent = calcOiChangePercent(oi, oiDayLow);
    const volX = volume > 0 ? 1 : 0;

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
      signal: signal(move, oiChangePercent, volX),
      score: score(move, oiChangePercent, volX),
      updatedAt: safeNow(),
    });
  });

  rows = rows.filter((r) => r.ltp > 0);

  if (market === "index-option") rows = filterIndexOptionATM(rows);

  rows = applyTypeFilter(rows, type);

  const result = market === "index-option" ? rows : rows.sort((a, b) => num(b.score) - num(a.score));

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
      return s.includes("buy") || s.includes("long") || s.includes("top gainer");
    }).length,
    sellSignals: rows.filter((r) => {
      const s = String(r.signal || "").toLowerCase();
      return s.includes("sell") || s.includes("short") || s.includes("top loser");
    }).length,
  };
}

module.exports = {
  buildScanner,
  getSummary,
  normalizeMarket,
  withTradingView,
};
