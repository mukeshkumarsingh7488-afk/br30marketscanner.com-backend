const WebSocket = require("ws");
const { upsertMarketRow, getMarketMeta } = require("./marketCache");
const { SYMBOL_GROUPS, DISPLAY_NAMES, TV_SYMBOLS } = require("./twelveDataService");

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TWELVE_WS_URL = process.env.TWELVE_WS_URL || "wss://ws.twelvedata.com/v1/quotes/price";
const TWELVE_WS_ENABLED = String(process.env.TWELVE_WS_ENABLED || "false").toLowerCase() === "true";
const TWELVE_WS_STALE_MS = Number(process.env.TWELVE_WS_STALE_MS || 15000);

let ws = null;
let started = false;
let reconnectTimer = null;
let lastTickAt = 0;
let connectedAt = null;

const WS_MARKETS = ["forex-majors", "forex-cross", "metals", "commodities"];

function nowTime() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

const SYMBOL_TO_MARKET = {};
for (const market of WS_MARKETS) {
  for (const symbol of SYMBOL_GROUPS[market] || []) {
    SYMBOL_TO_MARKET[symbol] = market;
    SYMBOL_TO_MARKET[String(symbol).replace("/", "")] = market;
  }
}

function getAllSymbols() {
  return WS_MARKETS.flatMap((market) => SYMBOL_GROUPS[market] || []);
}

function buildTradingView(symbol) {
  const tvSymbol = TV_SYMBOLS[symbol] || TV_SYMBOLS[String(symbol).replace("/", "")] || `NASDAQ:${symbol}`;
  return {
    tvSymbol,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
  };
}

function buildWsRow(tick = {}) {
  const symbol = String(tick.symbol || tick.instrument || tick.s || "").trim();
  if (!symbol) return null;

  const market = SYMBOL_TO_MARKET[symbol] || SYMBOL_TO_MARKET[symbol.replace("/", "")];
  if (!market) return null;

  const oldCache = getMarketMeta(market);
  const oldRows = Array.isArray(oldCache?.data) ? oldCache.data : [];
  const oldRow = oldRows.find((r) => r.tradingSymbol === symbol || r.sourceSymbol === symbol || r.instrumentKey === symbol);

  const price = safeNum(tick.price || tick.close || tick.last || tick.p || tick.value || oldRow?.ltp);
  if (!price) return null;

  const previousClose = safeNum(tick.previous_close || tick.prev_close || oldRow?.previousClose || 0);
  const changePercent = tick.percent_change !== undefined ? safeNum(tick.percent_change) : previousClose ? ((price - previousClose) / previousClose) * 100 : safeNum(oldRow?.changePercent || 0);

  const volume = safeNum(tick.volume || oldRow?.volume || 0);
  const tv = buildTradingView(symbol);

  return {
    market,
    symbol: DISPLAY_NAMES[symbol] || String(symbol).replace("/", ""),
    tradingSymbol: symbol,
    instrumentKey: symbol,
    sourceSymbol: symbol,
    source: "twelvedata-ws",
    ...tv,
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

function subscribe() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const symbols = getAllSymbols();
  const payload = {
    action: "subscribe",
    params: {
      symbols: symbols.join(","),
    },
  };

  ws.send(JSON.stringify(payload));
  console.log(`🔌 [${nowTime()}] TwelveData WS subscribed | Symbols: ${symbols.length}`);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTwelveWs();
  }, 5000);
}

function connectTwelveWs() {
  if (!TWELVE_WS_ENABLED) {
    console.log(`🟡 [${nowTime()}] TwelveData WS disabled by env`);
    return;
  }

  if (!TWELVE_DATA_API_KEY) {
    console.log(`❌ [${nowTime()}] TwelveData WS missing API key`);
    return;
  }

  const url = `${TWELVE_WS_URL}?apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;

  try {
    ws = new WebSocket(url);

    ws.on("open", () => {
      connectedAt = new Date().toISOString();
      lastTickAt = Date.now();
      console.log(`✅ [${nowTime()}] TwelveData WS connected`);
      subscribe();
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.event === "heartbeat" || msg.event === "subscribe-status") return;

        const ticks = Array.isArray(msg) ? msg : [msg];

        for (const tick of ticks) {
          const row = buildWsRow(tick);
          if (!row) continue;

          lastTickAt = Date.now();

          upsertMarketRow(row.market, row, {
            source: "twelvedata-ws",
            status: "ok",
            message: "Live WebSocket tick",
          });
        }
      } catch (err) {
        console.log(`⚠️ [${nowTime()}] TwelveData WS parse error => ${err.message}`);
      }
    });

    ws.on("close", () => {
      console.log(`🔌 [${nowTime()}] TwelveData WS closed, reconnecting...`);
      scheduleReconnect();
    });

    ws.on("error", (err) => {
      console.log(`❌ [${nowTime()}] TwelveData WS error => ${err.message}`);
      try {
        ws.close();
      } catch {}
    });
  } catch (err) {
    console.log(`❌ [${nowTime()}] TwelveData WS connect failed => ${err.message}`);
    scheduleReconnect();
  }
}

function startTwelveDataWs() {
  if (started) {
    console.log(`⚠️ [${nowTime()}] TwelveData WS already started`);
    return;
  }

  started = true;
  connectTwelveWs();
}

function isTwelveWsHealthy() {
  if (!TWELVE_WS_ENABLED) return false;
  if (!lastTickAt) return false;
  return Date.now() - lastTickAt <= TWELVE_WS_STALE_MS;
}

function getTwelveWsHealth() {
  return {
    enabled: TWELVE_WS_ENABLED,
    connected: ws?.readyState === WebSocket.OPEN,
    connectedAt,
    lastTickAt: lastTickAt ? new Date(lastTickAt).toISOString() : null,
    staleMs: lastTickAt ? Date.now() - lastTickAt : null,
    healthy: isTwelveWsHealthy(),
  };
}

module.exports = {
  startTwelveDataWs,
  isTwelveWsHealthy,
  getTwelveWsHealth,
};
