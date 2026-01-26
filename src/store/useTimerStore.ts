import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface TimerLog {
  id: string;          // UUID
  title: string;       // 업무 제목
  boardNo?: string;    // 게시판 번호
  category?: string;   // 카테고리
  
  startTime: number;   // 시작 시각 (timestamp ms)
  endTime?: number;    // 종료 시각 (timestamp ms)
  
  status: TimerStatus;
  
  // 일시정지 누적 시간(초)
  pausedDuration: number; 
  
  // 마지막으로 일시정지 시작한 시각
  lastPausedAt?: number; 
}

// 삭제된 로그 타입 (삭제 시간 포함)
export interface DeletedLog extends TimerLog {
  deleted_at: number; // 삭제된 시각 (timestamp ms)
}

interface TimerState {
  activeTimer: TimerLog | null;
  logs: TimerLog[];
  deleted_logs: DeletedLog[]; // 휴지통
  
  // Q1. recentTitles 제거 -> getRecentTitles 함수로 대체
  
  // --- Actions ---
  startTimer: (title: string, boardNo?: string, category?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  completeTimer: () => void;
  
  addLog: (log: TimerLog) => void;
  updateLog: (id: string, updates: Partial<TimerLog>) => void;
  deleteLog: (id: string) => void;
  
  // 휴지통 관련 액션
  restoreLog: (id: string) => void;
  permanentlyDeleteLog: (id: string) => void;
  emptyTrash: () => void;

  // --- Selectors (or Helper Actions) ---
  getRecentTitles: () => string[];
}

// ----------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTimer: null,
      logs: [],
      deleted_logs: [],

      // Q1. 자동완성 데이터 관리: logs 기반으로 최근 30일 내 고유 Title 추출
      getRecentTitles: () => {
        const { logs } = get();
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        // 1. 최근 30일 데이터 필터링
        const recentLogs = logs.filter(log => (now - log.startTime) <= thirtyDaysMs);
        
        // 2. 타이틀만 추출하여 역순 정렬 (최신순)
        // Set을 이용해 중복 제거
        const uniqueTitles = new Set<string>();
        const result: string[] = [];

        // logs는 생성 순서대로(오래된 -> 최신) 쌓인다고 가정하면 뒤에서부터 순회해야 최신
        // 하지만 updateLog 등으로 순서가 섞일 수 있으니 startTime 기준 정렬 권장
        const sortedLogs = [...recentLogs].sort((a, b) => b.startTime - a.startTime);

        for (const log of sortedLogs) {
          if (log.title && !uniqueTitles.has(log.title)) {
            uniqueTitles.add(log.title);
            result.push(log.title);
          }
        }

        return result.slice(0, 30); // 최대 30개
      },

      startTimer: (title, boardNo, category) => {
        const now = Date.now();
        const newTimer: TimerLog = {
          id: crypto.randomUUID(),
          title,
          boardNo,
          category,
          startTime: now,
          status: 'RUNNING',
          pausedDuration: 0,
        };

        // 기존 activeTimer가 있다면 자동 일시정지 처리
        const currentActive = get().activeTimer;
        if (currentActive && currentActive.status === 'RUNNING') {
           const pausedTimer: TimerLog = {
             ...currentActive,
             status: 'PAUSED',
             lastPausedAt: now,
           };
           
           set((state) => ({
             logs: [...state.logs, pausedTimer],
           }));
        }

        set({ activeTimer: newTimer });
      },

      pauseTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.status !== 'RUNNING') return;

        set({
          activeTimer: {
            ...activeTimer,
            status: 'PAUSED',
            lastPausedAt: Date.now(),
          },
        });
      },

      resumeTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer || activeTimer.status !== 'PAUSED' || !activeTimer.lastPausedAt) return;

        const now = Date.now();
        const additionalPauseDuration = (now - activeTimer.lastPausedAt) / 1000;

        set({
          activeTimer: {
            ...activeTimer,
            status: 'RUNNING',
            pausedDuration: activeTimer.pausedDuration + additionalPauseDuration,
            lastPausedAt: undefined,
          },
        });
      },

      stopTimer: () => {
        set({ activeTimer: null });
      },

      completeTimer: () => {
        const { activeTimer } = get();
        if (!activeTimer) return;

        const now = Date.now();
        const completedLog: TimerLog = {
          ...activeTimer,
          status: 'COMPLETED',
          endTime: now,
        };

        set((state) => ({
          activeTimer: null,
          logs: [...state.logs, completedLog],
        }));
      },

      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      
      updateLog: (id, updates) => set((state) => ({
        logs: state.logs.map((log) => (log.id === id ? { ...log, ...updates } : log)),
        // activeTimer도 수정 대상일 수 있음
        activeTimer: state.activeTimer?.id === id ? { ...state.activeTimer, ...updates } : state.activeTimer
      })),

      deleteLog: (id) => set((state) => {
        const log_to_delete = state.logs.find((log) => log.id === id);
        if (!log_to_delete) return state;
        
        // 휴지통으로 이동
        const deleted_log: DeletedLog = {
          ...log_to_delete,
          deleted_at: Date.now(),
        };
        
        return {
          logs: state.logs.filter((log) => log.id !== id),
          deleted_logs: [...state.deleted_logs, deleted_log],
          activeTimer: state.activeTimer?.id === id ? null : state.activeTimer
        };
      }),

      // 휴지통에서 복원
      restoreLog: (id) => set((state) => {
        const deleted_log = state.deleted_logs.find((log) => log.id === id);
        if (!deleted_log) return state;
        
        // deleted_at 제거하고 원래 로그로 복원
        const { deleted_at: _, ...restored_log } = deleted_log;
        
        return {
          deleted_logs: state.deleted_logs.filter((log) => log.id !== id),
          logs: [...state.logs, restored_log as TimerLog],
        };
      }),

      // 영구 삭제
      permanentlyDeleteLog: (id) => set((state) => ({
        deleted_logs: state.deleted_logs.filter((log) => log.id !== id),
      })),

      // 휴지통 비우기
      emptyTrash: () => set({ deleted_logs: [] }),
    }),
    {
      name: 'timekeeper-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
