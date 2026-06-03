const axios = require("axios");
const zlib = require("zlib");

const MASTER_URL = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";
const INDEX_SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "SENSEX", "BANKEX"];

let cache = { loadedAt: null, instruments: [] };

const getSymbol = (x) => (x.asset_symbol || x.underlying_symbol || x.name || x.trading_symbol || "").toString().toUpperCase();
const expiryMs = (v) => (!v ? 0 : typeof v === "number" ? v : Number.isFinite(new Date(v).getTime()) ? new Date(v).getTime() : 0);
const isFoSegment = (x) => ["NSE_FO", "BSE_FO"].includes(String(x.segment).toUpperCase());

async function loadMaster(force = false) {
  if (!force && cache.instruments.length && cache.loadedAt && Date.now() - cache.loadedAt < 6 * 60 * 60 * 1000) return cache.instruments;
  const res = await axios.get(MASTER_URL, { responseType: "arraybuffer" });
  cache.instruments = JSON.parse(zlib.gunzipSync(res.data).toString("utf-8"));
  cache.loadedAt = Date.now();
  console.log(`✅ Loaded Upstox master instruments: ${cache.instruments.length}`);
  return cache.instruments;
}

const pickNearestBySymbol = (items) => {
  const grouped = new Map();
  for (const item of items) {
    const symbol = getSymbol(item);
    if (!symbol || !item.instrument_key) continue;
    const exp = expiryMs(item.expiry);
    const old = grouped.get(symbol);
    if (!old || exp < old.expiryMs)
      grouped.set(symbol, { symbol, name: item.name, tradingSymbol: item.trading_symbol, instrumentKey: item.instrument_key, expiry: item.expiry, expiryMs: exp, lotSize: item.lot_size || item.minimum_lot || 0, instrumentType: item.instrument_type, segment: item.segment });
  }
  return Array.from(grouped.values()).sort((a, b) => INDEX_SYMBOLS.indexOf(a.symbol) - INDEX_SYMBOLS.indexOf(b.symbol));
};

const pickNearestOptionsByIndex = (items, perIndexLimit = 500) => {
  const finalList = [];

  for (const symbol of INDEX_SYMBOLS) {
    const arr = items.filter((x) => getSymbol(x) === symbol);
    if (!arr.length) continue;

    arr.sort((a, b) => expiryMs(a.expiry) - expiryMs(b.expiry));
    const nearestExpiry = expiryMs(arr[0].expiry);

    const nearest = arr
      .filter((x) => expiryMs(x.expiry) === nearestExpiry)
      .sort((a, b) => Number(a.strike_price || 0) - Number(b.strike_price || 0))
      .slice(0, perIndexLimit);

    finalList.push(...nearest);
  }

  return finalList;
};

async function loadInstrumentsByMarket(market = "future-stock", force = false) {
  const data = await loadMaster(force);
  const now = Date.now();

  if (market === "future-stock") {
    const list = data.filter((x) => String(x.segment).toUpperCase() === "NSE_FO" && String(x.instrument_type).toUpperCase().includes("FUT") && expiryMs(x.expiry) >= now && !INDEX_SYMBOLS.includes(getSymbol(x)));
    return pickNearestBySymbol(list);
  }

  if (market === "index-future") {
    const list = data.filter((x) => isFoSegment(x) && String(x.instrument_type).toUpperCase().includes("FUT") && expiryMs(x.expiry) >= now && INDEX_SYMBOLS.includes(getSymbol(x)));
    return pickNearestBySymbol(list);
  }

  if (market === "equity-stock") {
    return data
      .filter((x) => String(x.segment).toUpperCase() === "NSE_EQ" && String(x.instrument_type).toUpperCase() === "EQ" && x.instrument_key)
      .slice(0, 500)
      .map((x) => ({ symbol: getSymbol(x), name: x.name, tradingSymbol: x.trading_symbol, instrumentKey: x.instrument_key, expiry: null, lotSize: 1, instrumentType: x.instrument_type, segment: x.segment }));
  }

  if (market === "index-option") {
    const list = data.filter((x) => isFoSegment(x) && ["CE", "PE"].includes(String(x.instrument_type).toUpperCase()) && expiryMs(x.expiry) >= now && INDEX_SYMBOLS.includes(getSymbol(x)));

    return pickNearestOptionsByIndex(list, 500).map((x) => ({
      symbol: `${getSymbol(x)} ${x.strike_price || ""} ${x.instrument_type}`,
      underlyingSymbol: getSymbol(x),
      name: x.name,
      tradingSymbol: x.trading_symbol,
      instrumentKey: x.instrument_key,
      expiry: x.expiry,
      lotSize: x.lot_size || 0,
      strike: Number(x.strike_price || 0),
      optionType: String(x.instrument_type || "").toUpperCase(),
      instrumentType: x.instrument_type,
      segment: x.segment,
    }));
  }

  if (market === "equity-stock-option" || market === "future-stock-option") {
    const list = data
      .filter((x) => String(x.segment).toUpperCase() === "NSE_FO" && ["CE", "PE"].includes(String(x.instrument_type).toUpperCase()) && expiryMs(x.expiry) >= now && !INDEX_SYMBOLS.includes(getSymbol(x)))
      .sort((a, b) => expiryMs(a.expiry) - expiryMs(b.expiry))
      .slice(0, 500);
    return list.map((x) => ({
      symbol: `${getSymbol(x)} ${x.strike_price || ""} ${x.instrument_type}`,
      underlyingSymbol: getSymbol(x),
      name: x.name,
      tradingSymbol: x.trading_symbol,
      instrumentKey: x.instrument_key,
      expiry: x.expiry,
      lotSize: x.lot_size || 0,
      strike: Number(x.strike_price || 0),
      optionType: String(x.instrument_type || "").toUpperCase(),
      instrumentType: x.instrument_type,
      segment: x.segment,
    }));
  }

  return loadInstrumentsByMarket("future-stock", force);
}

module.exports = { loadInstrumentsByMarket, loadStockFutures: () => loadInstrumentsByMarket("future-stock") };
