const axios = require("axios");

const TWELVE_DATA_BASE_URL = process.env.TWELVE_DATA_BASE_URL || "https://api.twelvedata.com";
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_BATCH_SIZE = Number(process.env.TWELVE_BATCH_SIZE || 20);
const TWELVE_REQUEST_DELAY_MS = Number(process.env.TWELVE_REQUEST_DELAY_MS || 250);
const TWELVE_TIMEOUT_MS = Number(process.env.TWELVE_TIMEOUT_MS || 15000);

const SYMBOL_GROUPS = {
  "forex-majors": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "USD/CAD", "AUD/USD", "NZD/USD"],
  "forex-cross": ["EUR/JPY", "GBP/JPY", "EUR/GBP", "AUD/JPY", "CAD/JPY", "CHF/JPY", "GBP/AUD", "EUR/AUD", "EUR/CAD", "GBP/CAD", "EUR/CHF", "AUD/CAD", "AUD/NZD", "AUD/CHF", "NZD/JPY", "NZD/CAD", "NZD/CHF", "CAD/CHF", "GBP/CHF", "GBP/NZD"],
  metals: ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD", "HINDCOPPER", "600362", "000878", "NATIONALUM", "MAANALU", "NICK", "NIKL", "NIC", "GMKN"],
  commodities: ["WTI/USD", "BRENT", "BRNG", "BRNB", "BOIL", "KOLD", "NGSP", "USO", "UNG", "GLD", "SLV"],
  "global-index": ["FTSE", "AEX", "000001", "000300"],
  "us-stocks": [
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
    "AMZN",
    "GOOGL",
    "META",
    "NFLX",
    "AMD",
    "INTC",
    "COIN",
    "MSTR",
    "PLTR",
    "JPM",
    "BAC",
    "V",
    "MA",
    "DIS",
    "BA",
    "WMT",
    "AVGO",
    "SMCI",
    "MU",
    "QCOM",
    "ORCL",
    "CRM",
    "ADBE",
    "PYPL",
    "UBER",
    "ABNB",
    "NKE",
    "COST",
    "HD",
    "TGT",
    "XOM",
    "CVX",
    "OXY",
    "PFE",
    "JNJ",
    "LLY",
    "MRNA",
    "NIO",
    "LI",
    "BABA",
    "RIVN",
    "LCID",
    "SOFI",
    "HOOD",
    "SNAP",
    "SHOP",
  ],
  "us-etfs": [
    "SPY",
    "QQQ",
    "DIA",
    "IWM",
    "VTI",
    "VOO",
    "XLK",
    "XLF",
    "XLE",
    "XLY",
    "XLI",
    "XLV",
    "GLD",
    "SLV",
    "USO",
    "UNG",
    "TLT",
    "ARKK",
    "SOXX",
    "SMH",
    "HYG",
    "VIXY",
    "UVXY",
    "TQQQ",
    "SQQQ",
    "SPXL",
    "SPXS",
    "LABU",
    "LABD",
    "XBI",
    "KRE",
    "XOP",
    "EEM",
    "EFA",
    "VEA",
    "VWO",
    "VNQ",
    "LQD",
    "JNK",
    "BIL",
  ],
};

const DISPLAY_NAMES = {
  "XAU/USD": "GOLD",
  "XAG/USD": "SILVER",
  "XPT/USD": "PLATINUM",
  "XPD/USD": "PALLADIUM",
  "WTI/USD": "WTI CRUDE",
  BRENT: "BRENT ETC",
  BRNT: "BRENT OIL",
  BRNG: "BRENT OIL GBp",
  BRNB: "BRENT BLOOMBERG",
  BOIL: "NAT GAS BULL",
  KOLD: "NAT GAS BEAR",
  NGAS: "NATURAL GAS",
  NGSP: "NATURAL GAS GBp",
  NGASL: "NATURAL GAS USD",
  HINDCOPPER: "HIND COPPER",
  600362: "JIANGXI COPPER",
  "000878": "YUNNAN COPPER",
  NATIONALUM: "NATIONAL ALUMINIUM",
  MAANALU: "MAAN ALUMINIUM",
  NICK: "NICKEL",
  NIKL: "NICKEL ASIA",
  NIC: "NICKEL INDUSTRIES",
  GMKN: "NORILSK NICKEL",
  FTSE: "FTSE100",
  GDAXI: "DAX40",
  FCHI: "CAC40",
  AEX: "AEX",
  FTSEMIB: "ITALY40",
  "000001": "SSE COMPOSITE",
  "000300": "CSI300",
  399001: "SZSE COMPONENT",
  399006: "CHINEXT",
  399300: "CSI300 SZSE",
  399106: "SZSE COMPOSITE",
  399330: "SHENZHEN100",
  399905: "CSI500",
  SET: "THAILAND SET",
  SET50: "THAILAND SET50",
  SET100: "THAILAND SET100",
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
  "EUR/CHF": "FX:EURCHF",
  "AUD/CAD": "FX:AUDCAD",
  "AUD/NZD": "FX:AUDNZD",
  "AUD/CHF": "FX:AUDCHF",
  "NZD/JPY": "FX:NZDJPY",
  "NZD/CAD": "FX:NZDCAD",
  "NZD/CHF": "FX:NZDCHF",
  "CAD/CHF": "FX:CADCHF",
  "GBP/CHF": "FX:GBPCHF",
  "GBP/NZD": "FX:GBPNZD",
  "XAU/USD": "OANDA:XAUUSD",
  "XAG/USD": "OANDA:XAGUSD",
  "XPT/USD": "OANDA:XPTUSD",
  "XPD/USD": "OANDA:XPDUSD",
  "WTI/USD": "NYMEX:CL1!",
  BRENT: "LSE:BRNT",
  BRNT: "LSE:BRNT",
  BRNG: "LSE:BRNG",
  BRNB: "LSE:BRNB",
  BOIL: "AMEX:BOIL",
  KOLD: "AMEX:KOLD",
  NGAS: "LSE:NGAS",
  NGSP: "LSE:NGSP",
  NGASL: "CBOE:NGASL",
  USO: "AMEX:USO",
  UNG: "AMEX:UNG",
  HINDCOPPER: "NSE:HINDCOPPER",
  600362: "SSE:600362",
  "000878": "SZSE:000878",
  NATIONALUM: "NSE:NATIONALUM",
  MAANALU: "NSE:MAANALU",
  ALUM: "LSE:ALUM",
  NICK: "LSE:NICK",
  NICKL: "CBOE:NICKL",
  NIKL: "PSE:NIKL",
  NIC: "ASX:NIC",
  GMKN: "MOEX:GMKN",
  FTSE: "TVC:UKX",
  GDAXI: "TVC:DAX",
  FCHI: "TVC:CAC40",
  AEX: "EURONEXT:AEX",
  FTSEMIB: "INDEX:FTSEMIB",
  "000001": "SSE:000001",
  "000300": "SSE:000300",
  399001: "SZSE:399001",
  399006: "SZSE:399006",
  399300: "SZSE:399300",
  399106: "SZSE:399106",
  399330: "SZSE:399330",
  399905: "SZSE:399905",
  SET: "SET:SET",
  SET50: "SET:SET50",
  SET100: "SET:SET100",
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
  AVGO: "NASDAQ:AVGO",
  SMCI: "NASDAQ:SMCI",
  MU: "NASDAQ:MU",
  QCOM: "NASDAQ:QCOM",
  ORCL: "NYSE:ORCL",
  CRM: "NYSE:CRM",
  ADBE: "NASDAQ:ADBE",
  PYPL: "NASDAQ:PYPL",
  UBER: "NYSE:UBER",
  ABNB: "NASDAQ:ABNB",
  NKE: "NYSE:NKE",
  COST: "NASDAQ:COST",
  HD: "NYSE:HD",
  TGT: "NYSE:TGT",
  XOM: "NYSE:XOM",
  CVX: "NYSE:CVX",
  OXY: "NYSE:OXY",
  PFE: "NYSE:PFE",
  JNJ: "NYSE:JNJ",
  LLY: "NYSE:LLY",
  MRNA: "NASDAQ:MRNA",
  NIO: "NYSE:NIO",
  LI: "NASDAQ:LI",
  BABA: "NYSE:BABA",
  RIVN: "NASDAQ:RIVN",
  LCID: "NASDAQ:LCID",
  SOFI: "NASDAQ:SOFI",
  HOOD: "NASDAQ:HOOD",
  SNAP: "NYSE:SNAP",
  SHOP: "NASDAQ:SHOP",
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
  TLT: "NASDAQ:TLT",
  ARKK: "AMEX:ARKK",
  SOXX: "NASDAQ:SOXX",
  SMH: "NASDAQ:SMH",
  HYG: "AMEX:HYG",
  VIXY: "AMEX:VIXY",
  UVXY: "AMEX:UVXY",
  TQQQ: "NASDAQ:TQQQ",
  SQQQ: "NASDAQ:SQQQ",
  SPXL: "AMEX:SPXL",
  SPXS: "AMEX:SPXS",
  LABU: "AMEX:LABU",
  LABD: "AMEX:LABD",
  XBI: "AMEX:XBI",
  KRE: "AMEX:KRE",
  XOP: "AMEX:XOP",
  EEM: "AMEX:EEM",
  EFA: "AMEX:EFA",
  VEA: "AMEX:VEA",
  VWO: "AMEX:VWO",
  VNQ: "AMEX:VNQ",
  LQD: "AMEX:LQD",
  JNK: "AMEX:JNK",
  BIL: "AMEX:BIL",
};

function normalizeMarket(market = "forex-majors") {
  const key = String(market || "forex-majors")
    .trim()
    .toLowerCase();
  const aliases = {
    forex: "forex-majors",
    "forex-major": "forex-majors",
    "forex-majors": "forex-majors",
    "forex-cross": "forex-cross",
    metal: "metals",
    metals: "metals",
    commodity: "commodities",
    commodities: "commodities",
    "global-index": "global-index",
    "global-indices": "global-index",
    indices: "global-index",
    index: "global-index",
    "us-stock": "us-stocks",
    "us-stocks": "us-stocks",
    "us-etf": "us-etfs",
    "us-etfs": "us-etfs",
  };
  return SYMBOL_GROUPS[aliases[key] || key] ? aliases[key] || key : "forex-majors";
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
  return DISPLAY_NAMES[symbol] || String(symbol).replace("/", "");
}

function toRow(symbol, quote = {}, market) {
  if (!quote || quote.status === "error" || quote.code || quote.message) {
    console.log(`⚠️ TWELVE SYMBOL SKIPPED => ${market} | ${symbol} | ${quote?.message || "Invalid response"}`);
    return null;
  }

  const price = safeNum(quote.close || quote.price || quote.last || 0);
  const previousClose = safeNum(quote.previous_close || quote.prev_close || 0);
  const changePercent = quote.percent_change !== undefined ? safeNum(quote.percent_change) : previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  const volume = safeNum(quote.volume || 0);

  if (!symbol || !price) {
    console.log(`⚠️ TWELVE SYMBOL EMPTY => ${market} | ${symbol}`);
    return null;
  }

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
      params: { symbol: symbols.join(","), apikey: TWELVE_DATA_API_KEY },
      headers: { Accept: "application/json", "User-Agent": "BR30-Market-Scanner/1.0" },
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

module.exports = { fetchTwelveDataRows };
