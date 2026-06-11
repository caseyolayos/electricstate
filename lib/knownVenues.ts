/**
 * Known electronic music venues with verified coordinates.
 * Used to override incorrect or ambiguous Ticketmaster venue data.
 *
 * Key format: lowercase "venue name::city" (city can be partial)
 * To add a venue: look up coords with https://nominatim.openstreetmap.org
 */

export interface KnownVenue {
  name: string
  address: string
  city: string
  state: string
  lat: number
  lng: number
}

const KNOWN_VENUES: Record<string, KnownVenue> = {
  'time nightclub::costa mesa': {
    name: 'Time Nightclub',
    address: '1875 Newport Blvd, Unit B245',
    city: 'Costa Mesa',
    state: 'CA',
    lat: 33.6427,
    lng: -117.9178,
  },
  'music box::san diego': {
    name: 'Music Box',
    address: '1337 India Street',
    city: 'San Diego',
    state: 'CA',
    lat: 32.71938,
    lng: -117.16813,
  },
  'music box - san diego::san diego': {
    name: 'Music Box',
    address: '1337 India Street',
    city: 'San Diego',
    state: 'CA',
    lat: 32.71938,
    lng: -117.16813,
  },
  'the music box::san diego': {
    name: 'Music Box',
    address: '1337 India Street',
    city: 'San Diego',
    state: 'CA',
    lat: 32.71938,
    lng: -117.16813,
  },
  'waterfront park::san diego': {
    name: 'Waterfront Park',
    address: '1600 Pacific Hwy',
    city: 'San Diego',
    state: 'CA',
    lat: 32.72194,
    lng: -117.17223,
  },
  'waterfront park - san diego::san diego': {
    name: 'Waterfront Park',
    address: '1600 Pacific Hwy',
    city: 'San Diego',
    state: 'CA',
    lat: 32.72194,
    lng: -117.17223,
  },
}

/**
 * Venue name aliases — maps raw TM/EB venue name variants to a canonical display name.
 * Key: lowercase raw name. Value: canonical name to use instead.
 */
const VENUE_NAME_ALIASES: Record<string, string> = {
  'music box - san diego': 'Music Box',
  'the music box': 'Music Box',
  'waterfront park - san diego': 'Waterfront Park',
}

/**
 * Normalize a raw venue name to its canonical form using the alias map.
 * Returns the canonical name if a match is found, otherwise returns the original.
 */
export function canonicalizeVenueName(name: string): string {
  return VENUE_NAME_ALIASES[name.toLowerCase().trim()] ?? name
}

/**
 * Look up a venue by name + city. Returns verified data if found, null otherwise.
 * Matching is case-insensitive and city can be a partial match.
 * Also resolves aliases automatically.
 */
export function lookupKnownVenue(name: string, city: string): KnownVenue | null {
  // Resolve alias first so both "Music Box - San Diego" and "Music Box" hit the same entry
  const resolvedName = canonicalizeVenueName(name)
  const nameLower = resolvedName.toLowerCase().trim()
  const cityLower = city.toLowerCase().trim()

  for (const [key, venue] of Object.entries(KNOWN_VENUES)) {
    const [keyName, keyCity] = key.split('::')
    if (
      nameLower.includes(keyName) || keyName.includes(nameLower)
    ) {
      // City match is optional — if we have a city, it must loosely match
      if (!cityLower || cityLower.includes(keyCity) || keyCity.includes(cityLower)) {
        return venue
      }
    }
  }
  return null
}
