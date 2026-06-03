require("dotenv").config();

module.exports = {
  BASE_URL: "https://api.upstox.com/v2",
  ACCESS_TOKEN: process.env.UPSTOX_ACCESS_TOKEN,
};
