import { useState } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import type { Strategy, QuestionInput } from '@/types/application'

export function ApplicationSetup() {
  const { initWizard } = useWizardStore()
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
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h2 className="mb-6 text-2xl font-bold">새 지원서 작성</h2>

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
