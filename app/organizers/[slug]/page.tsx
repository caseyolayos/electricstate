import { createServerClient } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { Event } from '@/lib/mockData'
import confirmedFestivals from '@/lib/confirmedFestivals.json'

const CONFIRMED_SLUGS = new Set(confirmedFestivals.confirmed)

interface KeyPerson {
  name: string
  role: string
}

interface OrganizerRow {
  id: string
  slug: string
  name: string
  description: string | null
  founded_year: number | null
  key_people: KeyPerson[] | null
  logo_url: string | null
  website: string | null
  genres: string[] | null
  instagram: string | null
  twitter: string | null
}

interface FestivalRow {
  id: string
  name: string
  city: string | null
  date_start: string
  date_end: string | null
  image_url: string | null
  slug: string | null
  genre: string[] | null
  status: string
}

function formatDateRange(start: string, end?: string | null) {
  const s = new Date(start + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!end || end === start) return s.toLocaleDateString('en-US', opts)
  const e = new Date(end + 'T00:00:00')
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${s.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('organizers')
    .select('name, description')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!data) return { title: 'Organizer | Electric State' }

  return {
    title: `${data.name} | Electric State`,
    description: data.description?.slice(0, 160) ?? `${data.name} — festival organizer profile on Electric State.`,
  }
}

export default async function OrganizerPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient()

  // Fetch organizer
  const { data: organizer } = await supabase
    .from('organizers')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle<OrganizerRow>()

  if (!organizer) notFound()

  // Fetch their upcoming festivals
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  const { data: upcomingFestivals } = await supabase
    .from('festivals')
    .select('id, name, city, date_start, date_end, image_url, slug, genre, status')
    .eq('organizer_slug', params.slug)
    .eq('status', 'approved')
    .or(`date_end.gte.${today},and(date_end.is.null,date_start.gte.${today})`)
    .order('date_start', { ascending: true })
    .limit(20)

  // Fetch past festivals (last 3 years for context)
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
  const pastCutoff = threeYearsAgo.toISOString().slice(0, 10)

  const { data: pastFestivals } = await supabase
    .from('festivals')
    .select('id, name, city, date_start, date_end, image_url, slug, genre, status')
    .eq('organizer_slug', params.slug)
    .eq('status', 'approved')
    .lt('date_start', today)
    .gte('date_start', pastCutoff)
    .order('date_start', { ascending: false })
    .limit(10)

  const initials = organizer.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050505' }}>
      {/* Back */}
      <div className="px-4 pt-4">
        <Link
          href="javascript:history.back()"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {/* Hero */}
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4 mb-6">
          {/* Logo / initials */}
          <div
            className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center font-black text-2xl"
            style={{
              background: organizer.logo_url
                ? 'transparent'
                : 'linear-gradient(135deg, rgba(200,255,0,0.2), rgba(200,255,0,0.05))',
              border: '1px solid rgba(200,255,0,0.2)',
            }}
          >
            {organizer.logo_url
              ? <img src={organizer.logo_url} alt={organizer.name} className="w-full h-full object-cover" />
              : <span style={{ color: '#C8FF00' }}>{initials}</span>
            }
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1">Organizer</p>
            <h1 className="text-2xl font-black text-white leading-tight">{organizer.name}</h1>
            {organizer.founded_year && (
              <p className="text-white/40 text-sm mt-1">Est. {organizer.founded_year} · {new Date().getFullYear() - organizer.founded_year}+ years in the game</p>
            )}
          </div>
        </div>

        {/* Genre pills */}
        {organizer.genres && organizer.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {organizer.genres.map((g: string) => (
              <span
                key={g}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)', color: '#C8FF00' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {organizer.description && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-white/70 text-sm leading-relaxed">{organizer.description}</p>
          </div>
        )}

        {/* Key People */}
        {organizer.key_people && organizer.key_people.length > 0 && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Key People</h2>
            <div className="flex flex-col gap-2.5">
              {organizer.key_people.map((person: KeyPerson, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-white font-medium text-sm">{person.name}</span>
                  <span className="text-white/40 text-xs">{person.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {(organizer.website || organizer.instagram || organizer.twitter) && (
          <div className="flex gap-2.5 mb-6 flex-wrap">
            {organizer.website && (
              <a
                href={organizer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
                Website
              </a>
            )}
            {organizer.instagram && (
              <a
                href={`https://instagram.com/${organizer.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            )}
            {organizer.twitter && (
              <a
                href={`https://twitter.com/${organizer.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter / X
              </a>
            )}
          </div>
        )}

        {/* Upcoming Festivals */}
        {upcomingFestivals && upcomingFestivals.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">
              Upcoming Events
            </h2>
            <div className="flex flex-col gap-3">
              {upcomingFestivals.map((f: FestivalRow) => (
                <FestivalCard key={f.id} festival={f} />
              ))}
            </div>
          </section>
        )}

        {/* Past Festivals */}
        {pastFestivals && pastFestivals.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">
              Past Events
            </h2>
            <div className="flex flex-col gap-2">
              {pastFestivals.map((f: FestivalRow) => (
                <FestivalCard key={f.id} festival={f} past />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {(!upcomingFestivals || upcomingFestivals.length === 0) && (!pastFestivals || pastFestivals.length === 0) && (
          <div className="text-center py-12 text-white/25 text-sm">
            No events listed yet
          </div>
        )}
      </div>
    </div>
  )
}

function FestivalCard({ festival, past = false }: { festival: FestivalRow; past?: boolean }) {
  const dateLabel = formatDateRange(festival.date_start, festival.date_end)
  const slugPart = festival.slug ? `/events/festival-${festival.id}` : `/events/festival-${festival.id}`

  return (
    <Link
      href={slugPart}
      className="flex items-center gap-3 p-3 rounded-2xl transition-colors hover:bg-white/5 active:scale-[0.98] transition-transform"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Thumbnail */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden"
        style={{ background: 'rgba(200,255,0,0.08)' }}
      >
        {festival.image_url
          ? <img src={festival.image_url} alt={festival.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xl">⚡</div>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${past ? 'text-white/50' : 'text-white'}`}>
          {festival.name}
        </p>
        <p className="text-white/35 text-xs mt-0.5">{dateLabel}</p>
        {festival.city && (
          <p className="text-white/25 text-xs">{festival.city}</p>
        )}
      </div>

      <svg className="w-4 h-4 flex-shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
