const axios = require("axios");

const BYBIT_BASE_URL = process.env.BYBIT_BASE_URL || "https://api.bybit.com";
const BYBIT_TIMEOUT_MS = Number(process.env.BYBIT_TIMEOUT_MS || 12000);
const ENABLE_CRYPTO_OPTIONS = String(process.env.ENABLE_CRYPTO_OPTIONS || "true").toLowerCase() === "true";
const BYBIT_OPTION_BASE_COINS = String(process.env.BYBIT_OPTION_BASE_COINS || "BTC,ETH,SOL")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

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

function nowIso() {
  return new Date().toISOString();
}

function safeTime() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" });
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
  return Number((Math.abs(safeNum(changePercent)) + (safeNum(volume) > 0 ? 1 : 0)).toFixed(2));
}

function buildTradingView(symbol, type = "future") {
  const tvSymbol = type === "option" ? `BYBIT:${symbol}` : `BYBIT:${symbol}.P`;
  return {
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
  };
}

function getTodayUtcRange() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);
  return { start, end };
}

function parseOptionSymbol(symbol = "") {
  const parts = String(symbol).split("-");
  return {
    baseCoin: parts[0] || "",
    expiryCode: parts[1] || "",
    strike: safeNum(parts[2]),
    optionType: parts[3] || "",
  };
}

function toCryptoFutureRow(q = {}) {
  const symbol = String(q.symbol || "").toUpperCase();
  const ltp = safeNum(q.lastPrice);
  const changePercent = safeNum(q.price24hPcnt) * 100;
  const volume = safeNum(q.turnover24h || q.volume24h);
  const sig = cryptoSignal(changePercent, volume);
  const tv = buildTradingView(symbol, "future");

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
    oi: safeNum(q.openInterest),
    oiDayLow: 0,
    oiChangePercent: 0,
    volume,
    volumeRatio: volume > 0 ? 1 : 0,
    signal: sig,
    tradeCall: sig,
    score: cryptoScore(changePercent, volume),
    updatedAt: safeTime(),
    updatedAtIso: nowIso(),
  };
}

function toCryptoOptionRow(q = {}, instrument = {}) {
  const symbol = String(q.symbol || instrument.symbol || "").toUpperCase();
  const ltp = safeNum(q.lastPrice || q.markPrice || q.bid1Price || q.ask1Price);
  const changePercent = safeNum(q.change24h || q.price24hPcnt) * (Math.abs(safeNum(q.change24h || q.price24hPcnt)) <= 1 ? 100 : 1);
  const volume = safeNum(q.volume24h || q.turnover24h);
  const parsed = parseOptionSymbol(symbol);
  const deliveryMs = safeNum(instrument.deliveryTime || q.deliveryTime);
  const sig = cryptoSignal(changePercent, volume);
  const tv = buildTradingView(symbol, "option");

  if (!symbol || !ltp) return null;

  return {
    market: "crypto-options",
    symbol,
    tradingSymbol: symbol,
    instrumentKey: symbol,
    sourceSymbol: symbol,
    source: "bybit",
    ...tv,
    expiry: deliveryMs ? new Date(deliveryMs).toISOString() : parsed.expiryCode,
    lotSize: safeNum(instrument.lotSizeFilter?.qtyStep || 1) || 1,
    strike: safeNum(instrument.strike || parsed.strike),
    optionType: String(instrument.optionsType || parsed.optionType || "").toUpperCase(),
    baseCoin: instrument.baseCoin || parsed.baseCoin,
    ltp,
    markPrice: safeNum(q.markPrice),
    bidPrice: safeNum(q.bid1Price),
    askPrice: safeNum(q.ask1Price),
    bidIv: safeNum(q.bid1Iv),
    askIv: safeNum(q.ask1Iv),
    markIv: safeNum(q.markIv),
    delta: safeNum(q.delta),
    gamma: safeNum(q.gamma),
    theta: safeNum(q.theta),
    vega: safeNum(q.vega),
    changePercent: Number(changePercent.toFixed(2)),
    oi: safeNum(q.openInterest),
    oiDayLow: 0,
    oiChangePercent: 0,
    volume,
    volumeRatio: volume > 0 ? 1 : 0,
    signal: sig,
    tradeCall: sig,
    score: cryptoScore(changePercent, volume),
    updatedAt: safeTime(),
    updatedAtIso: nowIso(),
  };
}

async function bybitGet(path, params = {}) {
  const res = await axios.get(`${BYBIT_BASE_URL}${path}`, {
    timeout: BYBIT_TIMEOUT_MS,
    params,
    headers: {
      Accept: "application/json",
      "User-Agent": "BR30-Market-Scanner/1.0",
    },
  });

  if (res.data?.retCode !== 0) {
    throw new Error(res.data?.retMsg || "Bybit API failed");
  }

  return res.data?.result || {};
}

async function fetchBybitCryptoRows() {
  try {
    const result = await bybitGet("/v5/market/tickers", { category: "linear" });
    const list = result.list || [];

    const rows = list
      .filter((q) => CRYPTO_FUTURES_SYMBOLS.includes(String(q.symbol || "").toUpperCase()))
      .map(toCryptoFutureRow)
      .filter(Boolean)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    console.log(`✅ BYBIT FUTURES => Rows: ${rows.length}`);
    return rows;
  } catch (err) {
    console.log("❌ BYBIT FUTURES ERROR =>", err.response?.data?.retMsg || err.message);
    return [];
  }
}

async function fetchOptionInstrumentsByBaseCoin(baseCoin) {
  const all = [];
  let cursor = "";

  do {
    const result = await bybitGet("/v5/market/instruments-info", {
      category: "option",
      baseCoin,
      status: "Trading",
      limit: 1000,
      cursor: cursor || undefined,
    });

    all.push(...(result.list || []));
    cursor = result.nextPageCursor || "";
  } while (cursor);

  return all;
}

async function fetchOptionTickersByBaseCoin(baseCoin) {
  const result = await bybitGet("/v5/market/tickers", {
    category: "option",
    baseCoin,
  });

  return result.list || [];
}

async function fetchBybitCryptoOptionRows() {
  if (!ENABLE_CRYPTO_OPTIONS) return [];

  try {
    const { start, end } = getTodayUtcRange();
    const rows = [];

    for (const baseCoin of BYBIT_OPTION_BASE_COINS) {
      const instruments = await fetchOptionInstrumentsByBaseCoin(baseCoin);
      const todayInstruments = instruments.filter((x) => {
        const delivery = safeNum(x.deliveryTime);
        return delivery >= start && delivery <= end;
      });

      if (!todayInstruments.length) {
        console.log(`🟡 BYBIT OPTIONS => ${baseCoin} daily expiry not found today`);
        continue;
      }

      const tickerList = await fetchOptionTickersByBaseCoin(baseCoin);
      const tickerMap = new Map(tickerList.map((x) => [String(x.symbol || "").toUpperCase(), x]));

      for (const ins of todayInstruments) {
        const q = tickerMap.get(String(ins.symbol || "").toUpperCase());
        const row = toCryptoOptionRow(q, ins);
        if (row) rows.push(row);
      }
    }

    const sorted = rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    console.log(`✅ BYBIT OPTIONS DAILY EXPIRY => Rows: ${sorted.length}`);
    return sorted;
  } catch (err) {
    console.log("❌ BYBIT OPTIONS ERROR =>", err.response?.data?.retMsg || err.message);
    return [];
  }
}

module.exports = {
  fetchBybitCryptoRows,
  fetchBybitCryptoOptionRows,
};
