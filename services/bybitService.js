const axios = require("axios");

const BYBIT_BASE_URL = process.env.BYBIT_BASE_URL || "https://api.bybit.com";

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
  const tvSymbol = `BYBIT:${symbol}.P`;
  return {
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
  };
}

function toCryptoRow(q = {}) {
  const symbol = String(q.symbol || "").toUpperCase();
  const ltp = safeNum(q.lastPrice);
  const changePercent = safeNum(q.price24hPcnt) * 100;
  const volume = safeNum(q.turnover24h || q.volume24h);
  const sig = cryptoSignal(changePercent, volume);
  const tv = buildTradingView(symbol);

  if (!symbol || !ltp) return null;

  return {
    market: "crypto-futures",
    symbol,
    tradingSymbol: symbol,
    instrumentKey: symbol,
    sourceSymbol: symbol,
    source: "bybit",
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

async function fetchBybitCryptoRows() {
  try {
    const res = await axios.get(`${BYBIT_BASE_URL}/v5/market/tickers`, {
      timeout: 12000,
      params: {
        category: "linear",
      },
      headers: {
        Accept: "application/json",
        "User-Agent": "BR30-Market-Scanner/1.0",
      },
    });

    const list = res.data?.result?.list || [];

    return list
      .filter((q) => CRYPTO_FUTURES_SYMBOLS.includes(String(q.symbol || "").toUpperCase()))
      .map(toCryptoRow)
      .filter(Boolean)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  } catch (err) {
    console.log("BYBIT SERVICE ERROR =>", err.response?.data?.retMsg || err.message);
    return [];
  }
}

module.exports = {
  fetchBybitCryptoRows,
};
