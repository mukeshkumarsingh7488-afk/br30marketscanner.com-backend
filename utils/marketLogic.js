function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function signal(move, oi, volume = 0) {
  if (move >= 2 && oi >= 7 && volume >= 2) return "🔥 Strong Long Build-Up";
  if (move <= -2 && oi >= 7 && volume >= 2) return "🔥 Strong Short Build-Up";
  if (move >= 2 && oi >= 7) return "Long Build-Up";
  if (move <= -2 && oi >= 7) return "Short Build-Up";
  if (move >= 2 && oi <= -7) return "Short Covering";
  if (move <= -2 && oi <= -7) return "Long Unwinding";
  if (move >= 2) return "Top Gainer";
  if (move <= -2) return "Top Loser";
  return "Watchlist";
}

function score(move, oi, volume = 0) {
  return Number((Math.abs(num(move)) + Math.abs(num(oi)) + num(volume)).toFixed(2));
}

module.exports = { num, signal, score };
