const { buildScanner, getSummary } = require("../services/scannerService");
const { loadInstrumentsByMarket } = require("../services/instrumentService");
const { isGlobalMarket, normalizeMarket, getMarketSnapshot, getAllMarketCache } = require("../services/marketCache");

function filterRowsByType(rows = [], type = "all") {
  const t = String(type || "all").toLowerCase();

  if (t === "all" || t === "allstocks") return rows;

  if (t === "gainers") {
    return rows.filter((r) => Number(r.changePercent || r.change || 0) > 0);
  }

  if (t === "losers") {
    return rows.filter((r) => Number(r.changePercent || r.change || 0) < 0);
  }

  if (t === "buy" || t === "long") {
    return rows.filter((r) =>
      String(r.tradeCall || r.call || "")
        .toUpperCase()
        .includes("BUY")
    );
  }

  if (t === "sell" || t === "short") {
    return rows.filter((r) =>
      String(r.tradeCall || r.call || "")
        .toUpperCase()
        .includes("SELL")
    );
  }

  if (t === "stronglong" || t === "strong-buy") {
    return rows.filter((r) => String(r.tradeCall || r.call || "").toUpperCase() === "STRONG BUY");
  }

  if (t === "strongshort" || t === "strong-sell") {
    return rows.filter((r) => String(r.tradeCall || r.call || "").toUpperCase() === "STRONG SELL");
  }

  return rows;
}

function sortRows(rows = []) {
  return [...rows].sort((a, b) => {
    const scoreA = Number(a.score || Math.abs(Number(a.changePercent || a.change || 0)) || 0);
    const scoreB = Number(b.score || Math.abs(Number(b.changePercent || b.change || 0)) || 0);
    return scoreB - scoreA;
  });
}

function buildGlobalSummary(rows = [], meta = {}) {
  const total = rows.length;
  const gainers = rows.filter((r) => Number(r.changePercent || r.change || 0) > 0).length;
  const losers = rows.filter((r) => Number(r.changePercent || r.change || 0) < 0).length;
  const strongBuy = rows.filter((r) => String(r.tradeCall || r.call || "").toUpperCase() === "STRONG BUY").length;
  const strongSell = rows.filter((r) => String(r.tradeCall || r.call || "").toUpperCase() === "STRONG SELL").length;

  return {
    total,
    gainers,
    losers,
    strongBuy,
    strongSell,
    source: meta.source || "cache",
    status: meta.status || "empty",
    updatedAt: meta.updatedAt || null,
    message: meta.message || "",
  };
}

exports.getScanner = async (req, res) => {
  try {
    const type = req.query.type || "all";
    const market = normalizeMarket(req.query.market || "future-stock");

    if (isGlobalMarket(market)) {
      const snapshot = getMarketSnapshot(market);
      const filtered = filterRowsByType(snapshot.data || [], type);
      const data = sortRows(filtered);

      return res.json({
        success: true,
        mode: "cache",
        type,
        market,
        count: data.length,
        meta: snapshot.meta,
        data,
      });
    }

    const data = await buildScanner(type, market);

    return res.json({
      success: true,
      mode: "upstox",
      type,
      market,
      count: data.length,
      data,
    });
  } catch (error) {
    console.log("SCANNER API ERROR =>", error);
    return res.status(500).json({
      success: false,
      msg: error.message || "Scanner failed",
    });
  }
};

exports.getScannerSummary = async (req, res) => {
  try {
    const market = normalizeMarket(req.query.market || "future-stock");

    if (isGlobalMarket(market)) {
      const snapshot = getMarketSnapshot(market);

      return res.json({
        success: true,
        mode: "cache",
        market,
        data: buildGlobalSummary(snapshot.data || [], snapshot.meta || {}),
      });
    }

    const data = await getSummary(market);

    return res.json({
      success: true,
      mode: "upstox",
      market,
      data,
    });
  } catch (error) {
    console.log("SUMMARY API ERROR =>", error);
    return res.status(500).json({
      success: false,
      msg: error.message || "Summary failed",
    });
  }
};

exports.reloadInstruments = async (req, res) => {
  try {
    const market = normalizeMarket(req.query.market || "future-stock");

    if (isGlobalMarket(market)) {
      const snapshot = getMarketSnapshot(market);

      return res.json({
        success: true,
        mode: "cache",
        market,
        count: snapshot.data.length,
        meta: snapshot.meta,
        data: snapshot.data,
        msg: "Global market data is served from backend cache. Reload instruments is only for Indian/Upstox markets.",
      });
    }

    const data = await loadInstrumentsByMarket(market, true);

    return res.json({
      success: true,
      mode: "upstox",
      market,
      count: data.length,
      data,
    });
  } catch (error) {
    console.log("RELOAD INSTRUMENTS ERROR =>", error);
    return res.status(500).json({
      success: false,
      msg: error.message || "Reload instruments failed",
    });
  }
};

exports.getGlobalCacheStatus = async (req, res) => {
  try {
    const cache = getAllMarketCache();

    return res.json({
      success: true,
      mode: "cache",
      markets: Object.keys(cache).map((market) => ({
        market,
        count: cache[market]?.data?.length || 0,
        source: cache[market]?.source || "unknown",
        status: cache[market]?.status || "empty",
        updatedAt: cache[market]?.updatedAt || null,
        message: cache[market]?.message || "",
        error: cache[market]?.error || "",
      })),
    });
  } catch (error) {
    console.log("GLOBAL CACHE STATUS ERROR =>", error);
    return res.status(500).json({
      success: false,
      msg: error.message || "Global cache status failed",
    });
  }
};
