export interface Organizer {
  id: string
  slug: string
  name: string
  description?: string
  founded_year?: number
  key_people?: { name: string; role: string }[]
  logo_url?: string
  website?: string
  genres?: string[]
  instagram?: string
  twitter?: string
}

export interface Event {
  lat?: number
  lng?: number
  id: string
  name: string
  venue: string
  city: string
  date: string
  date_end?: string
  time: string
  genre: string[]
  ticketLink: string
  source: 'AI Found' | 'Community Submitted' | 'Verified'
  description: string
  lineup: string[]
  lineupByDay?: { day: string; artists: string[] }[]
  gradient: string
  imageUrl?: string
  lineupImageUrl?: string
  status: 'approved' | 'pending' | 'rejected'
  dates_confirmed?: boolean
  featured?: boolean
  event_type?: 'mainstream' | 'underground'
  neighborhood?: string
  full_address?: string
  reveal_at?: string
  cover_charge?: string
  minPrice?: number   // lowest available ticket price in dollars (0 = free)
  submitted_by?: string // user id of the person who submitted (community events)
  youtube_video_id?: string // pinned YouTube video ID (bypasses search)
  livestreams?: { label: string; url: string }[] // active stage live streams
  slug?: string              // festival slug (used for country lookup etc.)
  country_code?: string      // ISO 3166-1 alpha-2 — set for international festivals
  country_name?: string      // Human-readable country name
  organizer_slug?: string    // slug FK → organizers.slug
  organizer_name?: string    // free-text organizer name (community events / unlinked)
  organizer?: Organizer      // joined organizer record
}

export const mockEvents: Event[] = []/*[
  {
    id: 'evt-001',
    name: 'Deep Frequencies Vol. 12',
    venue: 'Exchange LA',
    city: 'Los Angeles',
    date: '2026-05-02',
    time: '10:00 PM',
    genre: ['House', 'Techno'],
    ticketLink: '#',
    source: 'Verified',
    description:
      'The legendary Deep Frequencies series returns for its 12th installment at Exchange LA. Expect a marathon session of deep, hypnotic house and techno from the underground\'s finest selectors. Sound system: d&b audiotechnik. Doors at 10 PM, music until 6 AM.',
    lineup: ['Dixon', 'Âme', 'Move D', 'Zip'],
    gradient: 'from-[#0A0A0A] to-[#1A1A00]',
    status: 'approved',
  },
  {
    id: 'evt-002',
    name: 'Bass Temple',
    venue: 'The Novo',
    city: 'Los Angeles',
    date: '2026-05-09',
    time: '8:00 PM',
    genre: ['Bass', 'Dubstep'],
    ticketLink: '#',
    source: 'AI Found',
    description:
      'Bass Temple descends on The Novo for a night of earth-shaking bass music. From wobbling dubstep to future bass and beyond, this is a full sensory assault. Sub-bass will be felt in your chest. Ear protection recommended.',
    lineup: ['Skream', 'Benga', 'Digital Mystikz', 'Mala'],
    gradient: 'from-[#0A0A0A] to-pink-900',
    status: 'approved',
  },
  {
    id: 'evt-003',
    name: 'Trance Nation OC',
    venue: 'Yost Theater',
    city: 'Santa Ana',
    date: '2026-05-16',
    time: '9:00 PM',
    genre: ['Trance'],
    ticketLink: '#',
    source: 'Community Submitted',
    description:
      'Orange County\'s premier trance night brings the euphoria to Yost Theater. Uplifting, progressive, and psytrance across two rooms. Let the melodies carry you through the night. This is the sound of pure emotion.',
    lineup: ['Ferry Corsten', 'Paul van Dyk', 'ATB'],
    gradient: 'from-cyan-900 to-[#001A00]',
    status: 'approved',
  },
  {
    id: 'evt-004',
    name: 'Warehouse Series: DNB Edition',
    venue: 'Secret Warehouse',
    city: 'Anaheim',
    date: '2026-05-23',
    time: '10:00 PM',
    genre: ['DNB'],
    ticketLink: '#',
    source: 'AI Found',
    description:
      'Location revealed 48 hours before. The Warehouse Series DNB Edition brings liquid, neurofunk, and jump-up under one roof in an undisclosed Anaheim industrial space. Raw, underground, uncompromising. Sign up to the mailing list for location drop.',
    lineup: ['Chase & Status', 'Shy FX', 'Friction', 'Calibre'],
    gradient: 'from-gray-900 to-green-900',
    status: 'approved',
  },
  {
    id: 'evt-005',
    name: 'Neon Nights',
    venue: 'Academy LA',
    city: 'Los Angeles',
    date: '2026-05-30',
    time: '9:00 PM',
    genre: ['House'],
    ticketLink: '#',
    source: 'Verified',
    description:
      'Neon Nights is a curated house music experience in the heart of Hollywood. Deep house, soulful house, and jackin\' grooves in an intimate setting. The Academy\'s state-of-the-art sound system brings every bassline to life. Dress code enforced.',
    lineup: ['DJ Koze', 'Floating Points', 'Helena Hauff'],
    gradient: 'from-violet-900 to-[#001A00]',
    status: 'approved',
  },
  {
    id: 'evt-006',
    name: 'Subculture Underground',
    venue: '1720',
    city: 'Los Angeles',
    date: '2026-05-08',
    time: '11:00 PM',
    genre: ['Techno'],
    ticketLink: '#',
    source: 'AI Found',
    description:
      'Subculture Underground returns to 1720 with a lineup of techno\'s most respected selectors. Industrial textures, dark atmospheres, and relentless rhythm. No phones on the dancefloor. Pure techno, pure focus.',
    lineup: ['Surgeon', 'Paula Temple', 'Ancient Methods', 'Blawan'],
    gradient: 'from-zinc-900 to-[#1A1A00]',
    status: 'approved',
  },
  {
    id: 'evt-007',
    name: 'Festival Throwdown',
    venue: 'Doheny State Beach',
    city: 'Dana Point',
    date: '2026-05-24',
    time: '12:00 PM',
    genre: ['House', 'Trance', 'Bass'],
    ticketLink: '#',
    source: 'Verified',
    description:
      'A full-day outdoor festival on the shores of Dana Point. Three stages, ocean views, and a lineup spanning house, trance, and bass. VIP beach cabanas available. Food village, art installations, and sunset set from the main stage. Bring sunscreen.',
    lineup: ['Eric Prydz', 'Above & Beyond', 'Deadmau5', 'Fisher'],
    gradient: 'from-orange-900 to-pink-900',
    status: 'approved',
  },
  {
    id: 'evt-008',
    name: 'Late Night Frequencies',
    venue: 'Catch One',
    city: 'Los Angeles',
    date: '2026-05-15',
    time: '11:00 PM',
    genre: ['Techno', 'House'],
    ticketLink: '#',
    source: 'Community Submitted',
    description:
      'After hours at the iconic Catch One. Late Night Frequencies is a community-run event celebrating LA\'s underground heritage. Expect eclectic programming from local selectors and surprise guests. The historic venue sets the perfect tone for an intimate night.',
    lineup: ['Jasper James', 'Objekt', 'Call Super'],
    gradient: 'from-slate-900 to-indigo-900',
    status: 'approved',
  },
]*/

// image: drop a file into public/stamps/<id>.webp (or .webp/.svg) and set the path here.
// Leave as null to fall back to the emoji until the stamp graphic is ready.
export const STAMPS = [
  { id: 'early-supporter',    emoji: '⚡', name: 'Early Supporter',    desc: 'One of the first',                              image: '/stamps/early-supporter.webp' },
  { id: 'first-checkin',      emoji: '🎫', name: 'First Check-In',      desc: 'Checked in to your first event',                image: '/stamps/first-checkin.webp' },
  { id: 'scene-regular',      emoji: '🎵', name: 'Scene Regular',       desc: 'Attended 3+ events',                            image: '/stamps/scene-regular.webp' },
  { id: 'plugged-in',         emoji: '🔌', name: 'Plugged In',          desc: 'Saved 5+ events',                               image: '/stamps/plugged-in.webp' },
  { id: 'warehouse-survivor', emoji: '🏭', name: 'Warehouse Survivor',  desc: 'Checked in at a warehouse',                     image: '/stamps/warehouse-survivor.webp' },
  { id: 'house-head',         emoji: '🏠', name: 'House Head',          desc: 'Deep in the house scene',                       image: '/stamps/house-head.webp' },
  { id: 'bass-addict',        emoji: '🔊', name: 'Bass Addict',         desc: "Can't resist the bass",                         image: '/stamps/bass-addict.webp' },
  { id: 'festival-alumni',    emoji: '🏆', name: 'Festival Alumni',     desc: 'Attended the same festival 2+ years running',   image: '/stamps/festival-alumni.webp' },
]

/** @deprecated use STAMPS */
export const BADGES = STAMPS
