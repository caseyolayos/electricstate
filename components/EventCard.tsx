'use client'

import Link from 'next/link'
import { Event } from '@/lib/mockData'
import { useUser } from '@/lib/mockStore'
import { countryCodeToFlag } from '@/lib/internationalFestivals'

interface Props {
  event: Event
}

const sourceColors: Record<Event['source'], string> = {
  Verified: 'bg-[#C8FF00]/20 text-[#C8FF00] border-[#C8FF00]/30',
  'AI Found': 'bg-[#C8FF00]/20 text-purple-300 border-[#C8FF00]/30',
  'Community Submitted': 'bg-[#C8FF00]/20 text-[#C8FF00] border-[#C8FF00]/30',
}

const sourceStrip: Record<Event['source'], string> = {
  Verified: 'bg-[#C8FF00] text-black',
  'AI Found': 'bg-[#C8FF00] text-black',
  'Community Submitted': 'bg-[#C8FF00] text-black',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
}

export default function EventCard({ event }: Props) {
  const { state, saveEvent } = useUser()
  const isSaved = state.savedEvents.includes(event.id)

  return (
    <div className="glass flex flex-col overflow-hidden group hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(200,255,0,0.1)]">
      {/* Gradient top strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${event.gradient}`} />

      {/* Image / gradient area */}
      <Link href={`/events/${event.id}`} className="block relative">
        <div className={`h-32 bg-gradient-to-br ${event.gradient} relative overflow-hidden`}>
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.name}
              className="w-full h-full object-cover absolute inset-0"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
          {/* Source badge on image */}
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${sourceColors[event.source]}`}>
              {event.source}
            </span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/events/${event.id}`} className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight group-hover:text-[#C8FF00] transition-colors line-clamp-2">
              {event.name}
            </h3>
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); saveEvent(event) }}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              isSaved ? 'text-[#C8FF00]' : 'text-white/30 hover:text-white/70'
            }`}
            aria-label={isSaved ? 'Unsave event' : 'Save event'}
          >
            <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        <p className="text-white/50 text-xs flex items-center gap-1">
          {event.country_code && (
            <span title={event.country_name} className="text-sm leading-none">
              {countryCodeToFlag(event.country_code)}
            </span>
          )}
          {event.venue} · {event.city}
        </p>

        {/* Date pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-white/70">
            {formatDate(event.date)}
          </span>
          <span className="text-xs text-white/40">{event.time}</span>
          {event.dates_confirmed === false && (
            <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/30 text-yellow-400/80 rounded-full px-2 py-0.5">
              Est. Dates
            </span>
          )}
        </div>

        {/* Price + Genre row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {event.genre.map(g => (
              <span key={g} className="text-[10px] bg-white/5 text-white/50 rounded px-1.5 py-0.5 border border-white/10">
                {g}
              </span>
            ))}
          </div>
          {event.minPrice != null && (
            <span className="text-[10px] font-semibold whitespace-nowrap text-[#C8FF00]/80">
              {event.minPrice === 0 ? 'Free' : `From $${event.minPrice % 1 === 0 ? event.minPrice : event.minPrice.toFixed(2)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
