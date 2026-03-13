import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '@/stores/wizardStore'
import type { Strategy, QuestionInput } from '@/types/application'

type SetupMode = 'select' | 'manual' | 'smart'

export function ApplicationSetup() {
  const { initWizard } = useWizardStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<SetupMode>('select')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobPosting, setJobPosting] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('Balanced')
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { question: '', charLimit: 800 }
  ])

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
    companyName.trim() &&
    jobTitle.trim() &&
    jobPosting.trim() &&
    questions.every((q) => q.question.trim() && q.charLimit > 0)

  const handleSubmit = () => {
    if (!canSubmit) return
    initWizard(companyName, jobTitle, jobPosting, questions, strategy)
    navigate('/wizard')
  }

  if (mode === 'smart') {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setMode('select')} className="text-muted-foreground hover:text-foreground">
            ←
          </button>
          <h2 className="text-2xl font-bold">스마트 자동완성</h2>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center">
          <p className="text-2xl mb-3">🚀</p>
          <p className="font-bold text-base mb-2">준비 중입니다</p>
          <p className="text-sm text-muted-foreground mb-6">
            URL 기반 자동 수집 기능은 곧 출시됩니다.<br />
            지금은 직접 입력 모드를 사용해 주세요.
          </p>
          <button
            onClick={() => setMode('manual')}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
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
            <span className="mb-3 text-3xl">🚀</span>
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
            <span className="mb-3 text-3xl">✍️</span>
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
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => setMode('select')} className="text-muted-foreground hover:text-foreground">
          ←
        </button>
        <h2 className="text-2xl font-bold">새 지원서 작성</h2>
      </div>

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
          <label className="mb-3 block text-sm font-medium">자소서 문항</label>
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          AI 분석 시작
        </button>
      </div>
    </div>
  )
}
