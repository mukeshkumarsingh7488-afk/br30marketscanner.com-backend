const axios = require("axios");

const TWELVE_DATA_BASE_URL = process.env.TWELVE_DATA_BASE_URL || "https://api.twelvedata.com";
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_BATCH_SIZE = Number(process.env.TWELVE_BATCH_SIZE || 20);
const TWELVE_REQUEST_DELAY_MS = Number(process.env.TWELVE_REQUEST_DELAY_MS || 250);
const TWELVE_TIMEOUT_MS = Number(process.env.TWELVE_TIMEOUT_MS || 15000);

const SYMBOL_GROUPS = {
  "forex-majors": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
  "forex-cross": ["EUR/JPY", "GBP/JPY", "EUR/GBP", "AUD/JPY", "CAD/JPY", "CHF/JPY", "GBP/AUD", "EUR/AUD", "EUR/CAD", "GBP/CAD"],
  metals: ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD"],
  commodities: ["WTI/USD", "BRENT/USD", "NATURAL_GAS/USD", "COPPER/USD"],
  "us-stocks": ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "COIN", "MSTR", "PLTR", "JPM", "BAC", "V", "MA", "DIS", "BA", "WMT"],
  "us-etfs": ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "XLK", "XLF", "XLE", "XLY", "XLI", "XLV", "GLD", "SLV", "USO", "TLT", "ARKK", "SOXX", "SMH", "HYG"],
};

const TV_SYMBOLS = {
  "EUR/USD": "FX:EURUSD",
  "GBP/USD": "FX:GBPUSD",
  "USD/JPY": "FX:USDJPY",
  "AUD/USD": "FX:AUDUSD",
  "NZD/USD": "FX:NZDUSD",
  "USD/CAD": "FX:USDCAD",
  "USD/CHF": "FX:USDCHF",
  "EUR/JPY": "FX:EURJPY",
  "GBP/JPY": "FX:GBPJPY",
  "EUR/GBP": "FX:EURGBP",
  "AUD/JPY": "FX:AUDJPY",
  "CAD/JPY": "FX:CADJPY",
  "CHF/JPY": "FX:CHFJPY",
  "GBP/AUD": "FX:GBPAUD",
  "EUR/AUD": "FX:EURAUD",
  "EUR/CAD": "FX:EURCAD",
  "GBP/CAD": "FX:GBPCAD",
  "XAU/USD": "OANDA:XAUUSD",
  "XAG/USD": "OANDA:XAGUSD",
  "XPT/USD": "OANDA:XPTUSD",
  "XPD/USD": "OANDA:XPDUSD",
  "WTI/USD": "NYMEX:CL1!",
  "BRENT/USD": "NYMEX:BRN1!",
  "NATURAL_GAS/USD": "NYMEX:NG1!",
  "COPPER/USD": "COMEX:HG1!",
  AAPL: "NASDAQ:AAPL",
  MSFT: "NASDAQ:MSFT",
  NVDA: "NASDAQ:NVDA",
  TSLA: "NASDAQ:TSLA",
  AMZN: "NASDAQ:AMZN",
  GOOGL: "NASDAQ:GOOGL",
  META: "NASDAQ:META",
  NFLX: "NASDAQ:NFLX",
  AMD: "NASDAQ:AMD",
  INTC: "NASDAQ:INTC",
  COIN: "NASDAQ:COIN",
  MSTR: "NASDAQ:MSTR",
  PLTR: "NASDAQ:PLTR",
  JPM: "NYSE:JPM",
  BAC: "NYSE:BAC",
  V: "NYSE:V",
  MA: "NYSE:MA",
  DIS: "NYSE:DIS",
  BA: "NYSE:BA",
  WMT: "NYSE:WMT",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  DIA: "AMEX:DIA",
  IWM: "AMEX:IWM",
  VTI: "AMEX:VTI",
  VOO: "AMEX:VOO",
  XLK: "AMEX:XLK",
  XLF: "AMEX:XLF",
  XLE: "AMEX:XLE",
  XLY: "AMEX:XLY",
  XLI: "AMEX:XLI",
  XLV: "AMEX:XLV",
  GLD: "AMEX:GLD",
  SLV: "AMEX:SLV",
  USO: "AMEX:USO",
  TLT: "NASDAQ:TLT",
  ARKK: "AMEX:ARKK",
  SOXX: "NASDAQ:SOXX",
  SMH: "NASDAQ:SMH",
  HYG: "AMEX:HYG",
};

function normalizeMarket(market = "forex-majors") {
  const key = String(market || "forex-majors")
    .trim()
    .toLowerCase();
  if (key === "forex") return "forex-majors";
  if (key === "forex-major") return "forex-majors";
  if (key === "global-index") return "global-index";
  return SYMBOL_GROUPS[key] ? key : "forex-majors";
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(arr = [], size = 20) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function signal(changePercent) {
  const ch = safeNum(changePercent);
  if (ch >= 2) return "STRONG BUY";
  if (ch <= -2) return "STRONG SELL";
  if (ch >= 1) return "BUY";
  if (ch <= -1) return "SELL";
  if (ch >= 0.3) return "WATCH BUY";
  if (ch <= -0.3) return "WATCH SELL";
  return "WAIT";
}

function score(changePercent, volume) {
  return Number((Math.abs(safeNum(changePercent)) + (safeNum(volume) > 0 ? 1 : 0)).toFixed(2));
}

function displayName(symbol) {
  return String(symbol).replace("/", "");
}

function toRow(symbol, quote = {}, market) {
  if (!quote || quote.status === "error" || quote.code || quote.message) return null;

  const price = safeNum(quote.close || quote.price || quote.last || 0);
  const previousClose = safeNum(quote.previous_close || quote.prev_close || 0);
  const changePercent = quote.percent_change !== undefined ? safeNum(quote.percent_change) : previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  const volume = safeNum(quote.volume || 0);

  if (!symbol || !price) return null;

  const tvSymbol = TV_SYMBOLS[symbol] || `NASDAQ:${symbol}`;

  return {
    market,
    symbol: displayName(symbol),
    tradingSymbol: symbol,
    instrumentKey: symbol,
    sourceSymbol: symbol,
    source: "twelvedata",
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
    expiry: null,
    lotSize: 1,
    strike: 0,
    optionType: "",
    ltp: price,
    changePercent: Number(changePercent.toFixed(2)),
    oi: 0,
    oiDayLow: 0,
    oiChangePercent: 0,
    volume,
    volumeRatio: volume > 0 ? 1 : 0,
    signal: signal(changePercent),
    tradeCall: signal(changePercent),
    score: score(changePercent, volume),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchBatchQuotes(symbols = [], attempt = 1) {
  if (!symbols.length) return {};

  try {
    const res = await axios.get(`${TWELVE_DATA_BASE_URL}/quote`, {
      timeout: TWELVE_TIMEOUT_MS,
      params: {
        symbol: symbols.join(","),
        apikey: TWELVE_DATA_API_KEY,
      },
      headers: {
        Accept: "application/json",
        "User-Agent": "BR30-Market-Scanner/1.0",
      },
    });

    const data = res.data || {};

    if (data.status === "error" || data.code || data.message) {
      console.log(`⚠️ TWELVE ERROR => ${symbols.join(",")} | ${data.message || JSON.stringify(data)}`);
      return {};
    }

    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;

    if (attempt < 2) {
      console.log(`🔁 TWELVE RETRY => ${symbols.join(",")} | ${msg}`);
      await sleep(700);
      return fetchBatchQuotes(symbols, attempt + 1);
    }

    console.log(`❌ TWELVE REQUEST FAILED => ${symbols.join(",")} | ${msg}`);
    return {};
  }
}

async function fetchTwelveDataRows(market = "forex-majors") {
  market = normalizeMarket(market);

  if (market === "global-index") {
    console.log("🟡 TwelveData global-index skipped: Coming Soon");
    return [];
  }

  if (!TWELVE_DATA_API_KEY) {
    console.log("❌ TWELVE_DATA_API_KEY missing");
    return [];
  }

  const symbols = SYMBOL_GROUPS[market] || SYMBOL_GROUPS["forex-majors"];
  const chunks = chunkArray(symbols, TWELVE_BATCH_SIZE);
  const rows = [];

  console.log(`🌍 TwelveData fetch start => ${market} | Symbols: ${symbols.length} | Batch: ${TWELVE_BATCH_SIZE}`);

  for (const part of chunks) {
    const batch = await fetchBatchQuotes(part);

    for (const symbol of part) {
      const quote = batch[symbol] || batch[symbol.replace("/", "")] || (part.length === 1 ? batch : null);
      const row = toRow(symbol, quote, market);
      if (row) rows.push(row);
    }

    await sleep(TWELVE_REQUEST_DELAY_MS);
  }

  console.log(`✅ TwelveData fetch done => ${market} | Rows: ${rows.length}/${symbols.length}`);

  return rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

module.exports = {
  fetchTwelveDataRows,
};
