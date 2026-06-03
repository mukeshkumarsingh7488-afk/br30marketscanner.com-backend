const express = require("express");
const { registerUser, verifyOtp, resendOtp, loginUser, forgotPassword, resetPassword, getMe, getAllUsers, getPendingUsers, approveUser, unapproveUser, deleteUser, getAdminStats, blockUser, unblockUser, updateUserSubscription, sendBulkMail } = require("../controllers/authController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", protect, getMe);

router.get("/admin/stats", protect, adminOnly, getAdminStats);
router.get("/admin/users", protect, adminOnly, getAllUsers);
router.get("/admin/pending-users", protect, adminOnly, getPendingUsers);

router.put("/admin/approve/:id", protect, adminOnly, approveUser);
router.put("/admin/unapprove/:id", protect, adminOnly, unapproveUser);

router.put("/admin/block/:id", protect, adminOnly, blockUser);
router.put("/admin/unblock/:id", protect, adminOnly, unblockUser);
router.put("/admin/subscription/:id", protect, adminOnly, updateUserSubscription);

router.post("/admin/bulk-mail", protect, adminOnly, sendBulkMail);

router.delete("/admin/delete/:id", protect, adminOnly, deleteUser);

module.exports = router;
