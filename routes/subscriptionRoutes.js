const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getSubscriptionStatus, createSubscriptionOrder, paytmCallback, getAllPayments, getUserPayments } = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/status", protect, getSubscriptionStatus);
router.post("/create-order", protect, createSubscriptionOrder);
router.post("/paytm-callback", paytmCallback);

router.get("/admin/payments", protect, adminOnly, getAllPayments);
router.get("/admin/payments/:userId", protect, adminOnly, getUserPayments);

module.exports = router;
