const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Token missing",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        msg: "JWT_SECRET missing on server",
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
    return res.status(401).json({
      success: false,
      msg: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
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

const subscriptionRequired = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found",
      });
    }

    if (user.role === "admin") {
      return next();
    }

    if (user.subscriptionStatus === "active" && user.isSubscriptionActive) {
      return next();
    }

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
