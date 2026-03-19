import { useEffect, useRef, useState } from 'react'
import { Settings, Check, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODELS = [
  { value: 'opus',                    label: 'Claude Opus',         short: 'Opus'       },
  { value: 'sonnet',                  label: 'Claude Sonnet',       short: 'Sonnet'     },
  { value: 'gemini-2.5-pro',          label: 'Gemini 2.5 Pro',      short: 'G 2.5 Pro'  },
  { value: 'gemini-2.5-flash',        label: 'Gemini 2.5 Flash',    short: 'G 2.5 Flash'},
  { value: 'gemini-2.5-flash-lite',   label: 'Gemini 2.5 Flash Lite', short: 'G Flash Lite' },
] as const

const RECOMMENDED: Record<string, string> = {
  cover_letter:    'opus',
  company_analyze: 'gemini-2.5-pro',
  onboarding_parse:'gemini-2.5-pro',
  step1_reframe:   'gemini-2.5-pro',
  verification:    'gemini-2.5-flash',
  ep_suggest:      'gemini-2.5-flash',
  web_fetch:       'gemini-2.5-flash',
  pattern_analyze: 'gemini-2.5-flash',
  form_analyze:    'gemini-2.5-flash-lite',
  profile_fill:    'gemini-2.5-flash-lite',
  form_extract:    'gemini-2.5-flash-lite',
}

interface Props {
  endpointKey: string
  className?: string
}

export function ModelPicker({ endpointKey, className }: Props) {
  const [current, setCurrent] = useState<string>('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const recommended = RECOMMENDED[endpointKey] ?? 'gemini-2.5-flash'

  useEffect(() => {
    window.api.settingsGet(`model_ep_${endpointKey}`).then((v) => {
      setCurrent((v as string | null) || recommended)
    })
  }, [endpointKey])

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (value: string) => {
    setCurrent(value)
    setOpen(false)
    await window.api.settingsSet(`model_ep_${endpointKey}`, value)
  }

  const currentLabel = MODELS.find((m) => m.value === current)?.short ?? current
  const isRecommended = current === recommended

  return (
    <div ref={ref} className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={`AI 모델 선택 (현재: ${currentLabel})`}
      >
        <Settings size={10} />
        <span>{currentLabel}</span>
        {isRecommended && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
        <span className="text-[8px] opacity-60">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
            AI 모델 선택
          </p>
          {MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => handleSelect(m.value)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted',
                m.value === current ? 'font-bold text-primary' : 'text-foreground'
              )}
            >
              <span>{m.label}</span>
              <span className="flex items-center gap-1">
                {m.value === recommended && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                {m.value === current && <Check size={12} className="text-primary" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
