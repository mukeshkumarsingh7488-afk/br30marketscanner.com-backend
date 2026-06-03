const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    userEmail: String,

    gateway: { type: String, default: "paytm" },
    orderId: String,
    transactionId: String,
    subscriptionId: String,
    mandateId: String,

    planName: String,
    amount: Number,
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "success", "failed", "cancelled", "refunded"],
      default: "created",
    },

    paymentMode: String,
    paymentDate: Date,
    rawResponse: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
