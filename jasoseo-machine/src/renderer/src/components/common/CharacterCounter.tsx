import { cn } from '@/lib/utils'

interface CharacterCounterProps {
  current: number
  limit: number
  className?: string
}

export function CharacterCounter({ current, limit, className }: CharacterCounterProps) {
  const ratio = current / limit
  const color =
    ratio > 1 ? 'text-red-500' : ratio > 0.9 ? 'text-yellow-500' : 'text-green-500'
  const barColor =
    ratio > 1 ? 'bg-red-500' : ratio > 0.9 ? 'bg-yellow-500' : 'bg-primary'
  const barWidth = Math.min(ratio * 100, 100)

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className={color}>
          {current} / {limit}자 ({(ratio * 100).toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}
