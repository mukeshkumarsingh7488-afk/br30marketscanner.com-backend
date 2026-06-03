const axios = require("axios");

const BYBIT_BASE_URL = process.env.BYBIT_BASE_URL || "https://api.bybit.com";
const COINGECKO_BASE_URL = process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3";

const CACHE_TTL = 30 * 1000;
let CRYPTO_CACHE = { time: 0, data: [] };

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

const COINGECKO_IDS = [
  { id: "bitcoin", symbol: "BTCUSDT" },
  { id: "ethereum", symbol: "ETHUSDT" },
  { id: "binancecoin", symbol: "BNBUSDT" },
  { id: "solana", symbol: "SOLUSDT" },
  { id: "ripple", symbol: "XRPUSDT" },
  { id: "dogecoin", symbol: "DOGEUSDT" },
  { id: "cardano", symbol: "ADAUSDT" },
  { id: "avalanche-2", symbol: "AVAXUSDT" },
  { id: "chainlink", symbol: "LINKUSDT" },
  { id: "litecoin", symbol: "LTCUSDT" },
  { id: "bitcoin-cash", symbol: "BCHUSDT" },
  { id: "polkadot", symbol: "DOTUSDT" },
  { id: "matic-network", symbol: "MATICUSDT" },
  { id: "uniswap", symbol: "UNIUSDT" },
  { id: "cosmos", symbol: "ATOMUSDT" },
  { id: "near", symbol: "NEARUSDT" },
  { id: "filecoin", symbol: "FILUSDT" },
  { id: "aptos", symbol: "APTUSDT" },
  { id: "sui", symbol: "SUIUSDT" },
  { id: "arbitrum", symbol: "ARBUSDT" },
  { id: "optimism", symbol: "OPUSDT" },
  { id: "injective-protocol", symbol: "INJUSDT" },
  { id: "sei-network", symbol: "SEIUSDT" },
  { id: "celestia", symbol: "TIAUSDT" },
  { id: "dogwifcoin", symbol: "WIFUSDT" },
  { id: "pepe", symbol: "PEPEUSDT" },
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

const makeRow = ({ symbol, ltp, changePercent, volume, source = "crypto" }) => {
  const sig = cryptoSignal(changePercent, volume);

  return {
    market: "crypto-futures",
    symbol,
    tradingSymbol: symbol,
    instrumentKey: symbol,
    expiry: null,
    lotSize: 1,
    strike: 0,
    optionType: "",
    ltp: Number(ltp || 0),
    changePercent: Number(Number(changePercent || 0).toFixed(2)),
    oi: 0,
    oiDayLow: 0,
    oiChangePercent: 0,
    volume: Number(volume || 0),
    volumeRatio: Number(volume || 0) > 0 ? 1 : 0,
    signal: sig,
    score: cryptoScore(changePercent, volume),
    source,
    updatedAt: new Date().toLocaleTimeString("en-IN"),
  };
};

async function getBybitRows() {
  const res = await axios.get(`${BYBIT_BASE_URL}/v5/market/tickers`, {
    timeout: 12000,
    params: { category: "linear" },
    headers: {
      accept: "application/json",
      "user-agent": "BR30-Market-Scanner/1.0",
    },
  });

  const list = res.data?.result?.list || [];

  return list
    .filter((q) => CRYPTO_FUTURES_SYMBOLS.includes(q.symbol))
    .map((q) =>
      makeRow({
        symbol: q.symbol,
        ltp: Number(q.lastPrice || 0),
        changePercent: Number(q.price24hPcnt || 0) * 100,
        volume: Number(q.turnover24h || q.volume24h || 0),
        source: "bybit",
      })
    )
    .filter((r) => r.ltp > 0)
    .sort((a, b) => b.score - a.score);
}

async function getCoinGeckoRows() {
  const ids = COINGECKO_IDS.map((x) => x.id).join(",");

  const res = await axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
    timeout: 12000,
    params: {
      vs_currency: "usd",
      ids,
      order: "market_cap_desc",
      per_page: 100,
      page: 1,
      sparkline: false,
      price_change_percentage: "24h",
    },
    headers: {
      accept: "application/json",
      "user-agent": "BR30-Market-Scanner/1.0",
    },
  });

  const data = Array.isArray(res.data) ? res.data : [];
  const symbolMap = Object.fromEntries(COINGECKO_IDS.map((x) => [x.id, x.symbol]));

  return data
    .map((q) =>
      makeRow({
        symbol: symbolMap[q.id] || `${String(q.symbol || "").toUpperCase()}USDT`,
        ltp: Number(q.current_price || 0),
        changePercent: Number(q.price_change_percentage_24h || 0),
        volume: Number(q.total_volume || 0),
        source: "coingecko",
      })
    )
    .filter((r) => r.ltp > 0)
    .sort((a, b) => b.score - a.score);
}

async function getCryptoFuturesRows() {
  if (CRYPTO_CACHE.data.length && Date.now() - CRYPTO_CACHE.time < CACHE_TTL) {
    return CRYPTO_CACHE.data;
  }

  try {
    const rows = await getBybitRows();

    if (rows.length) {
      CRYPTO_CACHE = { time: Date.now(), data: rows };
      return rows;
    }
  } catch (error) {
    console.log("BYBIT SKIP =>", error.response?.status || "", error.response?.data?.retMsg || error.message);
  }

  try {
    const rows = await getCoinGeckoRows();

    if (rows.length) {
      CRYPTO_CACHE = { time: Date.now(), data: rows };
      return rows;
    }
  } catch (error) {
    console.log("COINGECKO SKIP =>", error.response?.status || "", error.message);
  }

  if (CRYPTO_CACHE.data.length) return CRYPTO_CACHE.data;

  return [];
}

module.exports = { getCryptoFuturesRows };
