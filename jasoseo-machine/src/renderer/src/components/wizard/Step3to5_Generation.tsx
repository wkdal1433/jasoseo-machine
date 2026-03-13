import { useState, useEffect, useRef } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { buildStep3to5Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { Sparkles } from 'lucide-react'

const FUN_MESSAGES = [
  '식빵 굽는 중... 🍞',
  '에피소드 핵심 장면 재현 중... 🎬',
  'HR 담당자 뇌파 주파수 맞추는 중...',
  'S-P-A-A-R-L 구조 설계 도면 그리는 중... 📐',
  '이중 코딩 레이어 장전 중... 🎯',
  '합격 패턴 데이터베이스 참조 중...',
  '두괄식 문장에 긴장감 주입 중...',
  '면접관 레이더에 잡히는 키워드 삽입 중...',
  '할루시네이션 방지 차단막 설치 중... 🛡️',
  '경험을 스토리로 변환하는 중... ✍️',
  '탈락 패턴 필터링 중... 🚫',
  '면접관 심장을 겨냥하는 중... 🎯',
]

const FAKE_STEPS = [
  { label: 'Step 3', desc: '두괄식 도입부 작성 중...' },
  { label: 'Step 4', desc: '본문 전개 (S-P-A-A-R-L) 중...' },
  { label: 'Step 5', desc: '마무리 문단 작성 중...' },
]

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Step3to5Generation() {
  const {
    companyName, jobTitle, jobPosting, hrIntents, strategy,
    questions, activeQuestionIndex,
    isGenerating, setIsGenerating,
    setGeneratedText, appendGeneratedText, setQuestionStep
  } = useWizardStore()

  const { episodes } = useEpisodeStore()

  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const textRef = useRef<HTMLDivElement>(null)

  // Loading UX state
  const [logs, setLogs] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [funMsgIdx, setFunMsgIdx] = useState(0)
  const [fakeStep, setFakeStep] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firstTokenRef = useRef(false)

  const q = questions[activeQuestionIndex]
  if (!q || !hrIntents || !strategy || !q.analysisResult) return null

  const addLog = (msg: string) => {
    const secs = startTimeRef.current
      ? ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
      : '0.0'
    setLogs((prev) => [...prev, `[${secs}s] ${msg}`])
  }

  const clearTimers = () => {
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    if (msgTimerRef.current) { clearInterval(msgTimerRef.current); msgTimerRef.current = null }
  }

  const startGeneration = () => {
    // Reset loading state
    setLogs([])
    setShowLog(false)
    setElapsed(0)
    setFunMsgIdx(Math.floor(Math.random() * FUN_MESSAGES.length))
    setFakeStep(0)
    firstTokenRef.current = false
    startTimeRef.current = Date.now()
    clearTimers()

    setIsGenerating(true)
    setError(null)
    setGeneratedText(activeQuestionIndex, '')

    // Elapsed counter (1s tick)
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    // Message rotation + fake step advance (2.5s tick)
    let tick = 0
    msgTimerRef.current = setInterval(() => {
      tick++
      setFunMsgIdx((prev) => (prev + 1) % FUN_MESSAGES.length)
      if (tick === 2) setFakeStep(1)  // ~5s
      if (tick === 5) setFakeStep(2)  // ~12.5s
    }, 2500)

    addLog('프롬프트 전송 완료')

    const angles: Record<string, string> = {}
    q.analysisResult!.suggestedEpisodes.forEach((ep) => {
      if (q.approvedEpisodes.includes(ep.episodeId)) {
        angles[ep.episodeId] = ep.angle
      }
    })

    const prompt = buildStep3to5Prompt(
      companyName, jobTitle, jobPosting,
      hrIntents, strategy,
      q.analysisResult!.questionReframe,
      q.question, q.charLimit,
      q.approvedEpisodes, angles
    )

    window.api.claudeExecuteStream({
      prompt,
      outputFormat: 'stream-json',
      maxTurns: 5,
      appendSystemPrompt: GUI_SYSTEM_PROMPT
    })
  }

  // Cleanup timers when generation ends
  useEffect(() => {
    if (!isGenerating) {
      clearTimers()
    }
  }, [isGenerating])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers()
  }, [])

  useEffect(() => {
    if (!isGenerating) return

    const cleanupChunk = window.api.onStreamChunk((event: unknown) => {
      const e = event as {
        type?: string
        content_block?: { text?: string }
        delta?: { type?: string; text?: string }
        result?: { text?: string }
      }

      let text = ''
      if (e.type === 'content_block_delta' && e.delta?.text) {
        text = e.delta.text
      } else if (e.type === 'content_block_start' && e.content_block?.text) {
        text = e.content_block.text
      } else if (e.type === 'result' && e.result?.text) {
        setGeneratedText(activeQuestionIndex, e.result.text)
        return
      } else {
        text = e.delta?.text || e.content_block?.text || ''
      }

      if (text) {
        if (!firstTokenRef.current) {
          firstTokenRef.current = true
          addLog('첫 번째 토큰 수신 ✓')
          clearTimers()
        }
        appendGeneratedText(activeQuestionIndex, text)
      }
    })

    const cleanupEnd = window.api.onStreamEnd(() => {
      const finalLen = useWizardStore.getState().questions[activeQuestionIndex]?.generatedText?.length ?? 0
      addLog(`생성 완료 (${finalLen}자)`)
      setIsGenerating(false)
    })

    const cleanupError = window.api.onStreamError((data: unknown) => {
      const d = data as { message?: string }
      addLog(`오류: ${d.message || '스트리밍 오류'}`)
      setError(d.message || '스트리밍 오류')
      setIsGenerating(false)
    })

    return () => {
      cleanupChunk()
      cleanupEnd()
      cleanupError()
    }
  }, [isGenerating, activeQuestionIndex])

  useEffect(() => {
    if (textRef.current && isGenerating) {
      textRef.current.scrollTop = textRef.current.scrollHeight
    }
  }, [q.generatedText, isGenerating])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const cancelGeneration = async () => {
    await window.api.claudeCancel()
    addLog('사용자가 생성을 중단했습니다.')
    setIsGenerating(false)
  }

  const startEdit = () => {
    setEditText(q.generatedText)
    setIsEditing(true)
  }

  const saveEdit = () => {
    setGeneratedText(activeQuestionIndex, editText)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const proceedToVerification = () => {
    setQuestionStep(activeQuestionIndex, 6)
  }

  const hasText = q.generatedText.trim().length > 0
  const charProgress = q.charLimit > 0 ? Math.min(100, Math.round((q.generatedText.length / q.charLimit) * 100)) : 0

  const getEpisodeTitle = (id: string) => {
    return episodes.find(e => e.id === id)?.title || id
  }

  // Log Panel (shared between loading and streaming views)
  const LogPanel = () => (
    <div className="mt-3">
      <button
        onClick={() => setShowLog((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:text-primary"
      >
        {showLog ? '▲ 작업 로그 숨기기' : '▼ 👁️ 작업 로그 보기'}
      </button>
      {showLog && (
        <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
          <div
            ref={logRef}
            className="h-28 overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-3 font-mono text-[10px] leading-relaxed text-green-400/90"
          >
            {logs.length === 0 && <span className="text-green-400/50">로그 없음</span>}
            {logs.map((log, i) => (
              <div key={i} className="mb-0.5">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // Pre-generation Summary View
  if (!hasText && !isGenerating) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-5 text-lg font-bold text-card-foreground">
            문항 {activeQuestionIndex + 1} 분석 및 초안 생성
          </h4>

          <div className="space-y-5 text-sm text-card-foreground">
            <div>
              <span className="font-bold text-primary mb-1 block">[분석결과]</span>
              <p className="leading-relaxed text-muted-foreground">
                {q.analysisResult.questionReframe}
              </p>
            </div>

            <div>
              <span className="font-bold text-primary mb-2 block">[매칭된 에피소드]</span>
              <div className="flex flex-wrap gap-2">
                {q.approvedEpisodes.map(epId => (
                  <span
                    key={epId}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground border border-border"
                  >
                    {getEpisodeTitle(epId)}
                  </span>
                ))}
                {q.approvedEpisodes.length === 0 && (
                  <span className="text-muted-foreground text-xs">매칭된 에피소드가 없습니다.</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-primary mb-2 block">[초안 작성 방향]</span>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground ml-1">
                {q.analysisResult.suggestedEpisodes
                  .filter(ep => q.approvedEpisodes.includes(ep.episodeId))
                  .map(ep => (
                    <li key={ep.episodeId} className="leading-relaxed">{ep.angle}</li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={startGeneration}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles className="h-5 w-5" />
          초안 생성하기
        </button>
      </div>
    )
  }

  // Loading Screen (generating, no text yet)
  if (isGenerating && !hasText) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-6 animate-in fade-in duration-300">
          {/* Spinner */}
          <div className="flex justify-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Fun message */}
          <div className="space-y-1">
            <p className="text-base font-bold animate-pulse">{FUN_MESSAGES[funMsgIdx]}</p>
            <p className="text-xs text-muted-foreground">경과 {formatElapsed(elapsed)}</p>
          </div>

          {/* Fake step progress */}
          <div className="flex items-center justify-center gap-2">
            {FAKE_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all duration-500 ${
                  i < fakeStep
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : i === fakeStep
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < fakeStep ? '✓' : i === fakeStep ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current inline-block" /> : '○'}
                  <span>{step.label}</span>
                </div>
                {i < FAKE_STEPS.length - 1 && (
                  <span className={`text-xs ${i < fakeStep ? 'text-green-500' : 'text-muted-foreground/30'}`}>→</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{FAKE_STEPS[fakeStep].desc}</p>

          {/* Indeterminate progress bar */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary"
              style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
            />
          </div>

          <LogPanel />
        </div>

        <button
          onClick={cancelGeneration}
          className="w-full rounded-xl border-2 border-red-300 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
        >
          생성 중단
        </button>
      </div>
    )
  }

  // Generation / Post-generation View
  return (
    <div className="space-y-4">
      {/* Status bar (streaming) */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary inline-block" />
              생성 중...
            </span>
            <span>{q.generatedText.length}자 / {q.charLimit}자 | {formatElapsed(elapsed)}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${charProgress}%` }}
            />
          </div>
        </div>
      )}

      {!isGenerating && hasText && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Step 3~5: 자소서 생성</h3>
        </div>
      )}

      {/* Text Display / Editor */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={15}
            className="w-full rounded-lg border border-input bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
          <CharacterCounter current={editText.length} limit={q.charLimit} />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              저장
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={textRef}
          className="max-h-[500px] min-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4"
        >
          {hasText && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {q.generatedText}
              {isGenerating && (
                <span className="inline-block h-4 w-0.5 animate-pulse bg-primary" />
              )}
            </div>
          )}
        </div>
      )}

      {hasText && !isEditing && (
        <CharacterCounter current={q.generatedText.length} limit={q.charLimit} />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Log toggle during streaming */}
      {isGenerating && <LogPanel />}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isGenerating && !isEditing && hasText && (
          <>
            <button
              onClick={startEdit}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              편집
            </button>
            <button
              onClick={startGeneration}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              재생성
            </button>
            <button
              onClick={proceedToVerification}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
            >
              검증 시작
            </button>
          </>
        )}
        {isGenerating && (
          <button
            onClick={cancelGeneration}
            className="flex-1 rounded-xl border-2 border-red-300 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            생성 중단
          </button>
        )}
      </div>
    </div>
  )
}
