interface StampDef {
  id: string
  emoji: string
  name: string
  desc: string
  image?: string | null
}

interface Props {
  stamp: StampDef
  earned: boolean
}

export default function StampCard({ stamp, earned }: Props) {
  return (
    <div className="flex items-center justify-center p-2">
      {stamp.image ? (
        <img
          src={stamp.image}
          alt={stamp.name}
          className="w-full aspect-square object-contain transition-all duration-500"
          style={earned ? {} : { filter: 'grayscale(1) brightness(0.5)', opacity: 0.5 }}
        />
      ) : (
        <span className="text-6xl" style={earned ? {} : { filter: 'grayscale(1)', opacity: 0.4 }}>{stamp.emoji}</span>
      )}
    </div>
  )
}
