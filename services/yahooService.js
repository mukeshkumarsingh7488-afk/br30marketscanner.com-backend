const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

if (typeof yahooFinance.suppressNotices === "function") {
  yahooFinance.suppressNotices(["yahooSurvey"]);
}

const YAHOO_CACHE = {};
const CACHE_TTL = 60 * 1000;
const STALE_TTL = 30 * 60 * 1000;

const SYMBOL_GROUPS = {
  "forex-majors": ["EURUSD=X", "GBPUSD=X", "JPY=X", "AUDUSD=X", "NZDUSD=X", "CAD=X", "CHF=X"],
  "forex-cross": ["EURJPY=X", "GBPJPY=X", "EURGBP=X", "AUDJPY=X", "CADJPY=X", "CHFJPY=X", "GBPAUD=X", "EURAUD=X", "EURCAD=X", "GBPCAD=X"],
  metals: ["GC=F", "SI=F", "PL=F", "PA=F"],
  commodities: ["CL=F", "BZ=F", "NG=F", "HG=F", "ZC=F", "ZS=F", "ZW=F", "KC=F", "CT=F", "SB=F"],
  "global-index": ["^DJI", "^IXIC", "^GSPC", "^RUT", "^VIX", "^FTSE", "^GDAXI", "^FCHI", "^STOXX50E", "^N225", "^HSI", "^AXJO"],
  "us-stocks": ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "COIN", "MSTR", "PLTR", "JPM", "BAC", "V", "MA", "DIS", "BA", "WMT"],
  "us-etfs": ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "XLK", "XLF", "XLE", "XLY", "XLI", "XLV", "GLD", "SLV", "USO", "TLT", "ARKK", "SOXX", "SMH", "HYG"],
};

const DISPLAY_NAMES = {
  "EURUSD=X": "EURUSD",
  "GBPUSD=X": "GBPUSD",
  "JPY=X": "USDJPY",
  "AUDUSD=X": "AUDUSD",
  "NZDUSD=X": "NZDUSD",
  "CAD=X": "USDCAD",
  "CHF=X": "USDCHF",
  "EURJPY=X": "EURJPY",
  "GBPJPY=X": "GBPJPY",
  "EURGBP=X": "EURGBP",
  "AUDJPY=X": "AUDJPY",
  "CADJPY=X": "CADJPY",
  "CHFJPY=X": "CHFJPY",
  "GBPAUD=X": "GBPAUD",
  "EURAUD=X": "EURAUD",
  "EURCAD=X": "EURCAD",
  "GBPCAD=X": "GBPCAD",
  "GC=F": "XAUUSD",
  "SI=F": "XAGUSD",
  "PL=F": "XPTUSD",
  "PA=F": "XPDUSD",
  "CL=F": "WTI CRUDE",
  "BZ=F": "BRENT CRUDE",
  "NG=F": "NATURAL GAS",
  "HG=F": "COPPER",
  "ZC=F": "CORN",
  "ZS=F": "SOYBEAN",
  "ZW=F": "WHEAT",
  "KC=F": "COFFEE",
  "CT=F": "COTTON",
  "SB=F": "SUGAR",
  "^DJI": "US30",
  "^IXIC": "NAS100",
  "^GSPC": "SPX500",
  "^RUT": "RUSSELL2000",
  "^VIX": "VIX",
  "^FTSE": "FTSE100",
  "^GDAXI": "DAX40",
  "^FCHI": "CAC40",
  "^STOXX50E": "EUROSTOXX50",
  "^N225": "NIKKEI225",
  "^HSI": "HANGSENG",
  "^AXJO": "ASX200",
};

const TV_SYMBOLS = {
  "EURUSD=X": "FX:EURUSD",
  "GBPUSD=X": "FX:GBPUSD",
  "JPY=X": "FX:USDJPY",
  "AUDUSD=X": "FX:AUDUSD",
  "NZDUSD=X": "FX:NZDUSD",
  "CAD=X": "FX:USDCAD",
  "CHF=X": "FX:USDCHF",
  "EURJPY=X": "FX:EURJPY",
  "GBPJPY=X": "FX:GBPJPY",
  "EURGBP=X": "FX:EURGBP",
  "AUDJPY=X": "FX:AUDJPY",
  "CADJPY=X": "FX:CADJPY",
  "CHFJPY=X": "FX:CHFJPY",
  "GBPAUD=X": "FX:GBPAUD",
  "EURAUD=X": "FX:EURAUD",
  "EURCAD=X": "FX:EURCAD",
  "GBPCAD=X": "FX:GBPCAD",
  "GC=F": "OANDA:XAUUSD",
  "SI=F": "OANDA:XAGUSD",
  "PL=F": "OANDA:XPTUSD",
  "PA=F": "OANDA:XPDUSD",
  "CL=F": "NYMEX:CL1!",
  "BZ=F": "NYMEX:BRN1!",
  "NG=F": "NYMEX:NG1!",
  "HG=F": "COMEX:HG1!",
  "ZC=F": "CBOT:ZC1!",
  "ZS=F": "CBOT:ZS1!",
  "ZW=F": "CBOT:ZW1!",
  "KC=F": "ICEUS:KC1!",
  "CT=F": "ICEUS:CT1!",
  "SB=F": "ICEUS:SB1!",
  "^DJI": "DJ:DJI",
  "^IXIC": "NASDAQ:IXIC",
  "^GSPC": "SP:SPX",
  "^RUT": "TVC:RUT",
  "^VIX": "TVC:VIX",
  "^FTSE": "TVC:UKX",
  "^GDAXI": "XETR:DAX",
  "^FCHI": "EURONEXT:PX1",
  "^STOXX50E": "TVC:SX5E",
  "^N225": "TVC:NI225",
  "^HSI": "HSI:HSI",
  "^AXJO": "ASX:XJO",
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

function getSymbols(market) {
  return SYMBOL_GROUPS[normalizeMarket(market)] || SYMBOL_GROUPS["forex-majors"];
}

function yahooSignal(changePercent) {
  const ch = safeNum(changePercent);
  if (ch >= 2) return "STRONG BUY";
  if (ch <= -2) return "STRONG SELL";
  if (ch >= 1) return "BUY";
  if (ch <= -1) return "SELL";
  if (ch >= 0.3) return "WATCH BUY";
  if (ch <= -0.3) return "WATCH SELL";
  return "WAIT";
}

function yahooScore(changePercent, volume) {
  const moveScore = Math.abs(safeNum(changePercent));
  const volScore = safeNum(volume) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
}

function getPrice(q = {}) {
  return safeNum(q.regularMarketPrice || q.postMarketPrice || q.preMarketPrice || q.bid || q.ask || q.price || 0);
}

function getChangePercent(q = {}) {
  return safeNum(q.regularMarketChangePercent || q.postMarketChangePercent || q.preMarketChangePercent || 0);
}

function toRow(q = {}, market) {
  const yahooSymbol = q.symbol;
  const ltp = getPrice(q);
  const changePercent = getChangePercent(q);
  const volume = safeNum(q.regularMarketVolume || q.volume || 0);

  if (!yahooSymbol || !ltp) return null;

  const symbol = DISPLAY_NAMES[yahooSymbol] || yahooSymbol;
  const tvSymbol = TV_SYMBOLS[yahooSymbol] || `NASDAQ:${symbol}`;

  return {
    market,
    symbol,
    tradingSymbol: yahooSymbol,
    instrumentKey: yahooSymbol,
    yahooSymbol,
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
    expiry: null,
    lotSize: 1,
    strike: 0,
    optionType: "",
    ltp,
    changePercent: Number(changePercent.toFixed(2)),
    oi: 0,
    oiDayLow: 0,
    oiChangePercent: 0,
    volume,
    volumeRatio: volume > 0 ? 1 : 0,
    signal: yahooSignal(changePercent),
    score: yahooScore(changePercent, volume),
    updatedAt: safeTime(),
  };
}

async function quoteOneSafe(symbol, market) {
  try {
    const q = await yahooFinance.quote(symbol);
    return toRow(q, market);
  } catch (err) {
    console.log("YAHOO SINGLE ERROR =>", symbol, err.message);
    return null;
  }
}

async function quoteBatchSafe(symbols, market) {
  try {
    const quotes = await yahooFinance.quote(symbols);
    const list = Array.isArray(quotes) ? quotes : [quotes];
    return list.map((q) => toRow(q, market)).filter(Boolean);
  } catch (err) {
    console.log("YAHOO BATCH ERROR =>", market, err.message);
    const settled = await Promise.allSettled(symbols.map((s) => quoteOneSafe(s, market)));
    return settled.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
  }
}

async function getYahooRows(market = "forex-majors") {
  market = normalizeMarket(market);
  const cacheKey = `yahoo-${market}`;
  const cached = YAHOO_CACHE[cacheKey];

  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const symbols = getSymbols(market);

  try {
    const rows = await quoteBatchSafe(symbols, market);
    const finalRows = rows.filter((r) => r && r.ltp > 0).sort((a, b) => b.score - a.score);

    if (finalRows.length) {
      YAHOO_CACHE[cacheKey] = { time: Date.now(), data: finalRows };
      return finalRows;
    }

    if (cached && cached.data?.length && Date.now() - cached.time < STALE_TTL) return cached.data;
    return [];
  } catch (error) {
    console.log("YAHOO SERVICE ERROR =>", market, error.message);
    if (cached && cached.data?.length && Date.now() - cached.time < STALE_TTL) return cached.data;
    return [];
  }
}

module.exports = { getYahooRows };
