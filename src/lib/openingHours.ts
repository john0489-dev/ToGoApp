// Helper to check whether a restaurant is currently open, based on Google
// Places "periods" cached on the restaurant row.
//
// Format (from Google Place Details API):
//   periods: [{ open: { day: 0-6, time: "HHMM" }, close?: { day, time } }]
// day: 0 = Sunday, 6 = Saturday
// A 24h venue returns a single period { open: { day: 0, time: "0000" } } with no close.

export type GooglePeriod = {
  open: { day: number; time: string };
  close?: { day: number; time: string };
};

export type OpeningHours = { periods: GooglePeriod[] } | null | undefined;

function toMinutes(day: number, time: string): number {
  const h = parseInt(time.slice(0, 2), 10) || 0;
  const m = parseInt(time.slice(2, 4), 10) || 0;
  return day * 24 * 60 + h * 60 + m;
}

/**
 * Returns true if the restaurant is open at `now` (defaults to current time)
 * according to its cached Google Places periods. Returns null when hours are
 * unknown so callers can decide how to display them.
 */
export function isOpenNow(hours: OpeningHours, now: Date = new Date()): boolean | null {
  if (!hours || !Array.isArray(hours.periods) || hours.periods.length === 0) {
    return null;
  }

  // 24/7 marker: one period with open Sunday 00:00 and no close
  if (hours.periods.length === 1 && !hours.periods[0].close && hours.periods[0].open?.time === "0000") {
    return true;
  }

  const day = now.getDay();
  const nowMin = day * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  const weekMin = 7 * 24 * 60;

  for (const p of hours.periods) {
    if (!p.open || !p.close) continue;
    let start = toMinutes(p.open.day, p.open.time);
    let end = toMinutes(p.close.day, p.close.time);
    // Handle ranges that wrap past Saturday → Sunday
    if (end <= start) end += weekMin;

    if (nowMin >= start && nowMin < end) return true;
    // Also test the wrap-around case (e.g. previous-week period extending into today)
    if (nowMin + weekMin >= start && nowMin + weekMin < end) return true;
  }

  return false;
}
