const express = require("express");

const { getScanner, getScannerSummary, reloadInstruments, getGlobalCacheStatus } = require("../controllers/scannerController");

const { protect, subscriptionRequired } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, subscriptionRequired, getScanner);

router.get("/summary", protect, subscriptionRequired, getScannerSummary);

router.get("/reload-instruments", protect, subscriptionRequired, reloadInstruments);

router.get("/global-cache-status", protect, subscriptionRequired, getGlobalCacheStatus);

module.exports = router;
