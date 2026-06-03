const { buildScanner, getSummary } = require("../services/scannerService");
const { loadInstrumentsByMarket } = require("../services/instrumentService");

exports.getScanner = async (req, res) => {
  try {
    const type = req.query.type || "all";
    const market = req.query.market || "future-stock";

    const data = await buildScanner(type, market);

    return res.json({
      success: true,
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
    const market = req.query.market || "future-stock";

    const data = await getSummary(market);

    return res.json({
      success: true,
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
    const market = req.query.market || "future-stock";

    const data = await loadInstrumentsByMarket(market, true);

    return res.json({
      success: true,
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
