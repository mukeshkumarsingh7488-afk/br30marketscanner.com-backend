const axios = require("axios");
const PaytmChecksum = require("paytmchecksum");

const isProd = process.env.PAYTM_ENV === "PROD";

const PAYTM_HOST = isProd ? "https://securegw.paytm.in" : "https://securegw-stage.paytm.in";

const createPaytmSubscription = async ({ user, amount, orderId, subscriptionId }) => {
  const mid = process.env.PAYTM_MID;
  const key = process.env.PAYTM_MERCHANT_KEY;

  if (!mid || !key) throw new Error("Paytm MID or Merchant Key missing");

  const paytmParams = {
    body: {
      requestType: "SUBSCRIPTION",
      mid,
      websiteName: process.env.PAYTM_WEBSITE || "WEBSTAGING",
      orderId,
      subscriptionId,
      callbackUrl: process.env.PAYTM_CALLBACK_URL,
      txnAmount: {
        value: String(amount),
        currency: "INR",
      },
      userInfo: {
        custId: String(user._id),
        email: user.email,
        firstName: user.name,
      },
      subscriptionInfo: {
        subscriptionFrequency: "1",
        subscriptionFrequencyUnit: "MONTH",
        subscriptionExpiryDate: "2035-12-31",
        subscriptionEnableRetry: "1",
        subscriptionAmountType: "FIX",
        subscriptionMaxAmount: String(amount),
      },
    },
  };

  const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), key);

  paytmParams.head = {
    signature: checksum,
  };

  const url = `${PAYTM_HOST}/subscription/create?mid=${mid}&orderId=${orderId}`;

  const response = await axios.post(url, paytmParams, {
    headers: { "Content-Type": "application/json" },
  });

  return response.data;
};

const verifyPaytmChecksum = async (body) => {
  const paytmChecksum = body.CHECKSUMHASH;
  const paytmParams = { ...body };
  delete paytmParams.CHECKSUMHASH;

  return PaytmChecksum.verifySignature(paytmParams, process.env.PAYTM_MERCHANT_KEY, paytmChecksum);
};

module.exports = { createPaytmSubscription, verifyPaytmChecksum };
