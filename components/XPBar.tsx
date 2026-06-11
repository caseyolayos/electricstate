import { getLevel } from '@/lib/mockStore'

interface Props {
  xp: number
}

export default function XPBar({ xp }: Props) {
  const { level, title, nextXP, prevXP } = getLevel(xp)
  const isMaxLevel = level === 4
  const progress = isMaxLevel ? 100 : Math.round(((xp - prevXP) / (nextXP - prevXP)) * 100)
  const xpToNext = isMaxLevel ? 0 : nextXP - xp

  return (
    <div className="glass p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)' }}>
            {level}
          </div>
          <div>
            <p className="font-bold text-white">{title}</p>
            <p className="text-white/50 text-xs">Level {level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-[#C8FF00] text-lg">{xp.toLocaleString()}</p>
          <p className="text-white/40 text-xs">XP</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #C8FF00, #C8FF00)',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-white/40">
          <span>{isMaxLevel ? 'MAX LEVEL' : `${progress}%`}</span>
          {!isMaxLevel && <span>{xpToNext} XP to Level {level + 1}</span>}
        </div>
      </div>
    </div>
  )
}
