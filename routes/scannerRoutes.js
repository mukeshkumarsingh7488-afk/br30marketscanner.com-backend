const express = require("express");
const { getScanner, getScannerSummary, reloadInstruments } = require("../controllers/scannerController");
const { protect, subscriptionRequired } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, subscriptionRequired, getScanner);
router.get("/summary", protect, subscriptionRequired, getScannerSummary);
router.get("/reload-instruments", protect, subscriptionRequired, reloadInstruments);

module.exports = router;
