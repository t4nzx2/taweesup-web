// Thai time helper (UTC+7) — works regardless of server timezone (e.g. Render is UTC)
function thaiNow() {
  const now = new Date();
  const thai = new Date(now.getTime() + 7 * 3600 * 1000);
  return {
    date: thai.toISOString().slice(0, 10),       // YYYY-MM-DD
    time: thai.toISOString().slice(11, 19),       // HH:MM:SS
    iso: thai,
  };
}

module.exports = { thaiNow };
