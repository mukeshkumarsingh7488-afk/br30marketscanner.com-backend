const axios = require("axios");

const STOOQ_BASE_URL = "https://stooq.com/q/l/";
const STOOQ_CACHE = {};
const CACHE_TTL = 60 * 1000;

const MARKET_SYMBOLS = {
  metals: [
    { stooq: "gc.f", symbol: "XAUUSD", tv: "COMEX:GC1!" },
    { stooq: "si.f", symbol: "XAGUSD", tv: "COMEX:SI1!" },
    { stooq: "pl.f", symbol: "XPTUSD", tv: "NYMEX:PL1!" },
    { stooq: "pa.f", symbol: "XPDUSD", tv: "NYMEX:PA1!" },
  ],
  commodities: [
    { stooq: "cl.f", symbol: "WTI CRUDE", tv: "NYMEX:CL1!" },
    { stooq: "bz.f", symbol: "BRENT CRUDE", tv: "NYMEX:BRN1!" },
    { stooq: "ng.f", symbol: "NATURAL GAS", tv: "NYMEX:NG1!" },
    { stooq: "hg.f", symbol: "COPPER", tv: "COMEX:HG1!" },
    { stooq: "zc.f", symbol: "CORN", tv: "CBOT:ZC1!" },
    { stooq: "zs.f", symbol: "SOYBEAN", tv: "CBOT:ZS1!" },
    { stooq: "zw.f", symbol: "WHEAT", tv: "CBOT:ZW1!" },
    { stooq: "kc.f", symbol: "COFFEE", tv: "ICEUS:KC1!" },
    { stooq: "ct.f", symbol: "COTTON", tv: "ICEUS:CT1!" },
    { stooq: "sb.f", symbol: "SUGAR", tv: "ICEUS:SB1!" },
  ],
  "global-index": [
    { stooq: "^dji", symbol: "US30", tv: "TVC:DJI" },
    { stooq: "^ndq", symbol: "NAS100", tv: "NASDAQ:NDX" },
    { stooq: "^spx", symbol: "SPX500", tv: "SP:SPX" },
    { stooq: "^rut", symbol: "RUSSELL2000", tv: "TVC:RUT" },
    { stooq: "^vix", symbol: "VIX", tv: "TVC:VIX" },
    { stooq: "^ukx", symbol: "FTSE100", tv: "TVC:UKX" },
    { stooq: "^dax", symbol: "DAX40", tv: "XETR:DAX" },
    { stooq: "^cac", symbol: "CAC40", tv: "EURONEXT:PX1" },
    { stooq: "^sx5e", symbol: "EUROSTOXX50", tv: "TVC:SX5E" },
    { stooq: "^nkx", symbol: "NIKKEI225", tv: "TVC:NI225" },
    { stooq: "^hsi", symbol: "HANGSENG", tv: "TVC:HSI" },
    { stooq: "^aor", symbol: "ASX200", tv: "ASX:XJO" },
  ],
};

const yahooSignal = (changePercent) => {
  if (changePercent >= 2) return "STRONG BUY";
  if (changePercent <= -2) return "STRONG SELL";
  if (changePercent >= 1) return "BUY";
  if (changePercent <= -1) return "SELL";
  if (changePercent >= 0.3 || changePercent <= -0.3) return "Watchlist";
  return "WAIT";
};

const yahooScore = (changePercent, volume) => {
  const moveScore = Math.abs(Number(changePercent || 0));
  const volScore = Number(volume || 0) > 0 ? 1 : 0;
  return Number((moveScore + volScore).toFixed(2));
};

const parseCsv = (csv = "") => {
  const lines = String(csv).trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });
    return obj;
  });
};

const toNumber = (v) => {
  const n = Number(
    String(v || "")
      .replace("%", "")
      .replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
};

const toRow = (q, meta, market) => {
  const ltp = toNumber(q.close);
  const changePercent = toNumber(q.perc);
  const volume = toNumber(q.volume);

  if (!ltp) return null;

  return {
    market,
    symbol: meta.symbol,
    tradingSymbol: meta.tv,
    instrumentKey: meta.stooq,
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
    source: "stooq",
    updatedAt: new Date().toLocaleTimeString("en-IN"),
  };
};

async function getYahooRows(market = "global-index") {
  const cacheKey = `stooq-${market}`;

  if (STOOQ_CACHE[cacheKey] && Date.now() - STOOQ_CACHE[cacheKey].time < CACHE_TTL) {
    return STOOQ_CACHE[cacheKey].data;
  }

  const symbols = MARKET_SYMBOLS[market];

  if (!symbols) {
    return [];
  }

  try {
    const stooqSymbols = symbols.map((x) => x.stooq).join(",");

    const res = await axios.get(STOOQ_BASE_URL, {
      timeout: 12000,
      params: {
        s: stooqSymbols,
        f: "sd2t2ohlcvp",
        h: "",
        e: "csv",
      },
      headers: {
        "User-Agent": "BR30-Market-Scanner/1.0",
        Accept: "text/csv,*/*",
      },
    });

    const list = parseCsv(res.data);

    const rows = list
      .map((q) => {
        const meta = symbols.find((x) => String(x.stooq).toLowerCase() === String(q.symbol || "").toLowerCase());
        return meta ? toRow(q, meta, market) : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    if (rows.length) {
      STOOQ_CACHE[cacheKey] = {
        time: Date.now(),
        data: rows,
      };
    }

    return rows.length ? rows : STOOQ_CACHE[cacheKey]?.data || [];
  } catch (error) {
    console.log("STOOQ SERVICE ERROR =>", market, error.message);

    if (STOOQ_CACHE[cacheKey]?.data?.length) {
      return STOOQ_CACHE[cacheKey].data;
    }

    return [];
  }
}

module.exports = { getYahooRows };
