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
      enum: ["student", "admin", "vip"],
      default: "student",
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

    // =========================
    // INDICATOR ACCESS SYSTEM
    // =========================

    tradingViewUsername: {
      type: String,
      trim: true,
      default: "",
    },

    indicatorName: {
      type: String,
      default: "BR30 Infinity Sniper",
    },

    indicatorAccess: {
      type: String,
      enum: ["pending", "active", "expired", "rejected"],
      default: "pending",
    },

    indicatorApprovedAt: {
      type: Date,
    },

    indicatorExpiredAt: {
      type: Date,
    },

    indicatorRejectedAt: {
      type: Date,
    },

    indicatorMailSentAt: {
      type: Date,
    },

    indicatorAccessBy: {
      type: String,
      default: "",
    },

    // =========================
    // LEGAL CONSENT SYSTEM
    // =========================

    acceptedLegal: {
      type: Boolean,
      default: false,
    },

    acceptedLegalAt: {
      type: Date,
      default: null,
    },

    acceptedLegalVersion: {
      type: String,
      default: "",
    },

    acceptedTerms: {
      type: Boolean,
      default: false,
    },

    acceptedTermsVersion: {
      type: String,
      default: "",
    },

    acceptedPrivacy: {
      type: Boolean,
      default: false,
    },

    acceptedPrivacyVersion: {
      type: String,
      default: "",
    },

    acceptedRefund: {
      type: Boolean,
      default: false,
    },

    acceptedRefundVersion: {
      type: String,
      default: "",
    },

    acceptedDisclaimer: {
      type: Boolean,
      default: false,
    },

    acceptedDisclaimerVersion: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
