const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendMail = require("../utils/mailHelper");
const Payment = require("../models/Payment");
const { otpTemplate, forgotPasswordTemplate, approvedTemplate, unapprovedTemplate, bulkMailTemplate } = require("../utils/mailTemplates");

const pendingRegisters = new Map();

const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const cleanEmail = (email) =>
  String(email || "")
    .toLowerCase()
    .trim();

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const emailClean = cleanEmail(email);

    if (!name || !emailClean || !password) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const exists = await User.findOne({ email: emailClean });
    if (exists) {
      return res.status(400).json({ success: false, msg: "Email already registered" });
    }

    const otp = makeOtp();

    await sendMail({
      to: emailClean,
      subject: "BR30 Market Scanner OTP Verification",
      html: otpTemplate(name, otp, "verify"),
    });

    pendingRegisters.set(emailClean, {
      name: name.trim(),
      email: emailClean,
      password,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
    });

    res.json({ success: true, msg: "OTP sent successfully" });
  } catch (error) {
    console.log("REGISTER OTP ERROR =>", error.message);
    res.status(500).json({ success: false, msg: error.message || "OTP mail failed" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailClean = cleanEmail(email);

    if (!emailClean || !otp) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const pending = pendingRegisters.get(emailClean);

    if (!pending) {
      return res.status(400).json({ success: false, msg: "Register again" });
    }

    if (pending.otp !== otp || pending.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    const exists = await User.findOne({ email: emailClean });
    if (exists) {
      pendingRegisters.delete(emailClean);
      return res.status(400).json({ success: false, msg: "Email already registered" });
    }

    const isMasterAdmin = emailClean === cleanEmail(process.env.MASTER_ADMIN_EMAIL);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await User.create({
      name: pending.name,
      email: pending.email,
      password: await bcrypt.hash(pending.password, 10),
      isVerified: true,
      isApproved: isMasterAdmin,
      role: isMasterAdmin ? "admin" : "user",
      subscriptionStatus: isMasterAdmin ? "active" : "trial",
      trialStartDate: now,
      trialEndDate: isMasterAdmin ? null : trialEnd,
      subscriptionStartDate: isMasterAdmin ? now : null,
      subscriptionEndDate: isMasterAdmin ? new Date("2099-12-31") : null,
      planName: isMasterAdmin ? "Admin Lifetime Access" : "Free Trial",
      planPrice: 0,
      autoPayEnabled: false,
      paytmSubscriptionId: "",
      paytmMandateId: "",
      lastPaymentDate: null,
      nextBillingDate: null,
      totalPayments: 0,
      isSubscriptionActive: true,
      isFoundingMember: false,
    });

    pendingRegisters.delete(emailClean);

    res.json({
      success: true,
      msg: isMasterAdmin ? "Register success" : "Register success. Approval pending.",
    });
  } catch (error) {
    console.log("VERIFY OTP ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "OTP verify failed" });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, type = "verify" } = req.body;
    const emailClean = cleanEmail(email);

    if (!emailClean) {
      return res.status(400).json({ success: false, msg: "Email required" });
    }

    if (type === "verify") {
      const pending = pendingRegisters.get(emailClean);
      if (!pending) {
        return res.status(400).json({ success: false, msg: "Register again" });
      }

      const otp = makeOtp();
      pending.otp = otp;
      pending.otpExpires = Date.now() + 10 * 60 * 1000;
      pendingRegisters.set(emailClean, pending);

      await sendMail({
        to: emailClean,
        subject: "BR30 Market Scanner OTP Verification",
        html: otpTemplate(pending.name, otp, "verify"),
      });

      return res.json({ success: true, msg: "OTP resent" });
    }

    return res.status(400).json({ success: false, msg: "Invalid request" });
  } catch (error) {
    console.log("RESEND OTP ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Resend failed" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailClean = cleanEmail(email);

    if (!emailClean || !password) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const user = await User.findOne({ email: emailClean });
    if (!user) {
      return res.status(400).json({ success: false, msg: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, msg: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, msg: "Email verify first" });
    }

    if (!user.isApproved) {
      return res.status(403).json({ success: false, msg: "Approval pending" });
    }

    const now = new Date();
    const isLifetimeAccess = ["admin", "vip"].includes(user.role);

    if (!isLifetimeAccess) {
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

    const token = makeToken(user._id);

    res.json({
      success: true,
      msg: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        subscriptionStatus: user.subscriptionStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        planName: user.planName,
        planPrice: user.planPrice,
        autoPayEnabled: user.autoPayEnabled,
        paytmSubscriptionId: user.paytmSubscriptionId,
        paytmMandateId: user.paytmMandateId,
        lastPaymentDate: user.lastPaymentDate,
        nextBillingDate: user.nextBillingDate,
        totalPayments: user.totalPayments,
        isSubscriptionActive: isLifetimeAccess ? true : user.isSubscriptionActive,
        isFoundingMember: user.isFoundingMember,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Login failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const emailClean = cleanEmail(email);

    if (!emailClean) {
      return res.status(400).json({ success: false, msg: "Email required" });
    }

    const user = await User.findOne({ email: emailClean });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const otp = makeOtp();

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendMail({
      to: emailClean,
      subject: "BR30 Market Scanner Password Reset OTP",
      html: forgotPasswordTemplate(user.name, otp, "reset"),
    });

    res.json({ success: true, msg: "Reset OTP sent" });
  } catch (error) {
    console.log("FORGOT PASSWORD ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Reset OTP failed" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const emailClean = cleanEmail(email);

    if (!emailClean || !otp || !newPassword) {
      return res.status(400).json({ success: false, msg: "All fields required" });
    }

    const user = await User.findOne({
      email: emailClean,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ success: true, msg: "Password reset success" });
  } catch (error) {
    console.log("RESET PASSWORD ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Reset failed" });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password -otp -resetOtp").sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Users load failed" });
  }
};

exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isVerified: true, isApproved: false }).select("-password -otp -resetOtp").sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Pending users load failed" });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select("-password -otp -resetOtp");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    try {
      await sendMail({
        to: user.email,
        subject: "BR30 Market Scanner Account Approved ✅",
        html: approvedTemplate(user.name),
      });
    } catch (mailErr) {
      console.log("APPROVAL MAIL ERROR =>", mailErr.message);
    }

    res.json({ success: true, msg: "User approved", user });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Approve failed" });
  }
};

exports.unapproveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true }).select("-password -otp -resetOtp");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    try {
      await sendMail({
        to: user.email,
        subject: "BR30 Market Scanner Account Unapproved ❌",
        html: unapprovedTemplate(user.name),
      });
    } catch (mailErr) {
      console.log("UNAPPROVE MAIL ERROR =>", mailErr.message);
    }

    res.json({ success: true, msg: "User unapproved", user });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Unapprove failed" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({ success: true, msg: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Delete failed" });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const now = new Date();

    const totalUsers = await User.countDocuments({});
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const approvedUsers = await User.countDocuments({ isApproved: true });
    const pendingUsers = await User.countDocuments({ isVerified: true, isApproved: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    const trialUsers = await User.countDocuments({ subscriptionStatus: "trial" });
    const activeUsers = await User.countDocuments({ subscriptionStatus: "active" });
    const expiredUsers = await User.countDocuments({ subscriptionStatus: "expired" });
    const cancelledUsers = await User.countDocuments({ subscriptionStatus: "cancelled" });

    const trialExpiredUsers = await User.countDocuments({
      subscriptionStatus: "trial",
      trialEndDate: { $lt: now },
    });

    const revenue = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          successPayments: { $sum: 1 },
        },
      },
    ]);

    const pendingRevenue = await Payment.aggregate([
      { $match: { status: { $ne: "success" } } },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: "$amount" },
          pendingPayments: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        approvedUsers,
        pendingUsers,
        blockedUsers,
        trialUsers,
        activeUsers,
        expiredUsers,
        cancelledUsers,
        trialExpiredUsers,
        totalRevenue: revenue[0]?.totalRevenue || 0,
        successPayments: revenue[0]?.successPayments || 0,
        pendingAmount: pendingRevenue[0]?.pendingAmount || 0,
        pendingPayments: pendingRevenue[0]?.pendingPayments || 0,
      },
    });
  } catch (error) {
    console.log("ADMIN STATS ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Admin stats load failed" });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true }).select("-password -otp -resetOtp");

    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    res.json({ success: true, msg: "User blocked", user });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Block failed" });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true }).select("-password -otp -resetOtp");

    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    res.json({ success: true, msg: "User unblocked", user });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Unblock failed" });
  }
};

exports.updateUserSubscription = async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionStartDate, subscriptionEndDate, trialStartDate, trialEndDate, planName, planPrice, autoPayEnabled, isSubscriptionActive, isFoundingMember } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        subscriptionStatus,
        subscriptionStartDate,
        subscriptionEndDate,
        trialStartDate,
        trialEndDate,
        planName,
        planPrice,
        autoPayEnabled,
        isSubscriptionActive,
        isFoundingMember,
      },
      { new: true }
    ).select("-password -otp -resetOtp");

    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    res.json({ success: true, msg: "Subscription updated", user });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Subscription update failed" });
  }
};

exports.sendBulkMail = async (req, res) => {
  try {
    const { target = "all", subject, message, userIds = [] } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        msg: "Subject and message required",
      });
    }

    let query = {};
    const now = new Date();

    if (target === "trial") query = { subscriptionStatus: "trial" };
    if (target === "active") query = { subscriptionStatus: "active" };
    if (target === "expired") query = { subscriptionStatus: "expired" };
    if (target === "cancelled") query = { subscriptionStatus: "cancelled" };
    if (target === "pending") query = { isVerified: true, isApproved: false };

    if (target === "no-payment") {
      query = {
        totalPayments: 0,
        role: "user",
      };
    }

    if (target === "active30") {
      const date30 = new Date(now);
      date30.setDate(date30.getDate() - 30);

      query = {
        subscriptionStatus: "active",
        subscriptionStartDate: { $lte: date30 },
      };
    }

    if (target === "active90") {
      const date90 = new Date(now);
      date90.setDate(date90.getDate() - 90);

      query = {
        subscriptionStatus: "active",
        subscriptionStartDate: { $lte: date90 },
      };
    }

    if (target === "founding") {
      query = {
        isFoundingMember: true,
      };
    }

    if (target === "autopay") {
      query = {
        autoPayEnabled: true,
      };
    }

    if (target === "blocked") {
      query = {
        isBlocked: true,
      };
    }

    if (target === "top-paying") {
      query = {
        totalPayments: { $gte: 3 },
      };
    }

    if (target === "selected" && userIds.length) {
      query = {
        _id: { $in: userIds },
      };
    }

    const users = await User.find(query).select("name email");

    if (!users.length) {
      return res.status(404).json({
        success: false,
        msg: "No users found for this target",
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        await sendMail({
          to: user.email,
          subject,
          html: bulkMailTemplate(user.name, message),
        });

        successCount++;
      } catch (mailErr) {
        failedCount++;
        console.log("BULK MAIL ERROR =>", user.email, mailErr.message);
      }
    }

    res.json({
      success: true,
      msg: `Mail sent to ${successCount} users`,
      count: successCount,
      failedCount,
      target,
      totalMatched: users.length,
    });
  } catch (error) {
    console.log("BULK MAIL ERROR =>", error.message);

    res.status(500).json({
      success: false,
      msg: "Bulk mail failed",
    });
  }
};
