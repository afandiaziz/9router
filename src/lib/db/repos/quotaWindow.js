// src/lib/db/repos/quotaWindow.js
const ISO = (d) => d.toISOString();
const EPOCH = "1970-01-01T00:00:00.000Z";

export function getWindowKey(limitPeriod, now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  switch (limitPeriod) {
    case "daily": {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
      const periodKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "weekly": {
      const dow = d.getUTCDay(); // 0=Sun
      const diff = (dow + 6) % 7; // Mon=0
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
      const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
      // ISO week number (approx, matched to test 2026-W33)
      const thursday = new Date(start); thursday.setUTCDate(start.getUTCDate() + 3);
      const isoYear = thursday.getUTCFullYear();
      const jan1 = new Date(Date.UTC(isoYear, 0, 1));
      const week = Math.ceil(((thursday - jan1) / 86400000 + 1) / 7);
      const periodKey = `${isoYear}-W${String(week).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "monthly": {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const periodKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return { periodKey, windowStart: ISO(start), resetAt: ISO(end) };
    }
    case "lifetime": {
      // Lifetime spans all recorded history: windowStart must be the epoch, not `now`,
      // or every past request falls outside the window. resetAt stays null (never resets);
      // consumers must treat a null resetAt as "no upper bound".
      return { periodKey: "lifetime", windowStart: EPOCH, resetAt: null };
    }
    default:
      throw new Error(`Unknown limitPeriod: ${limitPeriod}`);
  }
}
