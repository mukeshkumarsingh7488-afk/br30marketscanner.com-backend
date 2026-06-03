const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password -otp -resetOtp");

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        msg: "Your account is blocked. Contact support.",
      });
    }
    // ==========================
    // SUBSCRIPTION AUTO CHECK
    // ==========================

    if (user.role !== "admin") {
      const now = new Date();

      if (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) < now) {
        user.subscriptionStatus = "expired";
        user.isSubscriptionActive = false;
        await user.save();
      }

      if (user.subscriptionStatus === "active" && user.subscriptionEndDate && new Date(user.subscriptionEndDate) < now) {
        user.subscriptionStatus = "expired";
        user.isSubscriptionActive = false;
        await user.save();
      }
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Invalid token",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      msg: "Admin access only",
    });
  }

  next();
};

// ==========================
// SCANNER ACCESS CHECK
// ==========================

const subscriptionRequired = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found",
      });
    }

    // Admin always access

    if (user.role === "admin") {
      return next();
    }

    // Active subscription

    if (user.subscriptionStatus === "active" && user.isSubscriptionActive) {
      return next();
    }

    // Free Trial

    if (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) > new Date()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      subscriptionRequired: true,
      msg: "Subscription required",
      planRequired: "BR30 Scanner Pro",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Subscription check failed",
    });
  }
};

module.exports = {
  protect,
  adminOnly,
  subscriptionRequired,
};
