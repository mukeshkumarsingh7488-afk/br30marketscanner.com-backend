const User = require("../models/User");
const Payment = require("../models/Payment");
const { createPaytmSubscription, verifyPaytmChecksum } = require("../services/paytmService");

const MONTHLY_PRICE = 2199;
const FOUNDING_PRICE = 999;
const FOUNDING_LIMIT = 100;

const getPlanPrice = async () => {
  const paidUsers = await User.countDocuments({ role: "user", totalPayments: { $gt: 0 } });

  return {
    price: paidUsers < FOUNDING_LIMIT ? FOUNDING_PRICE : MONTHLY_PRICE,
    isFoundingMember: paidUsers < FOUNDING_LIMIT,
    paidUsers,
    remainingFoundingSlots: Math.max(FOUNDING_LIMIT - paidUsers, 0),
  };
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -otp -resetOtp");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (user.role === "admin") {
      return res.json({ success: true, access: true, subscriptionRequired: false, user });
    }

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
    res.status(500).json({ success: false, msg: "Subscription status failed" });
  }
};

exports.createSubscriptionOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (user.role === "admin") {
      return res.json({ success: true, msg: "Admin does not need subscription" });
    }

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
      rawResponse: paytmRes,
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
    res.status(500).json({ success: false, msg: error.message || "Paytm subscription create failed" });
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

    const userId = req.body.CUST_ID || req.body.custId;
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

    const totalRevenueAgg = await Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]);

    res.json({
      success: true,
      payments,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      successPayments: totalRevenueAgg[0]?.count || 0,
    });
  } catch (error) {
    console.log("GET PAYMENTS ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "Payments load failed" });
  }
};

exports.getUserPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.log("GET USER PAYMENTS ERROR =>", error.message);
    res.status(500).json({ success: false, msg: "User payments load failed" });
  }
};
