import { useEffect, useRef } from 'react'
import { useWizardStore } from '@/stores/wizardStore'
import { useSnapshotStore } from '@/stores/snapshotStore'

const AUTO_SAVE_INTERVAL = 30000 // 30 seconds

export function useAutoSave() {
  const store = useWizardStore()
  const prevStepRef = useRef<string>('')

  useEffect(() => {
    if (!store.applicationId) return

    const save = () => {
      const state = {
        applicationId: store.applicationId,
        companyName: store.companyName,
        jobTitle: store.jobTitle,
        jobPosting: store.jobPosting,
        strategy: store.strategy,
        hrIntents: store.hrIntents,
        recruitmentContext: store.recruitmentContext,
        questions: store.questions,
        activeQuestionIndex: store.activeQuestionIndex,
        step0Completed: store.step0Completed,
        snapshots: useSnapshotStore.getState().snapshots,
      }
      window.api.draftSave(store.applicationId, state)
    }

    // Save on step changes
    const currentStepKey = store.questions
      .map((q) => `${q.currentStep}-${q.status}`)
      .join(',')
    if (prevStepRef.current && prevStepRef.current !== currentStepKey) {
      save()
    }
    prevStepRef.current = currentStepKey

    // Periodic save
    const interval = setInterval(save, AUTO_SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [
    store.applicationId,
    store.questions,
    store.activeQuestionIndex,
    store.step0Completed
  ])
}
