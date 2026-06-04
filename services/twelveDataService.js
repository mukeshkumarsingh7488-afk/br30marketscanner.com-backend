const axios = require("axios");

const TWELVE_DATA_BASE_URL = process.env.TWELVE_DATA_BASE_URL || "https://api.twelvedata.com";
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_BATCH_SIZE = Number(process.env.TWELVE_BATCH_SIZE || 25);

const SYMBOL_GROUPS = {
  "forex-majors": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
  "forex-cross": ["EUR/JPY", "GBP/JPY", "EUR/GBP", "AUD/JPY", "CAD/JPY", "CHF/JPY", "GBP/AUD", "EUR/AUD", "EUR/CAD", "GBP/CAD"],
  metals: ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD"],
  commodities: ["WTI/USD", "BRENT/USD", "NATURAL_GAS/USD", "COPPER/USD"],
  "global-index": ["DJI", "IXIC", "SPX", "RUT", "VIX", "FTSE", "DAX", "CAC", "N225", "HSI"],
  "us-stocks": ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "COIN", "MSTR", "PLTR", "JPM", "BAC", "V", "MA", "DIS", "BA", "WMT"],
  "us-etfs": ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "XLK", "XLF", "XLE", "XLY", "XLI", "XLV", "GLD", "SLV", "USO", "TLT", "ARKK", "SOXX", "SMH", "HYG"],
};

const DISPLAY_NAMES = {
  "EUR/USD": "EURUSD",
  "GBP/USD": "GBPUSD",
  "USD/JPY": "USDJPY",
  "AUD/USD": "AUDUSD",
  "NZD/USD": "NZDUSD",
  "USD/CAD": "USDCAD",
  "USD/CHF": "USDCHF",
  "EUR/JPY": "EURJPY",
  "GBP/JPY": "GBPJPY",
  "EUR/GBP": "EURGBP",
  "AUD/JPY": "AUDJPY",
  "CAD/JPY": "CADJPY",
  "CHF/JPY": "CHFJPY",
  "GBP/AUD": "GBPAUD",
  "EUR/AUD": "EURAUD",
  "EUR/CAD": "EURCAD",
  "GBP/CAD": "GBPCAD",
  "XAU/USD": "XAUUSD",
  "XAG/USD": "XAGUSD",
  "XPT/USD": "XPTUSD",
  "XPD/USD": "XPDUSD",
  "WTI/USD": "WTI CRUDE",
  "BRENT/USD": "BRENT CRUDE",
  "NATURAL_GAS/USD": "NATURAL GAS",
  "COPPER/USD": "COPPER",
  DJI: "US30",
  IXIC: "NAS100",
  SPX: "SPX500",
  RUT: "RUSSELL2000",
  VIX: "VIX",
  FTSE: "FTSE100",
  DAX: "DAX40",
  CAC: "CAC40",
  N225: "NIKKEI225",
  HSI: "HANGSENG",
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
  DJI: "DJ:DJI",
  IXIC: "NASDAQ:IXIC",
  SPX: "SP:SPX",
  RUT: "TVC:RUT",
  VIX: "TVC:VIX",
  FTSE: "TVC:UKX",
  DAX: "XETR:DAX",
  CAC: "EURONEXT:PX1",
  N225: "TVC:NI225",
  HSI: "HSI:HSI",
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
  return SYMBOL_GROUPS[key] ? key : "forex-majors";
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeTime() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function chunkArray(arr = [], size = 25) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function getSymbols(market) {
  return SYMBOL_GROUPS[normalizeMarket(market)] || SYMBOL_GROUPS["forex-majors"];
}

function twelveSignal(changePercent, volume) {
  const ch = safeNum(changePercent);
  if (ch >= 2) return "STRONG BUY";
  if (ch <= -2) return "STRONG SELL";
  if (ch >= 1) return "BUY";
  if (ch <= -1) return "SELL";
  if (ch >= 0.3) return "WATCH BUY";
  if (ch <= -0.3) return "WATCH SELL";
  return "WAIT";
}

function twelveScore(changePercent, volume) {
  const moveScore = Math.abs(safeNum(changePercent));
  const volScore = safeNum(volume) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
}

function toRow(symbol, quote = {}, market) {
  if (!quote || quote.status === "error" || quote.code || quote.message) return null;

  const price = safeNum(quote.close || quote.price || quote.last || quote.previous_close || 0);
  const previousClose = safeNum(quote.previous_close || quote.prev_close || 0);
  const changePercentRaw = quote.percent_change !== undefined ? safeNum(quote.percent_change) : previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  const volume = safeNum(quote.volume || 0);

  if (!symbol || !price) return null;

  const display = DISPLAY_NAMES[symbol] || symbol;
  const tvSymbol = TV_SYMBOLS[symbol] || `NASDAQ:${display}`;

  return {
    market,
    symbol: display,
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
    changePercent: Number(changePercentRaw.toFixed(2)),
    oi: 0,
    oiDayLow: 0,
    oiChangePercent: 0,
    volume,
    volumeRatio: volume > 0 ? 1 : 0,
    signal: twelveSignal(changePercentRaw, volume),
    score: twelveScore(changePercentRaw, volume),
    updatedAt: safeTime(),
  };
}

async function fetchBatchQuotes(symbols = []) {
  if (!symbols.length) return {};

  try {
    const res = await axios.get(`${TWELVE_DATA_BASE_URL}/quote`, {
      timeout: 15000,
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
      console.log("TWELVE BATCH ERROR =>", symbols.join(","), data.message || JSON.stringify(data));
      return {};
    }

    return data;
  } catch (err) {
    console.log("TWELVE BATCH REQUEST ERROR =>", symbols.join(","), err.response?.data?.message || err.message);
    return {};
  }
}

async function fetchTwelveDataRows(market = "forex-majors") {
  market = normalizeMarket(market);

  if (!TWELVE_DATA_API_KEY) {
    console.log("TWELVE DATA ERROR => TWELVE_DATA_API_KEY missing");
    return [];
  }

  const symbols = getSymbols(market);
  const chunks = chunkArray(symbols, TWELVE_BATCH_SIZE);
  const rows = [];

  for (const part of chunks) {
    const batch = await fetchBatchQuotes(part);

    for (const symbol of part) {
      const quote = batch[symbol] || batch[symbol.replace("/", "")] || (part.length === 1 ? batch : null);
      const row = toRow(symbol, quote, market);
      if (row) rows.push(row);
    }
  }

  return rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

module.exports = {
  fetchTwelveDataRows,
};
