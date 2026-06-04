const { setMarketData } = require("./marketCache");
const { fetchBybitCryptoRows } = require("./bybitService");
const { fetchTwelveDataRows } = require("./twelveDataService");

let started = false;

const TWELVE_MARKETS = ["forex-majors", "forex-cross", "metals", "commodities", "global-index", "us-stocks", "us-etfs"];

const INTERVALS = {
  crypto: Number(process.env.CRYPTO_REFRESH_MS || 5000),
  twelve: Number(process.env.TWELVE_REFRESH_MS || 60000),
};

async function safeRun(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.log(`MARKET ENGINE ERROR [${name}] =>`, err.message);
  }
}

async function updateCrypto() {
  const rows = await fetchBybitCryptoRows();

  if (rows.length) {
    setMarketData("crypto-futures", rows, {
      source: "bybit",
      status: "ok",
    });

    console.log(`✅ Crypto cache updated: ${rows.length}`);
  } else {
    setMarketData("crypto-futures", [], {
      source: "bybit",
      status: "empty",
      error: "No crypto data",
    });

    console.log("⚠️ Crypto cache empty");
  }
}

async function updateTwelveMarket(market) {
  const rows = await fetchTwelveDataRows(market);

  if (rows.length) {
    setMarketData(market, rows, {
      source: "twelvedata",
      status: "ok",
    });

    console.log(`✅ ${market} cache updated: ${rows.length}`);
  } else {
    setMarketData(market, [], {
      source: "twelvedata",
      status: "empty",
      error: "No TwelveData rows",
    });

    console.log(`⚠️ ${market} cache empty`);
  }
}

async function updateAllTwelveMarkets() {
  for (const market of TWELVE_MARKETS) {
    await safeRun(market, () => updateTwelveMarket(market));
  }
}

function startMarketEngine() {
  if (started) return;
  started = true;

  console.log("🚀 BR30 Market Engine Starting...");

  safeRun("crypto-first-load", updateCrypto);
  safeRun("twelve-first-load", updateAllTwelveMarkets);

  setInterval(() => {
    safeRun("crypto-interval", updateCrypto);
  }, INTERVALS.crypto);

  setInterval(() => {
    safeRun("twelve-interval", updateAllTwelveMarkets);
  }, INTERVALS.twelve);

  console.log(`✅ Market Engine Started | Crypto ${INTERVALS.crypto}ms | TwelveData ${INTERVALS.twelve}ms`);
}

module.exports = {
  startMarketEngine,
};
