const YahooFinance = require("yahoo-finance2").default;

const yahooFinance = new YahooFinance();

const YAHOO_CACHE = {};
const CACHE_TTL = 5 * 60 * 1000;

const FOREX_MAJOR_SYMBOLS = ["EURUSD=X", "GBPUSD=X", "JPY=X", "AUDUSD=X", "NZDUSD=X", "CAD=X", "CHF=X"];
const FOREX_CROSS_SYMBOLS = ["EURJPY=X", "GBPJPY=X", "EURGBP=X", "AUDJPY=X", "CADJPY=X", "CHFJPY=X", "GBPAUD=X", "EURAUD=X", "EURCAD=X", "GBPCAD=X"];
const METAL_SYMBOLS = ["GC=F", "SI=F", "PL=F", "PA=F"];
const COMMODITY_SYMBOLS = ["CL=F", "BZ=F", "NG=F", "HG=F", "ZC=F", "ZS=F", "ZW=F", "KC=F", "CT=F", "SB=F"];
const GLOBAL_INDEX_SYMBOLS = ["^DJI", "^IXIC", "^GSPC", "^RUT", "^VIX", "^FTSE", "^GDAXI", "^FCHI", "^STOXX50E", "^N225", "^HSI", "^AXJO"];
const US_STOCK_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "NFLX", "AMD", "INTC", "COIN", "MSTR", "PLTR", "JPM", "BAC", "V", "MA", "DIS", "BA", "WMT"];
const US_ETF_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO", "XLK", "XLF", "XLE", "XLY", "XLI", "XLV", "GLD", "SLV", "USO", "TLT", "ARKK", "SOXX", "SMH", "HYG"];

const displayNames = {
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

const getSymbols = (market) => {
  if (market === "forex-cross") return FOREX_CROSS_SYMBOLS;
  if (market === "metals") return METAL_SYMBOLS;
  if (market === "commodities") return COMMODITY_SYMBOLS;
  if (market === "global-index") return GLOBAL_INDEX_SYMBOLS;
  if (market === "us-stocks") return US_STOCK_SYMBOLS;
  if (market === "us-etfs") return US_ETF_SYMBOLS;
  return FOREX_MAJOR_SYMBOLS;
};

const yahooSignal = (changePercent) => {
  if (changePercent >= 2) return "STRONG BUY";
  if (changePercent <= -2) return "STRONG SELL";
  if (changePercent >= 1) return "BUY";
  if (changePercent <= -1) return "SELL";
  if (changePercent >= 0.3) return "Watchlist";
  if (changePercent <= -0.3) return "Watchlist";
  return "WAIT";
};

const yahooScore = (changePercent, volume) => {
  const moveScore = Math.abs(Number(changePercent || 0));
  const volScore = Number(volume || 0) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
};

const getPrice = (q = {}) => {
  return Number(q.regularMarketPrice || q.postMarketPrice || q.preMarketPrice || q.bid || q.ask || 0);
};

const getChangePercent = (q = {}) => {
  return Number(q.regularMarketChangePercent || q.postMarketChangePercent || q.preMarketChangePercent || 0);
};

const toRow = (q, market) => {
  if (!q) return null;

  const symbol = q.symbol;
  const ltp = getPrice(q);
  const changePercent = getChangePercent(q);
  const volume = Number(q.regularMarketVolume || q.volume || 0);

  if (!symbol || !ltp) return null;

  return {
    market,
    symbol: displayNames[symbol] || symbol,
    tradingSymbol: symbol,
    instrumentKey: symbol,
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
    updatedAt: new Date().toLocaleTimeString("en-IN"),
  };
};

async function getYahooRows(market = "forex") {
  const cacheKey = `yahoo-${market}`;

  if (YAHOO_CACHE[cacheKey] && Date.now() - YAHOO_CACHE[cacheKey].time < CACHE_TTL) {
    return YAHOO_CACHE[cacheKey].data;
  }

  const symbols = getSymbols(market);

  try {
    const quotes = await yahooFinance.quote(symbols, {
      fields: ["symbol", "regularMarketPrice", "regularMarketChangePercent", "regularMarketVolume", "postMarketPrice", "postMarketChangePercent", "preMarketPrice", "preMarketChangePercent", "bid", "ask", "volume"],
    });

    const list = Array.isArray(quotes) ? quotes : [quotes];

    const rows = list
      .map((q) => toRow(q, market))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    if (rows.length) {
      YAHOO_CACHE[cacheKey] = {
        time: Date.now(),
        data: rows,
      };
    }

    return rows.length ? rows : YAHOO_CACHE[cacheKey]?.data || [];
  } catch (error) {
    console.log("YAHOO SERVICE ERROR =>", market, error.message);

    if (YAHOO_CACHE[cacheKey]?.data?.length) {
      return YAHOO_CACHE[cacheKey].data;
    }

    return [];
  }
}

module.exports = { getYahooRows };
