const axios = require("axios");
const { BASE_URL, ACCESS_TOKEN } = require("../config/upstoxConfig");

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  },
});

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

async function getFullMarketQuotes(instrumentKeys = []) {
  if (!ACCESS_TOKEN) throw new Error("UPSTOX_ACCESS_TOKEN missing in .env");

  const chunks = chunkArray(instrumentKeys, 500);
  const finalData = {};

  for (const chunk of chunks) {
    const res = await api.get("/market-quote/quotes", {
      params: { instrument_key: chunk.join(",") },
    });
    // console.log(JSON.stringify(res.data, null, 2));
    Object.assign(finalData, res.data?.data || {});
  }

  return finalData;
}

module.exports = { getFullMarketQuotes };
