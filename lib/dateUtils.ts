/**
 * Returns today's date string (YYYY-MM-DD) in Pacific Time (America/Los_Angeles).
 *
 * Using new Date().toISOString() on the server gives a UTC date, which at
 * 5pm PDT is already "tomorrow" in UTC — causing today's events to vanish
 * from the feed hours before they actually end.
 *
 * Use this everywhere we need a "today" cutoff for event filtering.
 */
export function getTodayPacific(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date())
}
