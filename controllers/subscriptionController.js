const User = require("../models/User");
const Payment = require("../models/Payment");
const { createPaytmSubscription, verifyPaytmChecksum } = require("../services/paytmService");

const sendMail = require("../utils/mailHelper");

const { br30BaseIndicatorTemplate } = require("../utils/mailTemplates");

const MONTHLY_PRICE = 2199;
const FOUNDING_PRICE = 999;
const FOUNDING_LIMIT = 100;

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-IN");
  } catch {
    return "-";
  }
};

const getPlanPrice = async () => {
  const paidUsers = await User.countDocuments({
    role: "user",
    totalPayments: { $gt: 0 },
  });

  return {
    price: paidUsers < FOUNDING_LIMIT ? FOUNDING_PRICE : MONTHLY_PRICE,
    isFoundingMember: paidUsers < FOUNDING_LIMIT,
    paidUsers,
    remainingFoundingSlots: Math.max(FOUNDING_LIMIT - paidUsers, 0),
  };
};

const sendInfinityAccessMails = async (user) => {
  try {
    await sendMail({
      to: user.email,
      subject: "BR30 Infinity Sniper Access Request Received",
      html: br30BaseIndicatorTemplate({
        name: user.name,
        tradingViewUsername: user.tradingViewUsername || "-",
        planName: user.planName,
        subscriptionEndDate: fmtDate(user.subscriptionEndDate || user.trialEndDate),
      }),
    });

    if (process.env.ADMIN_EMAIL) {
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: "New TradingView Access Request - BR30 Infinity Sniper",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;">
            <h2>New BR30 Infinity Sniper Access Request</h2>
            <p><b>Name:</b> ${user.name}</p>
            <p><b>Email:</b> ${user.email}</p>
            <p><b>TradingView Username:</b> ${user.tradingViewUsername || "-"}</p>
            <p><b>Plan:</b> ${user.planName}</p>
            <p><b>Plan Price:</b> ₹${user.planPrice}</p>
            <p><b>Valid Till:</b> ${fmtDate(user.subscriptionEndDate || user.trialEndDate)}</p>
            <p><b>Indicator:</b> ${user.indicatorName || "BR30 Infinity Sniper"}</p>
            <p><b>Indicator Status:</b> ${user.indicatorAccess || "pending"}</p>
          </div>
        `,
      });
    }
  } catch (mailErr) {
    console.log("INFINITY ACCESS MAIL ERROR =>", mailErr.message);
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -otp -resetOtp");

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.role === "admin" || user.role === "vip") {
      return res.json({
        success: true,
        access: true,
        subscriptionRequired: false,
        user,
      });
    }

    const now = new Date();

    if (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) < now) {
      user.subscriptionStatus = "expired";
      user.isSubscriptionActive = false;

      if (user.indicatorAccess === "active") {
        user.indicatorAccess = "expired";
        user.indicatorExpiredAt = now;
      }

      await user.save();
    }

    if (user.subscriptionStatus === "active" && user.subscriptionEndDate && new Date(user.subscriptionEndDate) < now) {
      user.subscriptionStatus = "expired";
      user.isSubscriptionActive = false;

      if (user.indicatorAccess === "active") {
        user.indicatorAccess = "expired";
        user.indicatorExpiredAt = now;
      }

      await user.save();
    }

    const pricing = await getPlanPrice();

    const access = user.subscriptionStatus === "active" || (user.subscriptionStatus === "trial" && user.trialEndDate && new Date(user.trialEndDate) > now);

    res.json({
      success: true,
      access,
      subscriptionRequired: !access,
      pricing,
      user,
    });
  } catch (error) {
    console.log("SUBSCRIPTION STATUS ERROR =>", error.message);
    res.status(500).json({
      success: false,
      msg: "Subscription status failed",
    });
  }
};

exports.createSubscriptionOrder = async (req, res) => {
  try {
    const { tradingViewUsername } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (user.role === "admin" || user.role === "vip") {
      return res.json({
        success: true,
        msg: "Admin/VIP does not need subscription",
      });
    }

    const tvUsername = String(tradingViewUsername || "").trim();

    if (!tvUsername) {
      return res.status(400).json({
        success: false,
        msg: "TradingView username is required for BR30 Infinity Sniper access",
      });
    }

    user.tradingViewUsername = tvUsername;
    user.indicatorAccess = "pending";
    user.indicatorName = "BR30 Infinity Sniper";
    user.indicatorExpiredAt = null;
    user.indicatorRejectedAt = null;

    await user.save();

    const pricing = await getPlanPrice();

    const orderId = `BR30ORD${Date.now()}`;
    const subscriptionId = `BR30SUB${Date.now()}`;
    const planName = pricing.isFoundingMember ? "BR30 Scanner Founding Plan" : "BR30 Scanner Pro";

    const paytmRes = await createPaytmSubscription({
      user,
      amount: pricing.price,
      orderId,
      subscriptionId,
    });

    await Payment.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      gateway: "paytm",
      orderId,
      transactionId: "",
      subscriptionId,
      mandateId: "",
      planName,
      amount: pricing.price,
      currency: "INR",
      status: "created",
      paymentMode: "",
      paymentDate: new Date(),
      rawResponse: {
        paytm: paytmRes,
        tradingViewUsername: user.tradingViewUsername,
      },
    });

    res.json({
      success: true,
      gateway: "paytm",
      orderId,
      subscriptionId,
      amount: pricing.price,
      isFoundingMember: pricing.isFoundingMember,
      remainingFoundingSlots: pricing.remainingFoundingSlots,
      paytm: paytmRes,
    });
  } catch (error) {
    console.log("CREATE PAYTM SUBSCRIPTION ERROR =>", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      msg: error.message || "Paytm subscription create failed",
    });
  }
};

exports.paytmCallback = async (req, res) => {
  try {
    const isValid = await verifyPaytmChecksum(req.body);

    const { ORDERID, SUBS_ID, STATUS, TXNID, PAYMENTMODE } = req.body;

    if (!isValid) {
      if (ORDERID) {
        await Payment.findOneAndUpdate(
          { orderId: ORDERID },
          {
            status: "failed",
            rawResponse: req.body,
            paymentDate: new Date(),
          },
          { new: true }
        );
      }

      return res.redirect(`${process.env.FRONTEND_URL}/subscription?status=failed`);
    }

    if (STATUS !== "TXN_SUCCESS") {
      await Payment.findOneAndUpdate(
        { orderId: ORDERID },
        {
          status: "failed",
          rawResponse: req.body,
          paymentDate: new Date(),
        },
        { new: true }
      );

      return res.redirect(`${process.env.FRONTEND_URL}/subscription?status=failed`);
    }

    const paymentDoc = await Payment.findOne({ orderId: ORDERID });
    const userId = req.body.CUST_ID || req.body.custId || paymentDoc?.userId;
    const user = await User.findById(userId);

    if (!user) {
      await Payment.findOneAndUpdate(
        { orderId: ORDERID },
        {
          status: "failed",
          rawResponse: req.body,
          paymentDate: new Date(),
        },
        { new: true }
      );

      return res.redirect(`${process.env.FRONTEND_URL}/subscription?status=user_not_found`);
    }

    const pricing = await getPlanPrice();
    const now = new Date();
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.subscriptionStatus = "active";
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = nextBilling;
    user.planName = pricing.isFoundingMember ? "BR30 Scanner Founding Plan" : "BR30 Scanner Pro";
    user.planPrice = pricing.price;
    user.autoPayEnabled = true;
    user.paytmSubscriptionId = SUBS_ID || "";
    user.paytmMandateId = ORDERID || "";
    user.lastPaymentDate = now;
    user.nextBillingDate = nextBilling;
    user.totalPayments = Number(user.totalPayments || 0) + 1;
    user.isSubscriptionActive = true;
    user.isFoundingMember = pricing.isFoundingMember;

    user.indicatorAccess = "pending";
    user.indicatorName = "BR30 Infinity Sniper";
    user.indicatorApprovedAt = null;
    user.indicatorExpiredAt = null;
    user.indicatorRejectedAt = null;
    user.indicatorMailSentAt = null;

    await user.save();

    await Payment.findOneAndUpdate(
      { orderId: ORDERID },
      {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        gateway: "paytm",
        orderId: ORDERID,
        transactionId: TXNID || req.body.txnId || "",
        subscriptionId: SUBS_ID || "",
        mandateId: ORDERID || "",
        planName: user.planName,
        amount: user.planPrice,
        currency: "INR",
        status: "success",
        paymentMode: PAYMENTMODE || req.body.paymentMode || "",
        paymentDate: now,
        rawResponse: req.body,
      },
      { upsert: true, new: true }
    );

    await sendInfinityAccessMails(user);

    res.redirect(`${process.env.FRONTEND_URL}/?subscription=success`);
  } catch (error) {
    console.log("PAYTM CALLBACK ERROR =>", error.message);

    try {
      if (req.body?.ORDERID) {
        await Payment.findOneAndUpdate(
          { orderId: req.body.ORDERID },
          {
            status: "failed",
            rawResponse: req.body,
            paymentDate: new Date(),
          },
          { new: true }
        );
      }
    } catch (paymentErr) {
      console.log("PAYMENT FAILED SAVE ERROR =>", paymentErr.message);
    }

    res.redirect(`${process.env.FRONTEND_URL}/subscription?status=error`);
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(500);

    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      payments,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      successPayments: totalRevenueAgg[0]?.count || 0,
    });
  } catch (error) {
    console.log("GET PAYMENTS ERROR =>", error.message);
    res.status(500).json({
      success: false,
      msg: "Payments load failed",
    });
  }
};

exports.getUserPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.log("GET USER PAYMENTS ERROR =>", error.message);
    res.status(500).json({
      success: false,
      msg: "User payments load failed",
    });
  }
};

// demo route to activate subscription without payment - for testing and support purposes only
exports.mockActivateSubscription = async (req, res) => {
  try {
    const { tradingViewUsername } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    const now = new Date();
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.tradingViewUsername = String(tradingViewUsername || user.tradingViewUsername || "").trim();

    user.subscriptionStatus = "active";
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = nextBilling;

    user.planName = "BR30 Demo Plan";
    user.planPrice = 999;

    user.autoPayEnabled = false;
    user.lastPaymentDate = now;
    user.nextBillingDate = nextBilling;

    user.totalPayments = Number(user.totalPayments || 0) + 1;
    user.isSubscriptionActive = true;

    user.indicatorName = "BR30 Infinity Sniper";
    user.indicatorAccess = "pending";

    user.indicatorApprovedAt = null;
    user.indicatorExpiredAt = null;
    user.indicatorRejectedAt = null;

    await user.save();

    await sendInfinityAccessMails(user);

    return res.json({
      success: true,
      msg: "Demo subscription activated",
      user,
    });
  } catch (error) {
    console.log("MOCK SUB ERROR =>", error.message);

    res.status(500).json({
      success: false,
      msg: "Mock activation failed",
    });
  }
};
