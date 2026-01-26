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
  deletedAt?: number;  // 삭제된 시각 (휴지통 기능용)
  
  status: TimerStatus;
  
  // 일시정지 누적 시간(초)
  pausedDuration: number; 
  
  // 마지막으로 일시정지 시작한 시각
  lastPausedAt?: number; 
}

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
}

interface TimerState {
  activeTimer: TimerLog | null;
  logs: TimerLog[];
  deleted_logs: TimerLog[]; // 휴지통
  
  themeConfig: ThemeConfig;

  // --- Actions ---
  startTimer: (title: string, boardNo?: string, category?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  completeTimer: () => void;
  
  addLog: (log: TimerLog) => void;
  updateLog: (id: string, updates: Partial<TimerLog>) => void;
  deleteLog: (id: string) => void; // 휴지통으로 이동
  restoreLog: (id: string) => void; // 휴지통에서 복원
  permanentlyDeleteLog: (id: string) => void; // 영구 삭제
  emptyTrash: () => void; // 휴지통 비우기

  // --- Selectors ---
  getRecentTitles: () => string[];
  getDeletedLogs: () => TimerLog[]; // 최근 30일 이내 삭제된 로그 반환

  // --- Theme Actions ---
  setThemeConfig: (config: Partial<ThemeConfig>) => void;
  toggleDarkMode: () => void;
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
      
      // 테마 초기값
      themeConfig: {
        primaryColor: '#000000',
        accentColor: '#000000',
        isDark: false,
      },

      // Q1. 자동완성 데이터 관리: logs 기반으로 최근 30일 내 고유 Title 추출
      getRecentTitles: () => {
        const { logs } = get();
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        // 1. 최근 30일 데이터 필터링
        const recentLogs = logs.filter(log => (now - log.startTime) <= thirtyDaysMs);
        
        // 2. 타이틀만 추출하여 역순 정렬 (최신순)
        const uniqueTitles = new Set<string>();
        const result: string[] = [];

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
        activeTimer: state.activeTimer?.id === id ? { ...state.activeTimer, ...updates } : state.activeTimer
      })),

      // 삭제: 로그에서 제거하고 deleted_logs로 이동
      deleteLog: (id) => {
        const { logs, activeTimer, deleted_logs } = get();
        const targetLog = logs.find(log => log.id === id);
        
        if (targetLog) {
          const deletedLog: TimerLog = { ...targetLog, deletedAt: Date.now() };
          set({
            logs: logs.filter(log => log.id !== id),
            deleted_logs: [...deleted_logs, deletedLog],
            activeTimer: activeTimer?.id === id ? null : activeTimer
          });
        }
      },

      // 복원: deleted_logs에서 제거하고 logs로 이동
      restoreLog: (id) => {
        const { logs, deleted_logs } = get();
        const targetLog = deleted_logs.find(log => log.id === id);
        
        if (targetLog) {
          const restoredLog: TimerLog = { ...targetLog, deletedAt: undefined };
          set({
            deleted_logs: deleted_logs.filter(log => log.id !== id),
            logs: [...logs, restoredLog]
          });
        }
      },

      // 영구 삭제
      permanentlyDeleteLog: (id) => set((state) => ({
        deleted_logs: state.deleted_logs.filter(log => log.id !== id)
      })),

      // 휴지통 비우기
      emptyTrash: () => set({ deleted_logs: [] }),

      // 삭제된 로그 조회 (최근 30일)
      getDeletedLogs: () => {
        const { deleted_logs } = get();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return deleted_logs.filter(log => (log.deletedAt || 0) > thirtyDaysAgo);
      },

      // 테마 설정 업데이트
      setThemeConfig: (config) => set((state) => ({
        themeConfig: { ...state.themeConfig, ...config }
      })),

      // 다크모드 토글
      toggleDarkMode: () => set((state) => ({
        themeConfig: { ...state.themeConfig, isDark: !state.themeConfig.isDark }
      })),
    }),
    {
      name: 'timekeeper-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
