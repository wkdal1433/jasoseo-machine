import { useState, useCallback } from 'react'
import { OnboardingResult } from '../../../../main/automation/onboarding-agent'
import { useEpisodeStore } from '@/stores/episodeStore'
import { useProfileStore } from '@/stores/profileStore'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

type Step = 'welcome' | 'parsing' | 'result'

export function MagicOnboarding({ onClose }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { loadEpisodes } = useEpisodeStore()
  const { loadProfile } = useProfileStore()

  const handleParse = async (text: string) => {
    setStep('parsing')
    try {
      const response = await window.api.onboardingParseFile(text)
      if (response.success) {
        setResult(response.data)
        setStep('result')
      } else {
        alert('분석에 실패했습니다: ' + response.error)
        setStep('welcome')
      }
    } catch (err) {
      console.error(err)
      setStep('welcome')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      handleParse(content)
    }
    reader.readAsText(file) // PDF 지원은 추후 텍스트 추출 엔진 연결 시 확장
  }, [])

  const handleSaveAll = async () => {
    if (!result) return

    // 1. 프로필 저장
    await window.api.userProfileSave(result.profile)
    
    // 2. 에피소드들 저장
    for (let i = 0; i < result.episodes.length; i++) {
      const ep = result.episodes[i]
      const fileName = `ep_magic_${Date.now()}_${i}.md`
      // 실제 에피소드 리스트에는 status 정보가 포함된 마크다운으로 저장되도록 함
      await window.api.episodeSaveFile(fileName, ep.content)
    }

    await loadProfile()
    await loadEpisodes()
    alert('모든 데이터가 성공적으로 반영되었습니다!')
    onClose()
  }

  return (
    <div className="flex flex-col h-full p-8 animate-in fade-in duration-500">
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg flex-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧙‍♂️</span>
            <div>
              <h2 className="text-xl font-bold">매직 온보딩 에이전트</h2>
              <p className="text-xs text-muted-foreground">기존 자소서만 주시면 나머지는 제가 다 할게요.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground">
            뒤로가기
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 'welcome' && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "relative flex h-80 w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-all",
                  isDragging ? "border-primary bg-primary/5 scale-105" : "border-border bg-muted/20"
                )}
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
                  📄
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">이력서나 자소서를 던져주세요</h3>
                <p className="mb-8 text-muted-foreground px-10">
                  PDF, MD, 또는 텍스트 파일을 이곳에 드래그하세요.<br/>
                  AI가 12개 섹션 프로필과 S-P-A-A-R-L 에피소드를 즉시 생성합니다.
                </p>
                <label className="cursor-pointer rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-90">
                  파일 선택하기
                  <input type="file" className="hidden" accept=".md,.txt" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (event) => handleParse(event.target?.result as string)
                      reader.readAsText(file)
                    }
                  }} />
                </label>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">
                ※ PDF 파일의 경우 현재 텍스트 복사 후 텍스트 파일(.txt)로 저장하여 업로드해주세요.
              </p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex h-full flex-col items-center justify-center space-y-8">
              <div className="relative">
                <div className="h-24 w-24 animate-spin rounded-full border-8 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold animate-pulse">마법이 일어나는 중입니다...</p>
                <p className="text-muted-foreground">데이터를 추출하고 구조화하고 있습니다. (약 15초 소요)</p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>프로필 추출</span>
                  <span className="text-primary">진행 중...</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-2/3 bg-primary animate-[progress_2s_ease-in-out_infinite]"></div>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="text-center">
                <h3 className="text-3xl font-bold">🎉 세팅이 완료되었습니다!</h3>
                <p className="mt-2 text-muted-foreground">AI가 찾아낸 데이터들을 확인하고 승인해주세요.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Result */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold flex items-center gap-2">📂 프로필 추출 결과</h4>
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600">
                      80% 완성
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
                    {result.missingFields.length > 0 ? (
                      <div className="rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-700 border border-yellow-500/20">
                        ⚠️ <strong>누락된 항목:</strong> {result.missingFields.join(', ')} <br/>
                        <span className="mt-1 block opacity-80">이 데이터들은 나중에 프로필 페이지에서 채워주세요.</span>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-green-500/10 p-3 text-xs text-green-700 border border-green-500/20">
                        ✅ 모든 필수 필드가 성공적으로 추출되었습니다!
                      </div>
                    )}
                    <div className="text-sm space-y-1">
                      <p><strong>성함:</strong> {result.profile.personal?.name || '미확인'}</p>
                      <p><strong>학력:</strong> {result.profile.education?.[0]?.schoolName || '미확인'}</p>
                      <p><strong>경력:</strong> {result.profile.career?.length || 0}건 발견</p>
                    </div>
                  </div>
                </div>

                {/* Episode Result */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold flex items-center gap-2">✨ 에피소드 추출 결과</h4>
                  <div className="space-y-3">
                    {result.episodes.map((ep, i) => (
                      <div key={i} className="group rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-3 w-3 rounded-full",
                              ep.status === 'ready' ? "bg-green-500" : 
                              ep.status === 'needs_review' ? "bg-yellow-500" : "bg-red-500"
                            )} title={ep.status}></div>
                            <span className="text-sm font-bold truncate max-w-[150px]">{ep.title}</span>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">{ep.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {ep.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-6">
                <button 
                  onClick={() => setStep('welcome')}
                  className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-bold hover:bg-muted transition-colors"
                >
                  다시 업로드
                </button>
                <button 
                  onClick={handleSaveAll}
                  className="rounded-xl bg-primary px-12 py-3 text-sm font-bold text-primary-foreground shadow-xl hover:scale-105 transition-all"
                >
                  🚀 이대로 데이터 반영하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
