import { useState, useEffect, useRef } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { buildStep3to5Prompt, GUI_SYSTEM_PROMPT } from '@/lib/prompt-builder'
import { CharacterCounter } from '@/components/common/CharacterCounter'

export function Step3to5Generation() {
  const {
    companyName, jobTitle, jobPosting, hrIntents, strategy,
    questions, activeQuestionIndex,
    isGenerating, setIsGenerating,
    setGeneratedText, appendGeneratedText, setQuestionStep
  } = useWizardStore()

  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const textRef = useRef<HTMLDivElement>(null)

  const q = questions[activeQuestionIndex]
  if (!q || !hrIntents || !strategy || !q.analysisResult) return null

  const startGeneration = () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedText(activeQuestionIndex, '')

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

  useEffect(() => {
    if (!isGenerating) return

    const cleanupChunk = window.api.onStreamChunk((event: unknown) => {
      const e = event as {
        type?: string
        content_block?: { text?: string }
        delta?: { type?: string; text?: string }
        result?: { text?: string }
      }

      // Handle different stream-json event types
      let text = ''
      if (e.type === 'content_block_delta' && e.delta?.text) {
        text = e.delta.text
      } else if (e.type === 'content_block_start' && e.content_block?.text) {
        text = e.content_block.text
      } else if (e.type === 'result' && e.result?.text) {
        // Final result event — replace entire text
        setGeneratedText(activeQuestionIndex, e.result.text)
        return
      } else {
        text = e.delta?.text || e.content_block?.text || ''
      }

      if (text) {
        appendGeneratedText(activeQuestionIndex, text)
      }
    })

    const cleanupEnd = window.api.onStreamEnd(() => {
      setIsGenerating(false)
    })

    const cleanupError = window.api.onStreamError((data: unknown) => {
      const d = data as { message?: string }
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

  const cancelGeneration = async () => {
    await window.api.claudeCancel()
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        Step 3~5: 자소서 생성
        {isGenerating && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">생성 중...</span>
        )}
      </h3>

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
          {hasText ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {q.generatedText}
              {isGenerating && (
                <span className="inline-block h-4 w-0.5 animate-pulse bg-primary" />
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {isGenerating ? 'AI가 자소서를 생성하고 있습니다...' : '아직 생성된 텍스트가 없습니다.'}
            </p>
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

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isGenerating && !isEditing && (
          <>
            {!hasText ? (
              <button
                onClick={startGeneration}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
              >
                자소서 생성 시작
              </button>
            ) : (
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
