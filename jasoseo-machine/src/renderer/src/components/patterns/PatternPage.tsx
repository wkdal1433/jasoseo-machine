import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ModelPicker } from '@/components/common/ModelPicker'

interface ExtractedPattern {
  narrativeStructure: string
  openingStyle: string
  dualCodingKeywords: string[]
  specificityLevel: string
  closingStyle: string
  toneProfile: string
  highlightExamples: string[]
}

interface PatternRecord {
  id: string
  name: string
  source: 'uploaded' | 'history'
  applicationId?: string
  isActive: boolean
  analysisStatus: 'analyzing' | 'ready' | 'failed'
  extractedPattern: ExtractedPattern | null
  createdAt: string
}

interface PatternSettings {
  useDefaultPatterns: boolean
}

export function PatternPage() {
  const [patterns, setPatterns] = useState<PatternRecord[]>([])
  const [settings, setSettings] = useState<PatternSettings>({ useDefaultPatterns: true })
  const [previewPattern, setPreviewPattern] = useState<PatternRecord | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const hasActiveUserPattern = patterns.some((p) => p.isActive)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const [list, s] = await Promise.all([
      window.api.patternList() as Promise<PatternRecord[]>,
      window.api.patternSettingsGet() as Promise<PatternSettings>
    ])
    setPatterns(list)
    setSettings(s)
  }

  const handleToggle = async (id: string, current: boolean) => {
    await window.api.patternToggle(id, !current)
    setPatterns((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !current } : p))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 패턴을 삭제할까요?')) return
    await window.api.patternDelete(id)
    setPatterns((prev) => prev.filter((p) => p.id !== id))
  }

  const handleToggleDefault = async (val: boolean) => {
    const newSettings = { ...settings, useDefaultPatterns: val }
    await window.api.patternSettingsSave(newSettings)
    setSettings(newSettings)
  }

  const handleUpload = async () => {
    const file = await window.api.selectFile({ filters: [{ name: 'Text', extensions: ['txt', 'md', 'pdf', 'docx'] }] }) as string | null
    if (!file) return

    setIsUploading(true)
    try {
      let text = ''
      if (file.endsWith('.pdf')) {
        const result = await window.api.parsePdf(file) as { text?: string }
        text = result?.text || ''
      } else {
        text = await window.api.readMd(file) as string
      }
      if (!text.trim()) throw new Error('파일 내용을 읽을 수 없습니다')

      const fileName = file.split(/[\\/]/).pop() || file
      const id = `pat_${Date.now()}`
      const newPattern: PatternRecord = {
        id,
        name: fileName.replace(/\.[^.]+$/, ''),
        source: 'uploaded',
        isActive: true,
        analysisStatus: 'analyzing',
        extractedPattern: null,
        createdAt: new Date().toISOString()
      }
      await window.api.patternSave(newPattern)
      setPatterns((prev) => [newPattern, ...prev])

      // AI 분석 (비동기)
      const result = await window.api.patternAnalyze(id, text) as { success: boolean; extractedPattern?: ExtractedPattern }
      if (result.success && result.extractedPattern) {
        setPatterns((prev) => prev.map((p) =>
          p.id === id ? { ...p, analysisStatus: 'ready', extractedPattern: result.extractedPattern! } : p
        ))
      } else {
        setPatterns((prev) => prev.map((p) =>
          p.id === id ? { ...p, analysisStatus: 'failed' } : p
        ))
      }
    } catch (err: any) {
      alert('업로드 실패: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">자소서 패턴 강화</h2>
        <p className="text-sm text-muted-foreground">
          합격 자소서를 분석해 AI가 자소서를 쓸 때 참조하는 패턴 데이터로 활용합니다.
        </p>
      </div>

      {/* 기본 패턴 설정 */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">기본 패턴 (앱 내장)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              KB증권·삼성생명·현대해상·한국자금중개 S급 합격 자소서 패턴 기반
            </p>
          </div>
          <button
            onClick={() => handleToggleDefault(!settings.useDefaultPatterns)}
            disabled={!hasActiveUserPattern && settings.useDefaultPatterns}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors focus:outline-none',
              settings.useDefaultPatterns ? 'bg-primary' : 'bg-muted',
              (!hasActiveUserPattern && settings.useDefaultPatterns) && 'opacity-50 cursor-not-allowed'
            )}
            title={!hasActiveUserPattern && settings.useDefaultPatterns ? '사용자 패턴이 하나 이상 활성화되면 기본 패턴을 끌 수 있습니다' : ''}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              settings.useDefaultPatterns ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>
        {hasActiveUserPattern && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            사용자 패턴이 활성화된 상태입니다. 기본 패턴을 끄고 내 데이터만 사용할 수 있습니다.
          </p>
        )}
      </div>

      {/* 패턴 추가 버튼 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">내 패턴</h3>
        <div className="flex items-center gap-2">
          <ModelPicker endpointKey="pattern_analyze" />
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isUploading ? '분석 중...' : '+ 자소서 파일 업로드'}
          </button>
        </div>
      </div>

      {/* 패턴 카드 목록 */}
      {patterns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          추가된 패턴이 없습니다.<br />
          합격 자소서 파일을 업로드하거나 작성 이력에서 합격 항목을 추가하세요.
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => (
            <div
              key={p.id}
              className={cn(
                'rounded-xl border p-4 transition-all',
                p.isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-card opacity-60'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(p.id, p.isActive)}
                    disabled={p.analysisStatus === 'analyzing'}
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                      p.isActive ? 'bg-primary' : 'bg-muted',
                      p.analysisStatus === 'analyzing' && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                      p.isActive ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </button>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-[10px] font-bold rounded-full px-1.5 py-0.5',
                        p.source === 'history'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      )}>
                        {p.source === 'history' ? '합격 이력' : '파일 업로드'}
                      </span>
                      {p.analysisStatus === 'analyzing' && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-1">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border border-amber-500 border-t-transparent" />
                          분석 중...
                        </span>
                      )}
                      {p.analysisStatus === 'failed' && (
                        <span className="text-[10px] text-red-500">분석 실패</span>
                      )}
                      {p.analysisStatus === 'ready' && (
                        <span className="text-[10px] text-green-600">✓ 분석 완료</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.analysisStatus === 'ready' && p.extractedPattern && (
                    <button
                      onClick={() => setPreviewPattern(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      패턴 보기
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 패턴 미리보기 모달 */}
      {previewPattern?.extractedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[80vh]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-base">패턴 분석 결과 — {previewPattern.name}</h3>
              <button onClick={() => setPreviewPattern(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">서사 구조</p>
                <p>{previewPattern.extractedPattern.narrativeStructure}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">도입부 스타일</p>
                <p>{previewPattern.extractedPattern.openingStyle}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">이중 코딩 키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewPattern.extractedPattern.dualCodingKeywords.map((k, i) => (
                    <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">구체성 수준</p>
                <p>{previewPattern.extractedPattern.specificityLevel}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">마무리 패턴</p>
                <p>{previewPattern.extractedPattern.closingStyle}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">톤 프로파일</p>
                <p>{previewPattern.extractedPattern.toneProfile}</p>
              </div>
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">대표 문장 예시</p>
                <div className="space-y-2">
                  {previewPattern.extractedPattern.highlightExamples.map((ex, i) => (
                    <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground italic leading-relaxed">
                      {ex}
                    </blockquote>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
