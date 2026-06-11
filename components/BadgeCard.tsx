interface BadgeDef {
  id: string
  emoji: string
  name: string
  desc: string
}

interface Props {
  badge: BadgeDef
  earned: boolean
}

export default function BadgeCard({ badge, earned }: Props) {
  return (
    <div className={`glass relative flex flex-col items-center gap-2 p-4 text-center transition-all duration-300 ${
      earned
        ? 'shadow-[0_0_20px_rgba(200,255,0,0.4)] border-[#C8FF00]/30'
        : 'opacity-40 grayscale'
    }`}>
      <div className="text-3xl">{badge.emoji}</div>
      <div>
        <p className="font-bold text-white text-sm">{badge.name}</p>
        <p className="text-white/50 text-xs mt-0.5">{badge.desc}</p>
      </div>
      {earned && (
        <div className="absolute top-2 right-2">
          <svg className="w-3.5 h-3.5 text-[#C8FF00]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {!earned && (
        <div className="absolute top-2 right-2">
          <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
    </div>
  )
}
