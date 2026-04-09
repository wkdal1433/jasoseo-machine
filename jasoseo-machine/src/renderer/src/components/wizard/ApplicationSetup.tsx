import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import { useEpisodeStore } from '@/stores/episodeStore'
import { cn } from '@/lib/utils'
import type { Strategy, QuestionInput } from '@/types/application'
import { ModelPicker } from '../common/ModelPicker'
import {
  Zap,
  MousePointerClick,
  Puzzle,
  ClipboardList,
  BookOpen,
  Undo2
} from 'lucide-react'

interface FormSnapshot {
  label: string
  companyName: string
  jobTitle: string
  jobPosting: string
  questions: QuestionInput[]
}

interface PatternRecord {
  id: string
  name: string
  source: 'uploaded' | 'history'
  isActive: boolean
  analysisStatus: 'analyzing' | 'ready' | 'failed'
}

interface PatternSettings {
  useDefaultPatterns: boolean
}

type SetupMode = 'select' | 'manual' | 'smart' | 'job-select'

interface JobOption {
  jobTitle: string
  jobPosting: string
  questions: QuestionInput[]
}

export function ApplicationSetup() {
  const { initWizard, setPatternConfig, setupDraft, saveSetupDraft, clearSetupDraft } = useWizardStore()
  const { episodes, loadEpisodes } = useEpisodeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<SetupMode>('select')
  const [smartUrl, setSmartUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobPosting, setJobPosting] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('Balanced')
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question: '', charLimit: 800 }
  ])
  const [jobOptions, setJobOptions] = useState<JobOption[]>([])
  const [pendingCompanyName, setPendingCompanyName] = useState('')
  const [isWaitingExtraction, setIsWaitingExtraction] = useState(false)
  const extractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loadedPatterns, setLoadedPatterns] = useState<PatternRecord[]>([])
  const [patternSettings, setPatternSettings] = useState<PatternSettings>({ useDefaultPatterns: true })
  const [selectedPatternIds, setSelectedPatternIds] = useState<string[]>([])
  const [showNoEpisodeWarning, setShowNoEpisodeWarning] = useState(false)
  const isRestored = useRef(false)
  const [undoStack, setUndoStack] = useState<FormSnapshot[]>([])

  // 에피소드 로드 (0개 체크용)
  useEffect(() => { loadEpisodes() }, [])

  // Layout 알림 배너에서 넘어온 문항 자동 적용
  // location.key 의존: 이미 setup 페이지에 있어도 재내비게이션 시 재실행
  useEffect(() => {
    const state = location.state as { pendingQuestions?: { question: string; charLimit: number | null }[] } | null
    if (state?.pendingQuestions && state.pendingQuestions.length > 0) {
      setQuestions(state.pendingQuestions.map(q => ({ question: q.question, charLimit: q.charLimit ?? 800 })))
      setMode('manual')
      // 사용한 state 클리어 (뒤로가기 후 재적용 방지)
      window.history.replaceState({ ...window.history.state, usr: {} }, '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // 이탈했다 돌아올 때 입력 데이터 복원
  // pendingQuestions(확장 프로그램 문항)가 있으면 setupDraft 복원 건너뜀
  useEffect(() => {
    const hasPending = !!(location.state as any)?.pendingQuestions?.length
    if (hasPending) return
    if (setupDraft && !isRestored.current) {
      isRestored.current = true
      setMode(setupDraft.mode ?? 'select')
      setCompanyName(setupDraft.companyName ?? '')
      setJobTitle(setupDraft.jobTitle ?? '')
      setJobPosting(setupDraft.jobPosting ?? '')
      setStrategy(setupDraft.strategy ?? 'Balanced')
      setQuestions((setupDraft.questions?.length > 0) ? setupDraft.questions : [{ question: '', charLimit: 800 }])
      setSmartUrl(setupDraft.smartUrl ?? '')
      setJobOptions(setupDraft.jobOptions ?? [])
      setPendingCompanyName(setupDraft.pendingCompanyName ?? '')
    }
  }, [])

  // 폼에 내용이 생기면 드래프트 저장 (이탈해도 유지)
  useEffect(() => {
    const hasData = companyName || jobTitle || jobPosting || smartUrl ||
      questions.some((q) => q.question) || jobOptions.length > 0
    if (!hasData) return
    saveSetupDraft({ mode, companyName, jobTitle, jobPosting, strategy, questions, smartUrl, jobOptions, pendingCompanyName })
  }, [mode, companyName, jobTitle, jobPosting, strategy, questions, smartUrl, jobOptions, pendingCompanyName])

  // 패턴 데이터 로드
  useEffect(() => {
    Promise.all([
      window.api.patternList() as Promise<PatternRecord[]>,
      window.api.patternSettingsGet() as Promise<PatternSettings>
    ]).then(([list, settings]) => {
      const active = list.filter((p) => p.isActive && p.analysisStatus === 'ready')
      setLoadedPatterns(active)
      setPatternSettings(settings)
      setSelectedPatternIds(active.map((p) => p.id))
    }).catch(() => {/* 무시 */})
  }, [])

  // 확장 프로그램 문항 추출 대기 (IPC push)
  useEffect(() => {
    if (!isWaitingExtraction) return
    const unsub = window.api.onQuestionsExtracted((extracted) => {
      if (extracted && extracted.length > 0) {
        pushSnapshot('확장 프로그램 추출 이전')
        setQuestions(extracted.map((q) => ({ question: q.question, charLimit: q.charLimit ?? 800 })))
        setIsWaitingExtraction(false)
        if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current)
      }
    })
    // 3분 타임아웃
    extractionTimerRef.current = setTimeout(() => {
      setIsWaitingExtraction(false)
    }, 180000)
    return () => {
      unsub()
      if (extractionTimerRef.current) clearTimeout(extractionTimerRef.current)
    }
  }, [isWaitingExtraction])

  const pushSnapshot = (label: string) => {
    setUndoStack((prev) => [...prev.slice(-4), { label, companyName, jobTitle, jobPosting, questions }])
  }

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const snap = prev[prev.length - 1]
      setCompanyName(snap.companyName)
      setJobTitle(snap.jobTitle)
      setJobPosting(snap.jobPosting)
      setQuestions(snap.questions)
      return prev.slice(0, -1)
    })
  }

  const addQuestion = () => {
    setQuestions([...questions, { question: '', charLimit: 800 }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof QuestionInput, value: string | number) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const canSubmit =
    companyName?.trim() &&
    jobTitle?.trim() &&
    jobPosting?.trim() &&
    questions.every((q) => q.question?.trim() && q.charLimit > 0)

  const handleSubmit = () => {
    if (!canSubmit) return
    if (episodes.length === 0) {
      setShowNoEpisodeWarning(true)
      return
    }
    clearSetupDraft()
    initWizard(companyName, jobTitle, jobPosting, questions, strategy)
    setPatternConfig(selectedPatternIds, patternSettings.useDefaultPatterns)
    navigate('/wizard')
  }

  const handleSubmitAnyway = () => {
    setShowNoEpisodeWarning(false)
    clearSetupDraft()
    initWizard(companyName, jobTitle, jobPosting, questions, strategy)
    setPatternConfig(selectedPatternIds, patternSettings.useDefaultPatterns)
    navigate('/wizard')
  }

  const applyJobOption = (company: string, job: JobOption) => {
    pushSnapshot('스마트 자동완성 이전')
    setCompanyName(company ?? '')
    setJobTitle(job.jobTitle ?? '')
    setJobPosting(job.jobPosting ?? '')
    if (job.questions && job.questions.length > 0) {
      setQuestions(job.questions.map((q) => ({ question: q.question ?? '', charLimit: q.charLimit || 800 })))
    }
    setMode('manual')
  }

  const handleSmartFetch = async () => {
    if (!smartUrl.trim() || isFetching) return
    setFetchError(null)
    setIsFetching(true)
    try {
      const res = await window.api.webFetchUrl(smartUrl.trim()) as {
        success: boolean
        data?: { companyName: string; jobs?: JobOption[]; jobTitle?: string; jobPosting?: string; questions?: QuestionInput[] }
        error?: string
      }
      if (!res.success || !res.data) throw new Error(res.error || '분석 실패')
      const d = res.data
      const company = d.companyName || ''

      // 새 형식: jobs 배열
      if (d.jobs && d.jobs.length > 1) {
        setPendingCompanyName(company)
        setJobOptions(d.jobs)
        setMode('job-select')
      } else if (d.jobs && d.jobs.length === 1) {
        applyJobOption(company, d.jobs[0])
      } else {
        // 구 형식 fallback
        applyJobOption(company, {
          jobTitle: d.jobTitle || '',
          jobPosting: d.jobPosting || '',
          questions: d.questions || []
        })
      }
    } catch (err: any) {
      setFetchError(err.message || '오류가 발생했습니다')
    } finally {
      setIsFetching(false)
    }
  }

  if (mode === 'job-select') {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setMode('smart')} className="text-muted-foreground hover:text-foreground">←</button>
          <div>
            <h2 className="text-2xl font-bold">직무 선택</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{pendingCompanyName} · 지원할 직무를 선택해주세요</p>
          </div>
        </div>
        <div className="space-y-3">
          {jobOptions.map((job, i) => (
            <button
              key={i}
              onClick={() => applyJobOption(pendingCompanyName, job)}
              className="w-full rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{job.jobTitle}</p>
                  {job.jobPosting && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.jobPosting.slice(0, 120)}...
                    </p>
                  )}
                  {job.questions.length > 0 && (
                    <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      자소서 {job.questions.length}문항
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors text-lg">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (mode === 'smart') {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setMode('select')} className="text-muted-foreground hover:text-foreground">←</button>
          <h2 className="text-2xl font-bold">스마트 자동완성</h2>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
            <p className="text-sm font-bold mb-1">채용공고 URL 입력</p>
            <p className="text-xs text-muted-foreground mb-4">AI가 채용공고·자소서 문항을 자동으로 추출합니다.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={smartUrl}
                onChange={(e) => setSmartUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartFetch()}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSmartFetch}
                disabled={!smartUrl.trim() || isFetching}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center gap-2"
              >
                {isFetching ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />분석 중...</>
                ) : '자동 추출'}
              </button>
            </div>
            {fetchError && <p className="mt-2 text-xs text-red-500">{fetchError}</p>}
          </div>
          <button onClick={() => setMode('manual')} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
            직접 입력으로 시작하기 →
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'select') {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h2 className="mb-2 text-2xl font-bold">새 지원서 작성</h2>
        <p className="mb-8 text-sm text-muted-foreground">어떤 방식으로 시작할까요?</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('smart')}
            className="group flex flex-col items-start rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-left transition-all hover:border-primary hover:bg-primary/10 hover:shadow-lg"
          >
            <Zap size={32} className="mb-3 text-primary" />
            <span className="mb-1 text-base font-bold">스마트 자동완성</span>
            <span className="mb-4 text-[11px] font-medium text-primary">추천</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              회사명 + 직무 + 지원사이트 URL만 입력하면
              AI가 채용공고·자소서 문항·인재상을
              자동으로 수집해드립니다.
            </p>
            <span className="mt-4 text-xs font-bold text-primary group-hover:underline">시작하기 →</span>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="group flex flex-col items-start rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:border-foreground/30 hover:shadow-md"
          >
            <MousePointerClick size={32} className="mb-3 text-muted-foreground" />
            <span className="mb-1 text-base font-bold">직접 입력</span>
            <span className="mb-4 text-[11px] font-medium text-muted-foreground">수동 모드</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              채용공고와 자소서 문항을 직접 붙여넣는 방식.
              인터넷이 없거나 공고가 비공개인 경우,
              또는 직접 컨트롤하고 싶을 때 사용하세요.
            </p>
            <span className="mt-4 text-xs font-bold text-muted-foreground group-hover:text-foreground group-hover:underline">시작하기 →</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => setMode('select')} className="text-muted-foreground hover:text-foreground">
          ←
        </button>
        <h2 className="text-2xl font-bold">새 지원서 작성</h2>
      </div>

      {/* 되돌리기 배너 */}
      {undoStack.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            AI가 폼을 채웠습니다 — <span className="font-bold">{undoStack[undoStack.length - 1].label}</span>으로 되돌릴 수 있습니다
          </span>
          <button
            onClick={handleUndo}
            className="ml-4 flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-200 transition-colors dark:border-amber-600 dark:bg-amber-900 dark:text-amber-300 shrink-0"
          >
            <Undo2 size={12} /> 되돌리기
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">기업명</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="삼성SDS"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">직무명</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="백엔드 개발"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Job Posting */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">채용공고 전문</label>
          <textarea
            value={jobPosting}
            onChange={(e) => setJobPosting(e.target.value)}
            placeholder="채용공고 텍스트를 붙여넣으세요..."
            rows={6}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Questions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium">자소서 문항</label>
            <button
              type="button"
              onClick={() => setIsWaitingExtraction(true)}
              className="status-info flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold hover:opacity-80 transition-colors"
            >
              <Puzzle size={14} /> 확장 프로그램으로 가져오기
            </button>
          </div>

          {/* 확장 프로그램 대기 안내 배너 */}
          {isWaitingExtraction && (
            <div className="status-info mb-3 rounded-xl border-2 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
                <div>
                  <p className="text-sm font-bold">확장 프로그램 연결 대기 중...</p>
                  <ol className="mt-1.5 space-y-0.5 text-xs opacity-80">
                    <li>1. 브라우저에서 지원서 작성 페이지를 열어주세요</li>
                    <li>2. 화면 우측 하단의 <strong><ClipboardList size={14} className="inline" /> 문항 추출</strong> 버튼을 클릭하세요</li>
                    <li>3. 문항이 자동으로 채워지고 프로필도 함께 입력됩니다</li>
                  </ol>
                  <button
                    onClick={() => setIsWaitingExtraction(false)}
                    className="mt-2 text-[10px] text-muted-foreground hover:underline"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    문항 {i + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(i)}
                      className="text-xs text-destructive hover:underline"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                  placeholder="자소서 문항을 입력하세요..."
                  className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">글자수 제한:</label>
                  <input
                    type="number"
                    value={q.charLimit}
                    onChange={(e) => updateQuestion(i, 'charLimit', parseInt(e.target.value) || 0)}
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">자</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            className="mt-2 text-sm text-primary hover:underline"
          >
            + 문항 추가
          </button>
        </div>

        {/* Strategy */}
        <div>
          <label className="mb-2 block text-sm font-medium">작성 전략</label>
          <div className="flex gap-3">
            {(['Conservative', 'Balanced', 'Aggressive'] as Strategy[]).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="strategy"
                  value={s}
                  checked={strategy === s}
                  onChange={() => setStrategy(s)}
                  className="accent-primary"
                />
                <span className="text-sm">
                  {s === 'Conservative' && '보수적 (대기업/금융)'}
                  {s === 'Balanced' && '균형 (중견 IT)'}
                  {s === 'Aggressive' && '공격적 (스타트업/R&D)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 패턴 설정 */}
        {(loadedPatterns.length > 0 || !patternSettings.useDefaultPatterns) && (
          <div>
            <label className="mb-2 block text-sm font-medium">패턴 강화 설정</label>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pat-default"
                  checked={patternSettings.useDefaultPatterns}
                  onChange={(e) => setPatternSettings({ useDefaultPatterns: e.target.checked })}
                  className="accent-primary"
                />
                <label htmlFor="pat-default" className="text-xs text-muted-foreground cursor-pointer">
                  기본 패턴 사용 (KB증권·삼성생명·현대해상·한국자금중개)
                </label>
              </div>
              {loadedPatterns.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pat-${p.id}`}
                    checked={selectedPatternIds.includes(p.id)}
                    onChange={(e) => {
                      setSelectedPatternIds((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }}
                    className="accent-primary"
                  />
                  <label htmlFor={`pat-${p.id}`} className="text-xs cursor-pointer">
                    <span className={cn(
                      'mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      p.source === 'history'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    )}>
                      {p.source === 'history' ? '합격 이력' : '업로드'}
                    </span>
                    {p.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            AI 분석 시작
          </button>
          <div className="flex justify-end">
            <ModelPicker endpointKey="company_analyze" />
          </div>
        </div>
      </div>
    </div>

    {/* 에피소드 0개 경고 모달 */}
    {showNoEpisodeWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-amber-500 shrink-0" />
            <h3 className="font-bold text-base">에피소드가 없습니다</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Step 2에서 AI가 에피소드를 추천하려면 최소 1개 이상의 에피소드가 필요합니다.<br />
            <span className="text-xs mt-1 block">프로필 페이지에서 에피소드를 먼저 추가하거나, 없이 진행할 수 있습니다.</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNoEpisodeWarning(false); navigate('/profile') }}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              에피소드 추가하러 가기
            </button>
            <button
              onClick={handleSubmitAnyway}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
            >
              그냥 진행
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
