const axios = require("axios");

const TWELVE_DATA_BASE_URL = process.env.TWELVE_DATA_BASE_URL || "https://api.twelvedata.com";
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_BATCH_SIZE = Number(process.env.TWELVE_BATCH_SIZE || 20);
const TWELVE_REQUEST_DELAY_MS = Number(process.env.TWELVE_REQUEST_DELAY_MS || 250);
const TWELVE_TIMEOUT_MS = Number(process.env.TWELVE_TIMEOUT_MS || 15000);

const SYMBOL_GROUPS = {
  "forex-majors": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "USD/CAD", "AUD/USD", "NZD/USD"],
  "forex-cross": ["EUR/JPY", "GBP/JPY", "EUR/GBP", "AUD/JPY", "CAD/JPY", "CHF/JPY", "GBP/AUD", "EUR/AUD", "EUR/CAD", "GBP/CAD", "EUR/CHF", "AUD/CAD", "AUD/NZD", "AUD/CHF", "NZD/JPY", "NZD/CAD", "NZD/CHF", "CAD/CHF", "GBP/CHF", "GBP/NZD"],
  metals: ["XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD"],
  "metal-stocks": [
    "HINDALCO",
    "HINDCOPPER",
    "NATIONALUM",
    "VEDL",
    "TATASTEEL",
    "JSWSTEEL",
    "JINDALSTEL",
    "SAIL",
    "NMDC",
    "MOIL",
    "APLAPOLLO",
    "RATNAMANI",
    "WELCORP",
    "MAANALU",
    "ASHAPURMIN",
    "ORISSAMINE",
    "AA",
    "X",
    "CLF",
    "NUE",
    "STLD",
    "FCX",
    "SCCO",
    "TECK",
    "VALE",
    "RIO",
    "BHP",
    "MP",
    "CMC",
    "ATI",
    "RS",
    "ZEUS",
    "TX",
    "MT",
    "GGB",
    "NEM",
    "GOLD",
    "AEM",
    "KGC",
    "AU",
    "FNV",
    "WPM",
    "AG",
    "SILV",
    "EXK",
    "HL",
    "PAAS",
    "SSRM",
    "BTG",
    "CDE",
    "MUX",
    "SAND",
    "OR",
    "FSM",
    "SA",
    "IAG",
    "EGO",
    "NG",
    "LAC",
    "ALB",
    "SQM",
    "PLL",
    "LIT",
    "URA",
    "CCJ",
  ],
  commodities: ["WTI/USD", "BRENT", "BRNG", "BRNB", "BOIL", "KOLD", "NGSP", "USO", "UNG", "GLD", "SLV"],
  "global-index": ["FTSE", "AEX", "GDAXI", "FCHI"],
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
  HINDALCO: "HINDALCO",
  HINDCOPPER: "HIND COPPER",
  NATIONALUM: "NATIONAL ALUMINIUM",
  VEDL: "VEDANTA",
  TATASTEEL: "TATA STEEL",
  JSWSTEEL: "JSW STEEL",
  JINDALSTEL: "JINDAL STEEL",
  SAIL: "SAIL",
  NMDC: "NMDC",
  MOIL: "MOIL",
  APLAPOLLO: "APL APOLLO",
  RATNAMANI: "RATNAMANI",
  WELCORP: "WELSPUN CORP",
  MAANALU: "MAAN ALUMINIUM",
  ASHAPURMIN: "ASHAPURA MINECHEM",
  ORISSAMINE: "ORISSA MINERALS",
  AA: "ALCOA",
  X: "US STEEL",
  CLF: "CLEVELAND CLIFFS",
  NUE: "NUCOR",
  STLD: "STEEL DYNAMICS",
  FCX: "FREEPORT MCMORAN",
  SCCO: "SOUTHERN COPPER",
  TECK: "TECK RESOURCES",
  VALE: "VALE",
  RIO: "RIO TINTO",
  BHP: "BHP",
  MP: "MP MATERIALS",
  CMC: "COMMERCIAL METALS",
  ATI: "ATI",
  RS: "RELIANCE STEEL",
  ZEUS: "OLYMPIC STEEL",
  TX: "TERNIUM",
  MT: "ARCELORMITTAL",
  GGB: "GERDAU",
  NEM: "NEWMONT",
  GOLD: "BARRICK GOLD",
  AEM: "AGNICO EAGLE",
  KGC: "KINROSS GOLD",
  AU: "ANGLOGOLD",
  FNV: "FRANCO NEVADA",
  WPM: "WHEATON PRECIOUS",
  AG: "FIRST MAJESTIC",
  SILV: "SILVERCREST",
  EXK: "ENDEAVOUR SILVER",
  MAG: "MAG SILVER",
  HL: "HECLA MINING",
  PAAS: "PAN AMERICAN SILVER",
  SSRM: "SSR MINING",
  BTG: "B2GOLD",
  CDE: "COEUR MINING",
  MUX: "MCEWEN MINING",
  SAND: "SANDSTORM GOLD",
  OR: "OSISKO GOLD",
  FSM: "FORTUNA SILVER",
  SA: "SEABRIDGE GOLD",
  IAG: "IAMGOLD",
  EGO: "ELDORADO GOLD",
  NG: "NOVAGOLD",
  TRQ: "TURQUOISE HILL",
  LAC: "LITHIUM AMERICAS",
  ALB: "ALBEMARLE",
  SQM: "SQM",
  PLL: "PIEDMONT LITHIUM",
  LIT: "GLOBAL X LITHIUM",
  URA: "GLOBAL X URANIUM",
  CCJ: "CAMECO",
  FTSE: "FTSE100",
  GDAXI: "DAX40",
  FCHI: "CAC40",
  AEX: "AEX",
};

const TV_SYMBOLS = {};
Object.keys(DISPLAY_NAMES).forEach((s) => {
  TV_SYMBOLS[s] = `NASDAQ:${s}`;
});
Object.assign(TV_SYMBOLS, {
  "EUR/USD": "FX:EURUSD",
  "GBP/USD": "FX:GBPUSD",
  "USD/JPY": "FX:USDJPY",
  "USD/CHF": "FX:USDCHF",
  "USD/CAD": "FX:USDCAD",
  "AUD/USD": "FX:AUDUSD",
  "NZD/USD": "FX:NZDUSD",
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
  BRNG: "LSE:BRNG",
  BRNB: "LSE:BRNB",
  BOIL: "AMEX:BOIL",
  KOLD: "AMEX:KOLD",
  NGSP: "LSE:NGSP",
  USO: "AMEX:USO",
  UNG: "AMEX:UNG",
  GLD: "AMEX:GLD",
  SLV: "AMEX:SLV",
  HINDALCO: "NSE:HINDALCO",
  HINDCOPPER: "NSE:HINDCOPPER",
  NATIONALUM: "NSE:NATIONALUM",
  VEDL: "NSE:VEDL",
  TATASTEEL: "NSE:TATASTEEL",
  JSWSTEEL: "NSE:JSWSTEEL",
  JINDALSTEL: "NSE:JINDALSTEL",
  SAIL: "NSE:SAIL",
  NMDC: "NSE:NMDC",
  MOIL: "NSE:MOIL",
  APLAPOLLO: "NSE:APLAPOLLO",
  RATNAMANI: "NSE:RATNAMANI",
  WELCORP: "NSE:WELCORP",
  MAANALU: "NSE:MAANALU",
  ASHAPURMIN: "NSE:ASHAPURMIN",
  ORISSAMINE: "NSE:ORISSAMINE",
  X: "NYSE:X",
  NUE: "NYSE:NUE",
  STLD: "NASDAQ:STLD",
  FCX: "NYSE:FCX",
  SCCO: "NYSE:SCCO",
  TECK: "NYSE:TECK",
  VALE: "NYSE:VALE",
  RIO: "NYSE:RIO",
  BHP: "NYSE:BHP",
  GOLD: "NYSE:GOLD",
  AU: "NYSE:AU",
  HL: "NYSE:HL",
  PAAS: "NASDAQ:PAAS",
  BTG: "AMEX:BTG",
  SA: "NYSE:SA",
  EGO: "NYSE:EGO",
  CCJ: "NYSE:CCJ",
  FTSE: "TVC:UKX",
  GDAXI: "TVC:DAX",
  FCHI: "TVC:CAC40",
  AEX: "EURONEXT:AEX",
});

const API_SYMBOLS = { FTSE: "FTSE", GDAXI: "GDAXI", FCHI: "FCHI", AEX: "AEX" };

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
    "metal-stock": "metal-stocks",
    "metal-stocks": "metal-stocks",
    "metals-stock": "metal-stocks",
    "metals-stocks": "metal-stocks",
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
  if (ch >= 2) return "BUY";
  if (ch <= -2) return "SELL";
  if (ch >= 1) return "WATCH BUY";
  if (ch <= -1) return "WATCH SELL";
  return "WAIT";
}

function score(changePercent, volume) {
  return Number((Math.abs(safeNum(changePercent)) + (safeNum(volume) > 0 ? 1 : 0)).toFixed(2));
}

function displayName(symbol) {
  return DISPLAY_NAMES[symbol] || String(symbol).replace("/", "");
}

function resolveQuote(batch = {}, symbol = "", apiSymbol = "", partLength = 1) {
  return batch[apiSymbol] || batch[symbol] || batch[String(apiSymbol).replace("/", "")] || batch[String(symbol).replace("/", "")] || (partLength === 1 && !batch.status ? batch : null);
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
    previousClose,
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
    const apiPart = part.map((s) => API_SYMBOLS[s] || s);
    const batch = await fetchBatchQuotes(apiPart);

    for (let i = 0; i < part.length; i++) {
      const symbol = part[i];
      const apiSymbol = apiPart[i];
      const quote = resolveQuote(batch, symbol, apiSymbol, part.length);
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
  SYMBOL_GROUPS,
  DISPLAY_NAMES,
  TV_SYMBOLS,
  normalizeMarket,
  toRow,
};
