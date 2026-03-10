import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'

interface Props {
  failedModel: string
  errorType: string
  onClose: () => void
  onSwapped: () => void
}

const ALL_MODELS = [
  { value: 'opus', label: 'Claude Opus', provider: 'claude' },
  { value: 'sonnet', label: 'Claude Sonnet', provider: 'claude' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'gemini' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' }
]

export function EngineSwapModal({ failedModel, errorType, onClose, onSwapped }: Props) {
  const { setSetting } = useSettingsStore()
  
  // 현재 에러가 난 모델의 제조사(Provider) 확인
  const failedProvider = failedModel.startsWith('gemini') ? 'gemini' : 'claude'
  
  // 대안 모델들: 쿼터 소진인 경우 아예 다른 제조사 추천, 레이트 리밋인 경우 같은 제조사 내 다른 모델 추천 가능
  const alternatives = ALL_MODELS.filter(m => {
    if (errorType === 'quota_exhausted') return m.provider !== failedProvider
    return m.value !== failedModel
  })

  const handleSwap = async (modelValue: string) => {
    await setSetting('model', modelValue)
    onSwapped()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h3 className="text-xl font-bold text-foreground">엔진 교체가 필요합니다</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {errorType === 'quota_exhausted' 
              ? `현재 ${failedProvider.toUpperCase()} 계정의 토큰이 소진되었습니다.\n다른 제조사의 모델로 교체하여 계속 진행할 수 있습니다.`
              : '사용량 한도에 도달했습니다. 다른 모델로 전환하시겠습니까?'}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">추천 대안 모델</p>
          {alternatives.map((m) => (
            <button
              key={m.value}
              onClick={() => handleSwap(m.value)}
              className="w-full flex items-center justify-between group rounded-xl border border-border bg-muted/20 p-4 transition-all hover:border-primary hover:bg-primary/5"
            >
              <div className="text-left">
                <p className="text-sm font-bold group-hover:text-primary">{m.label}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{m.provider} Engine</p>
              </div>
              <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                교체하기 →
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  )
}
