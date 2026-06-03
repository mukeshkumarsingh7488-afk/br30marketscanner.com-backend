const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    otp: String,
    otpExpires: Date,

    resetOtp: String,
    resetOtpExpires: Date,

    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    // =========================
    // SUBSCRIPTION SYSTEM
    // =========================

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },

    trialStartDate: {
      type: Date,
      default: Date.now,
    },

    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },

    subscriptionStartDate: Date,
    subscriptionEndDate: Date,

    planName: {
      type: String,
      default: "Free Trial",
    },

    planPrice: {
      type: Number,
      default: 0,
    },

    autoPayEnabled: {
      type: Boolean,
      default: false,
    },

    paytmSubscriptionId: String,
    paytmMandateId: String,

    lastPaymentDate: Date,
    nextBillingDate: Date,

    totalPayments: {
      type: Number,
      default: 0,
    },

    isSubscriptionActive: {
      type: Boolean,
      default: true,
    },

    isFoundingMember: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
