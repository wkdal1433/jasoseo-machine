import { useState, useEffect, useRef } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { buildStep3to5Prompt, buildShortenPrompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { CharacterCounter } from '@/components/common/CharacterCounter'
import { ModelPicker } from '@/components/common/ModelPicker'
import { estimateStepDuration, estimateStreamRemaining, formatDuration } from '@/lib/time-estimator'
import { useSnapshotStore } from '@/stores/snapshotStore'
import { Sparkles, Eye, Scissors } from 'lucide-react'

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
    setGeneratedText, appendGeneratedText, setQuestionStep,
    setAutoRegenerate,
    activePatternIds, useDefaultPatterns,
    streamError, clearStreamError,
    startStreamListening, stopStreamListening,
  } = useWizardStore()

  const { episodes } = useEpisodeStore()
  const { saveSnapshot } = useSnapshotStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [isShortening, setIsShortening] = useState(false)
  const [shortenMsg, setShortenMsg] = useState<string | null>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const streamProcessIdRef = useRef<string | null>(null)

  // Loading UX state
  const [logs, setLogs] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [estimatedSecs, setEstimatedSecs] = useState<number | null>(null)
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

  const startGeneration = async () => {
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
    clearStreamError()
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

    // 시간 예측 — 이전 실행 기록 조회
    try {
      const history = await window.api.executionHistoryGet('step3to5_generation') as { durationSecs: number }[]
      const durations = history.map((h) => h.durationSecs)
      const estimated = estimateStepDuration('step3to5_generation', durations)
      setEstimatedSecs(estimated)
    } catch { /* 예측 실패 시 무시 */ }

    const angles: Record<string, string> = {}
    q.analysisResult!.suggestedEpisodes.forEach((ep) => {
      if (q.approvedEpisodes.includes(ep.episodeId)) {
        angles[ep.episodeId] = ep.angle
      }
    })

    const episodeContents: Record<string, string> = {}
    q.approvedEpisodes.forEach((epId) => {
      const ep = episodes.find((e) => e.id === epId)
      if (ep?.rawContent) episodeContents[epId] = ep.rawContent
    })

    // 패턴 컨텍스트 빌드
    let patternContext: string | undefined
    try {
      const allPatterns = await window.api.patternList() as Array<{
        id: string; name: string; isActive: boolean; analysisStatus: string;
        extractedPattern: { narrativeStructure: string; openingStyle: string; dualCodingKeywords: string[]; specificityLevel: string; closingStyle: string; toneProfile: string } | null
      }>
      const selected = allPatterns.filter(
        (p) => p.isActive && p.analysisStatus === 'ready' && p.extractedPattern &&
          (activePatternIds.length === 0 || activePatternIds.includes(p.id))
      )
      if (selected.length > 0 || useDefaultPatterns) {
        const lines: string[] = []
        if (useDefaultPatterns) lines.push('- 기본 패턴: KB증권·삼성생명·현대해상·한국자금중개 S급 합격 자소서 패턴 (두괄식, 이중 코딩, S-P-A-A-R-L 구조)')
        selected.forEach((p) => {
          const ep = p.extractedPattern!
          lines.push(`- [${p.name}] 서사: ${ep.narrativeStructure} | 도입: ${ep.openingStyle} | 톤: ${ep.toneProfile} | 마무리: ${ep.closingStyle}`)
        })
        if (lines.length > 0) patternContext = lines.join('\n')
      }
    } catch { /* 패턴 로드 실패해도 생성 계속 */ }

    // 이전 검증 실패 피드백 수집 — 재생성 시 AI에게 전달
    let verificationFeedback: string | undefined
    if (q.verificationResult) {
      const failedItems: string[] = []
      const vr = q.verificationResult
      ;[
        ...(vr.hallucinationCheck?.items ?? []),
        ...(vr.failPatternCheck?.items ?? []),
        ...(vr.dualCodingCheck?.items ?? []),
      ]
        .filter((item) => !item.passed)
        .forEach((item) => failedItems.push(`- ${item.check}: ${item.detail || ''}`))
      if (failedItems.length > 0) {
        verificationFeedback = failedItems.join('\n')
      }
    }

    const prompt = buildStep3to5Prompt(
      companyName, jobTitle, jobPosting,
      hrIntents, strategy,
      q.analysisResult!.questionReframe,
      q.question, q.charLimit,
      q.approvedEpisodes, angles, episodeContents, patternContext,
      verificationFeedback
    )

    const coverLetterModel = await window.api.settingsGet('model_ep_cover_letter') as string | null
    const pid = `proc_stream_${Date.now()}`
    streamProcessIdRef.current = pid
    // 스트림 리스너를 스토어 레벨에 등록 — 페이지 이동해도 청크가 유실되지 않음
    startStreamListening(activeQuestionIndex)
    window.api.claudeExecuteStream({
      prompt,
      outputFormat: 'stream-json',
      maxTurns: 5,
      appendSystemPrompt: GUI_SYSTEM_PROMPT,
      modelOverride: coverLetterModel || undefined,
      processId: pid
    })
  }

  // 검증 화면에서 "피드백 반영 재생성" 클릭 시 자동 실행
  useEffect(() => {
    if (q.autoRegenerate && !isGenerating) {
      setAutoRegenerate(activeQuestionIndex, false)
      startGeneration()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 첫 번째 토큰 도착 감지 — generatedText가 비어있다가 채워질 때 타이머 정리
  useEffect(() => {
    if (isGenerating && q.generatedText.length > 0 && !firstTokenRef.current) {
      firstTokenRef.current = true
      addLog('첫 번째 토큰 수신 ✓')
      clearTimers()
    }
  }, [q.generatedText, isGenerating])

  // 생성 종료 감지 (정상 완료 / 오류 모두)
  useEffect(() => {
    if (!isGenerating && firstTokenRef.current) {
      const finalLen = q.generatedText.length
      addLog(`생성 완료 (${finalLen}자)`)
      // 실행 이력 저장 — 다음 세션에서 시간 예측에 사용
      const durationSecs = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0
      if (durationSecs > 0) {
        window.api.executionHistorySave({
          step: 'step3to5_generation',
          model: 'default',
          durationSecs,
          charLimit: q.charLimit || undefined,
        }).catch(() => { /* 저장 실패 시 무시 */ })
      }
      // 생성 완료 시 스냅샷 저장
      const wizardState = useWizardStore.getState()
      saveSnapshot(`문항 ${activeQuestionIndex + 1}: 초안 생성 완료 (${finalLen}자)`, wizardState, activeQuestionIndex)
      // 글자수 초과 시 자동 축약 실행
      if (q.charLimit > 0 && finalLen > q.charLimit) {
        addLog(`글자수 초과 (${finalLen}자 > ${q.charLimit}자) → 자동 축약 시작`)
        runShorten()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating])

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
    // 먼저 스토어 리스너 해제 — 취소 완료 이벤트가 스토어에 도달하지 않도록
    stopStreamListening()
    if (streamProcessIdRef.current) {
      await window.api.claudeCancelById(streamProcessIdRef.current)
      streamProcessIdRef.current = null
    }
    addLog('사용자가 생성을 중단했습니다.')
    setIsGenerating(false)
  }

  const runShorten = async () => {
    if (!q.charLimit || isShortening) return
    setIsShortening(true)
    setShortenMsg(null)
    let currentText = q.generatedText
    const MAX_TRIES = 3

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      const currentLen = currentText.length
      if (currentLen <= q.charLimit) break

      setShortenMsg(`축약 중... (${attempt}/${MAX_TRIES}회, 현재 ${currentLen}자)`)
      try {
        const prompt = buildShortenPrompt(currentText, currentLen, q.charLimit)
        const shortenModel = await window.api.settingsGet('model_ep_cover_letter') as string | null
        const result = await window.api.claudeExecute({ prompt, outputFormat: 'text', maxTurns: 1, modelOverride: shortenModel || undefined })
        const trimmed = result.trim()
        if (!trimmed || trimmed.length < 50) break // 비정상 응답 방어
        // 저장 전 길이 검증 — 원문보다 길거나 거의 안 줄었으면 채택하지 않고 중단
        if (trimmed.length >= currentLen) break // 텍스트가 늘었거나 동일함 → 거부
        if (trimmed.length > currentLen * 0.98) break // 2% 미만 감소 → 더 이상 줄이기 불가
        currentText = trimmed
        setGeneratedText(activeQuestionIndex, currentText)

        if (currentText.length <= q.charLimit) break
      } catch {
        break
      }
    }

    const finalLen = currentText.length
    const withinLimit = finalLen <= q.charLimit
    setShortenMsg(
      withinLimit
        ? `✓ ${finalLen}자로 축약 완료`
        : `최대한 줄였습니다 (${finalLen}자 / 목표 ${q.charLimit}자)`
    )
    // 축약 완료 스냅샷 저장 (되돌리기 가능)
    const wizardState = useWizardStore.getState()
    saveSnapshot(
      `문항 ${activeQuestionIndex + 1}: 글자수 축약 완료 (${finalLen}자)`,
      wizardState,
      activeQuestionIndex
    )
    setIsShortening(false)
    setTimeout(() => setShortenMsg(null), 5000)
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
        {showLog ? '▲ 작업 로그 숨기기' : <><Eye size={10} className="inline mr-0.5" /> 작업 로그 보기</>}
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

        <div className="space-y-2">
          <button
            onClick={startGeneration}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="h-5 w-5" />
            초안 생성하기
          </button>
          <div className="flex justify-end">
            <ModelPicker endpointKey="cover_letter" />
          </div>
        </div>
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
            <p className="text-xs text-muted-foreground">
              경과 {formatElapsed(elapsed)}
              {estimatedSecs !== null && ` / 예상 ${formatDuration(estimatedSecs)}`}
            </p>
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
            <span>
              {q.generatedText.length}자 / {q.charLimit}자 | {formatElapsed(elapsed)}
              {(() => {
                const remaining = q.charLimit > 0 ? estimateStreamRemaining(q.generatedText.length, q.charLimit, elapsed) : null
                return remaining !== null ? ` | 약 ${formatDuration(remaining)} 남음` : ''
              })()}
            </span>
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

      {streamError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {streamError}
        </div>
      )}

      {/* Log toggle during streaming */}
      {isGenerating && <LogPanel />}

      {/* Action Buttons */}
      <div className="space-y-2">
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
              <ModelPicker endpointKey="cover_letter" />
              {q.charLimit > 0 && (
                <button
                  onClick={runShorten}
                  disabled={isShortening}
                  className={
                    q.generatedText.length > q.charLimit
                      ? 'rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950'
                      : 'rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50'
                  }
                >
                  {isShortening
                    ? '축약 중...'
                    : q.generatedText.length > q.charLimit
                      ? <span className="flex items-center gap-1"><Scissors size={14} /> 글자수 줄이기</span>
                      : <span className="flex items-center gap-1"><Scissors size={14} /> 추가 축약</span>
                  }
                </button>
              )}
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
      {shortenMsg && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground text-center">
          {shortenMsg}
        </div>
      )}
    </div>
  </div>
  )
}
