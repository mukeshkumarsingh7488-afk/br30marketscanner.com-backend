const axios = require("axios");

const BINANCE_FUTURES_BASE_URL = process.env.BINANCE_FUTURES_BASE_URL || "https://fapi.binance.com";

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

const cryptoSignal = (changePercent, volume) => {
  if (changePercent >= 5 && volume > 0) return "STRONG BUY";
  if (changePercent <= -5 && volume > 0) return "STRONG SELL";
  if (changePercent >= 2 && volume > 0) return "BUY";
  if (changePercent <= -2 && volume > 0) return "SELL";
  if (changePercent >= 1) return "Top Gainer";
  if (changePercent <= -1) return "Top Loser";
  return "WAIT";
};

const cryptoScore = (changePercent, volume) => {
  const moveScore = Math.abs(Number(changePercent || 0));
  const volScore = Number(volume || 0) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
};

async function getCryptoFuturesRows() {
  const res = await axios.get(`${BINANCE_FUTURES_BASE_URL}/fapi/v1/ticker/24hr`, {
    timeout: 12000,
  });

  const data = Array.isArray(res.data) ? res.data : [];

  const rows = data
    .filter((q) => CRYPTO_FUTURES_SYMBOLS.includes(q.symbol))
    .map((q) => {
      const ltp = Number(q.lastPrice || 0);
      const changePercent = Number(q.priceChangePercent || 0);
      const volume = Number(q.quoteVolume || q.volume || 0);
      const sig = cryptoSignal(changePercent, volume);

      return {
        market: "crypto-futures",
        symbol: q.symbol,
        tradingSymbol: q.symbol,
        instrumentKey: q.symbol,
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
        updatedAt: new Date().toLocaleTimeString("en-IN"),
      };
    })
    .filter((r) => r.ltp > 0)
    .sort((a, b) => b.score - a.score);

  return rows;
}

module.exports = { getCryptoFuturesRows };
