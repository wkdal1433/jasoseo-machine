/**
 * snapshotStore.ts — AI 결정 스냅샷 저장/복원 시스템
 *
 * R3-1: WizardState의 순수 데이터만 저장 (함수 필드 없음 — WizardState 자체가 순수 직렬화 가능)
 * R3-5: MAX_SNAPSHOTS = 10 으로 메모리 과다 축적 방지
 */
import { create } from 'zustand'
import type { WizardState } from '../types/wizard'

export interface WizardSnapshot {
  id: string
  timestamp: number
  stepLabel: string         // 어떤 시점인지 (예: "Step 0 분석 완료", "문항 1 초안 생성")
  questionIndex: number | null
  state: WizardState
}

interface SnapshotStoreState {
  snapshots: WizardSnapshot[]
}

interface SnapshotStoreActions {
  saveSnapshot: (label: string, state: WizardState, questionIndex?: number | null) => void
  deleteSnapshot: (id: string) => void
  clearSnapshots: () => void
  getLatestSnapshot: () => WizardSnapshot | null
  getSnapshotById: (id: string) => WizardSnapshot | null
}

const MAX_SNAPSHOTS = 10

export const useSnapshotStore = create<SnapshotStoreState & SnapshotStoreActions>((set, get) => ({
  snapshots: [],

  saveSnapshot: (label, state, questionIndex = null) => {
    const snapshot: WizardSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      stepLabel: label,
      questionIndex,
      // 깊은 복사: questions 배열 등 중첩 객체 보호
      state: JSON.parse(JSON.stringify(state)),
    }
    set((prev) => ({
      snapshots: [snapshot, ...prev.snapshots].slice(0, MAX_SNAPSHOTS),
    }))
  },

  deleteSnapshot: (id) => {
    set((prev) => ({ snapshots: prev.snapshots.filter((s) => s.id !== id) }))
  },

  clearSnapshots: () => set({ snapshots: [] }),

  getLatestSnapshot: () => get().snapshots[0] ?? null,

  getSnapshotById: (id) => get().snapshots.find((s) => s.id === id) ?? null,
}))
