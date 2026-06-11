/**
 * Static lookup: festival slug → country metadata.
 * Used to display flag badges on international events without a DB schema change.
 * US festivals are omitted (no badge shown for domestic events).
 */

export interface CountryInfo {
  countryCode: string   // ISO 3166-1 alpha-2
  countryName: string
}

const INTERNATIONAL_FESTIVALS: Record<string, CountryInfo> = {
  // Belgium
  'tomorrowland-weekend-1':       { countryCode: 'BE', countryName: 'Belgium' },
  'tomorrowland-weekend-2':       { countryCode: 'BE', countryName: 'Belgium' },

  // Croatia
  'ultra-europe':                 { countryCode: 'HR', countryName: 'Croatia' },

  // Netherlands
  'awakenings-festival':          { countryCode: 'NL', countryName: 'Netherlands' },

  // United Kingdom
  'creamfields':                  { countryCode: 'GB', countryName: 'UK' },

  // Japan
  'ultra-japan':                  { countryCode: 'JP', countryName: 'Japan' },

  // South Korea
  'edc-korea':                    { countryCode: 'KR', countryName: 'South Korea' },

  // Colombia
  'edc-colombia':                 { countryCode: 'CO', countryName: 'Colombia' },

  // Thailand
  'edc-thailand':                 { countryCode: 'TH', countryName: 'Thailand' },

  // Mexico
  'edc-mexico':                   { countryCode: 'MX', countryName: 'Mexico' },
}

/** Convert ISO 3166-1 alpha-2 code to flag emoji. */
export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

/** Returns country info for a given festival slug, or undefined for domestic events. */
export function getCountryInfo(slug: string | null | undefined): CountryInfo | undefined {
  if (!slug) return undefined
  return INTERNATIONAL_FESTIVALS[slug]
}
