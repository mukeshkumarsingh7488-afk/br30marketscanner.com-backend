require("dotenv").config();

const ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN || "";
const BASE_URL = process.env.UPSTOX_BASE_URL || "https://api.upstox.com/v2";

if (!ACCESS_TOKEN) {
  console.log("⚠️ WARNING: UPSTOX_ACCESS_TOKEN not found");
}

module.exports = {
  BASE_URL,
  ACCESS_TOKEN,
};
