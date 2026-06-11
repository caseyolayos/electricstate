import Link from 'next/link'
import ExploreGraph from '@/components/ExploreGraph'

export const metadata = {
  title: 'Explore — Electric State',
  description: 'The living graph of electronic music. Artists, festivals, organizers, venues — all connected.',
}

export default function ExplorePage() {
  return (
    <main className="fixed inset-0 bg-[#050505] flex flex-col">
      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-3 z-20"
        style={{ background: 'rgba(5,5,5,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-xl text-white/50 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-black text-base leading-tight">Explore</h1>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">The Electronic Music Universe</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#C8FF00] animate-pulse" />
          <span className="text-[#C8FF00] text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Graph — takes all remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <ExploreGraph />
      </div>
    </main>
  )
}
