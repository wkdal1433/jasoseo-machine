import { useEffect, useRef, useState } from 'react'
import { Settings, Check, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODELS = [
  { value: 'opus',                      label: 'Claude Opus',              short: 'Opus'        },
  { value: 'sonnet',                    label: 'Claude Sonnet',            short: 'Sonnet'      },
  { value: 'gemini-3.1-pro-preview',    label: 'Gemini 3.1 Pro Preview',   short: 'G 3.1 Pro'   },
  { value: 'gemini-3.0-pro',            label: 'Gemini 3.0 Pro',           short: 'G 3.0 Pro'   },
  { value: 'gemini-2.5-pro',            label: 'Gemini 2.5 Pro',           short: 'G 2.5 Pro'   },
  { value: 'gemini-2.5-flash',          label: 'Gemini 2.5 Flash',         short: 'G 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite',     label: 'Gemini 2.5 Flash Lite',    short: 'G 2.5 Lite'  },
  { value: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash',         short: 'G 2.0 Flash' },
] as const

const RECOMMENDED: Record<string, string> = {
  cover_letter:       'opus',
  company_analyze:    'gemini-2.5-pro',
  step0_analysis:     'gemini-2.5-pro',
  onboarding_parse:   'gemini-3.1-pro-preview',
  step1_reframe:      'gemini-2.5-pro',
  verification:       'gemini-2.5-flash',
  consistency_check:  'gemini-2.5-flash',
  headline_grade:     'gemini-2.5-flash',
  surgical_edit:      'gemini-2.5-flash',
  episode_edit:       'gemini-2.5-flash',
  episode_interview:  'gemini-2.5-flash',
  onboarding_interview: 'gemini-2.5-flash',
  ep_suggest:         'gemini-2.5-flash',
  web_fetch:          'gemini-2.5-flash',
  pattern_analyze:    'gemini-2.5-flash',
  form_analyze:       'gemini-2.5-flash-lite',
  profile_fill:       'gemini-2.5-flash-lite',
  form_extract:       'gemini-2.5-flash-lite',
}

interface Props {
  endpointKey: string
  className?: string
  isRunning?: boolean
  onCancelAndRestart?: () => void
}

export function ModelPicker({ endpointKey, className, isRunning, onCancelAndRestart }: Props) {
  const [current, setCurrent] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [pendingRestart, setPendingRestart] = useState(false)
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
    if (value === current) { setOpen(false); return }
    setCurrent(value)
    setOpen(false)
    await window.api.settingsSet(`model_ep_${endpointKey}`, value)
    // 실행 중이고 재시작 콜백이 있으면 confirm 팝업 표시
    if (isRunning && onCancelAndRestart) {
      setPendingRestart(true)
    }
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

      {pendingRestart && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-52 overflow-hidden rounded-xl border border-amber-300 bg-card shadow-xl animate-in zoom-in-95 duration-150 dark:border-amber-700">
          <p className="px-3 py-2 text-[11px] text-foreground leading-relaxed">
            AI 실행 중입니다.<br />
            <span className="font-bold">{MODELS.find(m => m.value === current)?.short ?? current}</span>으로 중단 후 재시작할까요?
          </p>
          <div className="flex border-t border-border">
            <button
              onClick={() => { onCancelAndRestart?.(); setPendingRestart(false) }}
              className="flex-1 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
            >
              중단 후 재시작
            </button>
            <button
              onClick={() => setPendingRestart(false)}
              className="flex-1 px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted border-l border-border transition-colors"
            >
              다음 실행에 적용
            </button>
          </div>
        </div>
      )}

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
