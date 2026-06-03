const { getFullMarketQuotes } = require("./upstoxService");
const { loadInstrumentsByMarket } = require("./instrumentService");
const { getCryptoFuturesRows } = require("./binanceService");
const { getYahooRows } = require("./yahooService");
const { num, signal, score } = require("../utils/marketLogic");

const SCANNER_CACHE = {};
const CACHE_TTL = 3000;
const YAHOO_CACHE_TTL = 60000;
const CRYPTO_CACHE_TTL = 30000;

const INDEX_ORDER = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "SENSEX", "BANKEX"];
const MULTI_ASSET_MARKETS = ["crypto-futures", "forex", "forex-cross", "metals", "commodities", "global-index", "us-stocks", "us-etfs"];

const chunk = (arr, size = 40) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

function getCacheTtl(market) {
  if (market === "crypto-futures") return CRYPTO_CACHE_TTL;
  if (["forex", "forex-cross", "metals", "commodities", "global-index", "us-stocks", "us-etfs"].includes(market)) return YAHOO_CACHE_TTL;
  return CACHE_TTL;
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
    const q = await getFullMarketQuotes(part);
    finalQuotes = { ...finalQuotes, ...(q || {}) };
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
  if (type === "gainers") return rows.filter((r) => r.changePercent >= 2 || r.changePercent > 0);
  if (type === "losers") return rows.filter((r) => r.changePercent <= -2 || r.changePercent < 0);
  if (type === "oi") return rows.filter((r) => Math.abs(r.oiChangePercent) >= 7);
  if (type === "volume") return rows.filter((r) => r.volumeRatio >= 2 || r.volume > 0);
  return rows;
}

async function buildMultiAssetScanner(type = "all", market = "crypto-futures") {
  let rows = [];

  if (market === "crypto-futures") rows = await getCryptoFuturesRows();

  if (["forex", "forex-cross", "metals", "commodities", "global-index", "us-stocks", "us-etfs"].includes(market)) {
    rows = await getYahooRows(market);
  }

  rows = rows.filter((r) => r.ltp > 0);
  rows = applyTypeFilter(rows, type);

  return rows.sort((a, b) => b.score - a.score);
}

async function buildScanner(type = "all", market = "future-stock") {
  const cacheKey = `${market}-${type}`;
  const ttl = getCacheTtl(market);

  if (SCANNER_CACHE[cacheKey] && Date.now() - SCANNER_CACHE[cacheKey].time < ttl) {
    return SCANNER_CACHE[cacheKey].data;
  }

  if (MULTI_ASSET_MARKETS.includes(market)) {
    const multiResult = await buildMultiAssetScanner(type, market);

    SCANNER_CACHE[cacheKey] = {
      time: Date.now(),
      data: multiResult,
    };

    return multiResult;
  }

  const instruments = await loadInstrumentsByMarket(market);
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

    return {
      market,
      symbol: stock.symbol,
      underlyingSymbol: stock.underlyingSymbol || stock.symbol,
      tradingSymbol: stock.tradingSymbol,
      instrumentKey: stock.instrumentKey,
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
      updatedAt: new Date().toLocaleTimeString("en-IN"),
    };
  });

  rows = rows.filter((r) => r.ltp > 0);

  if (market === "index-option") rows = filterIndexOptionATM(rows);

  rows = applyTypeFilter(rows, type);

  let result = market === "index-option" ? rows : rows.sort((a, b) => b.score - a.score);

  SCANNER_CACHE[cacheKey] = {
    time: Date.now(),
    data: result,
  };

  return result;
}

async function getSummary(market = "future-stock") {
  const rows = await buildScanner("all", market);
  const call = (r) => String(r.signal || "").toLowerCase();

  return {
    totalStocks: rows.length,
    gainers: rows.filter((r) => r.changePercent > 0).length,
    losers: rows.filter((r) => r.changePercent < 0).length,
    oiSignals: rows.filter((r) => Math.abs(r.oiChangePercent) >= 7).length,
    buySignals: rows.filter((r) => call(r).includes("buy") || call(r).includes("long") || call(r).includes("top gainer")).length,
    sellSignals: rows.filter((r) => call(r).includes("sell") || call(r).includes("short") || call(r).includes("top loser")).length,
  };
}

module.exports = { buildScanner, getSummary };
