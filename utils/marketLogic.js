function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function signal(move, oi, volume = 0) {
  move = num(move);
  oi = num(oi);
  volume = num(volume);

  if (move >= 2 && oi >= 7 && volume >= 2) return "BUY 🔥 Strong Long Build-Up";
  if (move <= -2 && oi >= 7 && volume >= 2) return "SELL 🔥 Strong Short Build-Up";

  if (move >= 2 && oi >= 7) return "BUY Long Build-Up";
  if (move <= -2 && oi >= 7) return "SELL Short Build-Up";

  if (move >= 2 && oi <= -7) return "BUY Short Covering";
  if (move <= -2 && oi <= -7) return "SELL Long Unwinding";

  if (move >= 2) return "BUY Top Gainer";
  if (move <= -2) return "SELL Top Loser";

  return "WAIT Watchlist";
}

function score(move, oi, volume = 0) {
  return Number((Math.abs(num(move)) + Math.abs(num(oi)) + num(volume)).toFixed(2));
}

module.exports = { num, signal, score };
