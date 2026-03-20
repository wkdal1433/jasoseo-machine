import { useState } from 'react'
import { X, Copy, Check, Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EpisodeStatus } from '@/types/episode'
import { EpisodeDiscoveryWizard } from './EpisodeDiscoveryWizard'

interface Props {
  onClose: () => void
  onSaved: () => void
}

const SPARL_SECTIONS = [
  { key: 'situation',    label: 'S — 상황',  pattern: /##\s*(Situation|상황)/i },
  { key: 'problem',     label: 'P — 문제',  pattern: /##\s*(Problem|문제)/i },
  { key: 'action',      label: 'A — 행동',  pattern: /##\s*(Action|행동)/i },
  { key: 'achievement', label: 'A — 성과',  pattern: /##\s*(Achievement|성과)/i },
  { key: 'result',      label: 'R — 결과',  pattern: /##\s*(Result|결과)/i },
  { key: 'learning',    label: 'L — 배움',  pattern: /##\s*(Learning|배움|학습)/i },
]

const CLI_PROMPT = `저는 취업 준비 중이에요. 아래 MD 양식에 맞춰 제 경험을 정리해주세요.

## 작성 형식

# 기본 프로필
이름: (본인 이름)
학교: (학교명, 전공, 학위)
졸업: (졸업 또는 예정 년월)
희망직무: (지원하려는 직무)

# 에피소드 1: (경험 제목)
## Situation (상황)
(언제, 어느 조직에서, 어떤 역할로 — 1~2문장)
## Problem (문제)
(해결해야 했던 핵심 문제 또는 도전 — 구체적 수치/현상 포함)
## Action (행동)
(내가 직접 취한 행동 — 1인칭, 구체적 단계별로)
## Achievement (성과)
(행동의 직접 결과물 — 수치, 산출물, KPI)
## Result (결과)
(조직/팀 차원의 최종 결과)
## Learning (배움)
(이 경험으로 성장한 역량 또는 인사이트)

## 내 경험 (아래에 자유롭게 적어주세요)
`

const TEMPLATE_MD = `# 기본 프로필
이름: 홍길동
학교: XX대학교 컴퓨터공학과 (4년제)
졸업: 2024년 2월
희망직무: 백엔드 개발자

# 에피소드 1: API 응답속도 40% 개선
## Situation (상황)
2023년 여름 인턴 기간 중 XX스타트업 서버 개발팀에서 백엔드 인턴으로 근무했습니다.
## Problem (문제)
주요 상품 목록 API의 평균 응답시간이 800ms에 달해 사용자 이탈률이 높았습니다.
## Action (행동)
쿼리 실행 계획을 분석하고 N+1 문제를 발견했습니다. Redis 캐싱 레이어를 도입하고 DB 인덱스를 재설계했습니다.
## Achievement (성과)
API 응답시간 800ms → 480ms로 40% 단축, 캐시 히트율 73% 달성.
## Result (결과)
해당 페이지 이탈률 15% 감소, 팀 내 캐싱 표준 가이드 문서로 채택되었습니다.
## Learning (배움)
성능 문제는 측정 없이 해결할 수 없다는 것을 배웠습니다. 데이터 기반 디버깅 습관을 갖게 되었습니다.
`

interface ParsedEpisode {
  title: string
  raw: string
  present: string[]
  missing: string[]
  status: EpisodeStatus
}

function parseCliMd(content: string): { profileText: string; episodes: ParsedEpisode[] } {
  const profileMatch = content.match(/^#\s+기본\s*프로필([\s\S]*?)(?=^#\s+에피소드|^#\s+Episode|\z)/im)
  const profileText = profileMatch ? profileMatch[1].trim() : ''

  const parts = content.split(/(?=^#\s+(?:에피소드|Episode)\s)/im)
  const episodeParts = parts.filter(p => /^#\s+(?:에피소드|Episode)/i.test(p.trim()))

  const episodes: ParsedEpisode[] = episodeParts.map(raw => {
    const titleMatch = raw.match(/^#\s+(?:에피소드|Episode)\s*\d*[:\s]*(.*)/i)
    const title = titleMatch?.[1]?.trim() || '제목 없음'

    const present: string[] = []
    const missing: string[] = []
    for (const sec of SPARL_SECTIONS) {
      if (sec.pattern.test(raw)) present.push(sec.key)
      else missing.push(sec.key)
    }

    const status: EpisodeStatus =
      missing.length === 0 ? 'ready' :
      present.length >= 3  ? 'needs_review' :
      'draft'

    return { title, raw, present, missing, status }
  })

  return { profileText, episodes }
}

type FlowStep = 'guide' | 'results'

export function MdCliImportModal({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<FlowStep>('guide')
  const [copied, setCopied] = useState<'prompt' | 'template' | null>(null)
  const [parsed, setParsed] = useState<{ profileText: string; episodes: ParsedEpisode[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedFlags, setSavedFlags] = useState<Record<number, boolean>>({})
  const [refineEpisode, setRefineEpisode] = useState<{ title: string; raw: string } | null>(null)

  const copyText = (text: string, key: 'prompt' | 'template') => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFileSelect = async () => {
    const filePath = await window.api.selectFile([{ name: 'Markdown 파일', extensions: ['md'] }])
    if (!filePath) return
    const content = await window.api.readMd(filePath as string)
    if (!content) { alert('파일을 읽을 수 없습니다.'); return }
    const result = parseCliMd(content)
    if (result.episodes.length === 0) {
      alert('에피소드 섹션을 찾지 못했습니다.\n"# 에피소드 1: ..." 형식으로 시작하는 섹션이 있는지 확인해주세요.')
      return
    }
    setParsed(result)
    setStep('results')
  }

  const saveEpisode = async (ep: ParsedEpisode, idx: number) => {
    setSaving(true)
    try {
      const slug = ep.title.replace(/[^\w가-힣\s]/g, '').replace(/\s+/g, '_').slice(0, 30) || `ep${idx + 1}`
      const fileName = `ep_cli_${Date.now()}_${idx}_${slug}.md`
      await window.api.episodeSaveFile(fileName, `# ${ep.title}\n\n${ep.raw}`)
      setSavedFlags(prev => ({ ...prev, [idx]: true }))
    } finally {
      setSaving(false)
    }
  }

  const saveAllReady = async () => {
    if (!parsed) return
    setSaving(true)
    for (let i = 0; i < parsed.episodes.length; i++) {
      const ep = parsed.episodes[i]
      if (ep.status === 'ready' && !savedFlags[i]) {
        await saveEpisode(ep, i)
      }
    }
    setSaving(false)
    onSaved()
  }

  if (refineEpisode) {
    const fakeEpisode = {
      id: `cli_refine_${Date.now()}`,
      title: refineEpisode.title,
      content: refineEpisode.raw,
      status: 'needs_review' as EpisodeStatus,
      fileName: '',
      hrIntents: [],
      competencies: [],
      period: '',
      organization: '',
      role: '',
    }
    return (
      <EpisodeDiscoveryWizard
        initialEpisode={fakeEpisode}
        onClose={() => { setRefineEpisode(null); onSaved() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-primary/5">
          <div>
            <h2 className="text-base font-bold">CLI로 직접 구성하기</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Claude Code / Gemini CLI로 만든 MD 파일을 가져옵니다</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── GUIDE 단계 ── */}
          {step === 'guide' && (
            <div className="space-y-5">
              {/* Step 1 */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Step 1 — CLI에 아래 프롬프트를 붙여넣기</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Claude Code 또는 Gemini CLI를 실행하고 아래 프롬프트를 주면, CLI가 정해진 양식으로 MD 파일을 만들어줍니다.
                </p>
                <div className="relative rounded-lg bg-muted/50 border border-border">
                  <pre className="p-3 text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">{CLI_PROMPT}</pre>
                  <button
                    onClick={() => copyText(CLI_PROMPT, 'prompt')}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted transition-colors"
                  >
                    {copied === 'prompt' ? <><Check size={10} /> 복사됨</> : <><Copy size={10} /> 복사</>}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Step 2 — 또는 템플릿을 복사해서 직접 작성</p>
                <p className="text-xs text-muted-foreground mb-3">
                  CLI 없이 직접 작성하는 경우, 아래 템플릿을 복사해서 본인 경험으로 채워주세요.
                </p>
                <div className="relative rounded-lg bg-muted/50 border border-border">
                  <pre className="p-3 text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-44 overflow-y-auto">{TEMPLATE_MD}</pre>
                  <button
                    onClick={() => copyText(TEMPLATE_MD, 'template')}
                    className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted transition-colors"
                  >
                    {copied === 'template' ? <><Check size={10} /> 복사됨</> : <><Copy size={10} /> 복사</>}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Step 3 — 완성한 MD 파일 업로드</p>
                <p className="text-xs text-muted-foreground mb-3">
                  CLI가 생성한 파일 또는 직접 작성한 파일을 아래 버튼으로 선택하면,
                  S-P-A-A-R-L 완성도를 자동으로 검사하고 결과를 보여줍니다.
                </p>
                <button
                  onClick={handleFileSelect}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-sm font-medium text-primary hover:border-primary/70 hover:bg-primary/10 transition-all"
                >
                  <Upload size={18} />
                  MD 파일 선택하기
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS 단계 ── */}
          {step === 'results' && parsed && (
            <div className="space-y-4">
              {/* 프로필 섹션 */}
              {parsed.profileText && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">기본 프로필 감지됨</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{parsed.profileText}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                총 <span className="font-bold text-foreground">{parsed.episodes.length}개</span>의 에피소드를 발견했습니다.
                S-P-A-A-R-L 완성도를 확인하고 저장하거나 인터뷰로 보강하세요.
              </p>

              {parsed.episodes.map((ep, idx) => (
                <div key={idx} className={cn(
                  'rounded-xl border p-4',
                  ep.status === 'ready' ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' :
                  ep.status === 'needs_review' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800' :
                  'border-border bg-muted/30'
                )}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                          ep.status === 'ready' ? 'bg-green-100 text-green-700 border-green-200' :
                          ep.status === 'needs_review' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          {ep.status === 'ready' ? '완성' : ep.status === 'needs_review' ? '보강 필요' : '미완성'}
                        </span>
                        {savedFlags[idx] && <span className="text-[10px] text-green-600 font-medium">✓ 저장됨</span>}
                      </div>
                      <p className="text-sm font-bold">{ep.title}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {ep.status !== 'ready' && (
                        <button
                          onClick={() => setRefineEpisode({ title: ep.title, raw: ep.raw })}
                          className="rounded-lg border border-dashed border-yellow-400 px-3 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-100 transition-colors"
                        >
                          인터뷰로 보강 →
                        </button>
                      )}
                      {!savedFlags[idx] && (
                        <button
                          onClick={() => saveEpisode(ep, idx)}
                          disabled={saving}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          저장
                        </button>
                      )}
                    </div>
                  </div>

                  {/* S-P-A-A-R-L 뱃지 */}
                  <div className="flex flex-wrap gap-1.5">
                    {SPARL_SECTIONS.map(sec => (
                      <span key={sec.key} className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        ep.present.includes(sec.key)
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-500 border-red-200 line-through'
                      )}>
                        {sec.label}
                      </span>
                    ))}
                  </div>

                  {ep.missing.length > 0 && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      누락: {ep.missing.join(', ')} — 인터뷰로 보강하거나 직접 MD를 수정 후 다시 업로드하세요.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-3 bg-card">
          {step === 'guide' && (
            <>
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                닫기
              </button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={12} />
                파일을 선택하면 자동으로 다음 단계로 이동합니다
              </div>
            </>
          )}
          {step === 'results' && parsed && (
            <>
              <button onClick={() => setStep('guide')} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                ← 다시 업로드
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  닫기
                </button>
                {parsed.episodes.some(ep => ep.status === 'ready') && (
                  <button
                    onClick={saveAllReady}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? '저장 중...' : `완성 에피소드 전체 저장 (${parsed.episodes.filter(e => e.status === 'ready').length}개)`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
