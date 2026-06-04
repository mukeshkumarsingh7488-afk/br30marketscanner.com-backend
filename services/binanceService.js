const axios = require("axios");

const BINANCE_FUTURES_BASE_URL = process.env.BINANCE_FUTURES_BASE_URL || "https://fapi.binance.com";

const BINANCE_CACHE = {
  time: 0,
  data: [],
};

const CACHE_TTL = 5000;
const STALE_TTL = 5 * 60 * 1000;

const CRYPTO_FUTURES_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "LTCUSDT",
  "BCHUSDT",
  "DOTUSDT",
  "MATICUSDT",
  "UNIUSDT",
  "ATOMUSDT",
  "NEARUSDT",
  "FILUSDT",
  "APTUSDT",
  "SUIUSDT",
  "ARBUSDT",
  "OPUSDT",
  "INJUSDT",
  "SEIUSDT",
  "TIAUSDT",
  "WIFUSDT",
  "PEPEUSDT",
];

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeTime() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function cryptoSignal(changePercent, volume) {
  const ch = safeNum(changePercent);
  const vol = safeNum(volume);

  if (ch >= 5 && vol > 0) return "STRONG BUY";
  if (ch <= -5 && vol > 0) return "STRONG SELL";
  if (ch >= 2 && vol > 0) return "BUY";
  if (ch <= -2 && vol > 0) return "SELL";
  if (ch >= 1) return "TOP GAINER";
  if (ch <= -1) return "TOP LOSER";
  if (ch >= 0.3) return "WATCH BUY";
  if (ch <= -0.3) return "WATCH SELL";
  return "WAIT";
}

function cryptoScore(changePercent, volume) {
  const moveScore = Math.abs(safeNum(changePercent));
  const volScore = safeNum(volume) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
}

function buildTradingView(symbol) {
  const tvSymbol = `BINANCE:${symbol}.P`;
  return {
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
  };
}

function toRow(q = {}) {
  const symbol = String(q.symbol || "").toUpperCase();
  const ltp = safeNum(q.lastPrice);
  const changePercent = safeNum(q.priceChangePercent);
  const volume = safeNum(q.quoteVolume || q.volume);
  const sig = cryptoSignal(changePercent, volume);
  const tv = buildTradingView(symbol);

  if (!symbol || !ltp) return null;

  return {
    market: "crypto-futures",
    symbol,
    tradingSymbol: symbol,
    instrumentKey: symbol,
    yahooSymbol: "",
    ...tv,
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
    signal: sig,
    score: cryptoScore(changePercent, volume),
    updatedAt: safeTime(),
  };
}

async function fetchBinanceTicker24hr() {
  const res = await axios.get(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/ticker/24hr`, {
    timeout: 12000,
    headers: {
      Accept: "application/json",
      "User-Agent": "BR30-Market-Scanner/1.0",
    },
  });

  return Array.isArray(res.data) ? res.data : [];
}

async function getCryptoFuturesRows() {
  if (BINANCE_CACHE.data.length && Date.now() - BINANCE_CACHE.time < CACHE_TTL) {
    return BINANCE_CACHE.data;
  }

  try {
    const data = await fetchBinanceTicker24hr();

    const rows = data
      .filter((q) => CRYPTO_FUTURES_SYMBOLS.includes(String(q.symbol || "").toUpperCase()))
      .map(toRow)
      .filter(Boolean)
      .filter((r) => r.ltp > 0)
      .sort((a, b) => b.score - a.score);

    if (rows.length) {
      BINANCE_CACHE.time = Date.now();
      BINANCE_CACHE.data = rows;
      return rows;
    }

    if (BINANCE_CACHE.data.length && Date.now() - BINANCE_CACHE.time < STALE_TTL) {
      return BINANCE_CACHE.data;
    }

    return [];
  } catch (err) {
    console.log("BINANCE SERVICE ERROR =>", err.message);

    if (BINANCE_CACHE.data.length && Date.now() - BINANCE_CACHE.time < STALE_TTL) {
      return BINANCE_CACHE.data;
    }

    return [];
  }
}

module.exports = {
  getCryptoFuturesRows,
};
