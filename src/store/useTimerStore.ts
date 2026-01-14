import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----------------------------------------------------------------------
// Types (나중에 별도 types.ts로 분리 가능)
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
  
  // 일시정지 누적 시간(초) - "순수 작업 시간" 계산용
  // (현재 시각 - 시작 시각) - pausedDuration = 실제 작업 시간
  pausedDuration: number; 
  
  // 마지막으로 일시정지 시작한 시각 (PAUSED 상태일 때만 값 존재)
  lastPausedAt?: number; 
}

interface TimerState {
  // 1. 현재 활성 타이머 (진행 중 or 일시정지)
  activeTimer: TimerLog | null;

  // 2. 완료된 타이머 기록들 (리포트용)
  logs: TimerLog[];

  // 3. 최근 입력한 제목들 (자동완성용)
  recentTitles: string[];

  // --- Actions ---
  startTimer: (title: string, boardNo?: string, category?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void; // 중단(삭제)
  completeTimer: () => void; // 완료(로그 저장)
  
  // 수동 기록 추가/수정용
  addLog: (log: TimerLog) => void;
  updateLog: (id: string, updates: Partial<TimerLog>) => void;
  deleteLog: (id: string) => void;
}

// ----------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      activeTimer: null,
      logs: [],
      recentTitles: [],

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

        // 기존 activeTimer가 있다면 자동 일시정지 처리하거나, 
        // 요구사항(PRD 82번: 새 타이머 시작 시 기존 타이머 자동 일시정지)에 따름
        const currentActive = get().activeTimer;
        if (currentActive && currentActive.status === 'RUNNING') {
           // 기존꺼 일시정지 처리 구현 필요하면 여기서 호출
           // 여기서는 단순 교체보다는, 기존꺼를 PAUSED 상태로 logs에 넘기는게 아니라
           // "동시에 하나만 Active" 정책이므로, 기존꺼를 잠시 보관할지 결정해야 함.
           // PRD 82: "새 타이머 시작 시 기존 진행 중인 타이머를 자동으로 일시정지(Auto-pause)"
           // -> 하지만 구조상 activeTimer는 1개 변수이므로, 기존 타이머를 어디론가 치워야 함.
           // -> 여기서는 일단 간단히: 기존 activeTimer를 일시정지 상태로 만들어서 logs 배열에 임시 저장하거나
           //    별도 'suspendedTimers' 큐가 필요할 수 있음. 
           //    **이번 단계에서는 복잡도를 낮추기 위해, 기존 타이머가 있으면 강제로 '일시정지' 상태로 만들어 logs에 넣고 새거 시작함.**
           
           const pausedTimer: TimerLog = {
             ...currentActive,
             status: 'PAUSED',
             lastPausedAt: now,
           };
           
           set((state) => ({
             logs: [...state.logs, pausedTimer],
           }));
        }

        // 새 타이머 시작
        // 최근 제목 저장
        set((state) => {
          const newRecentTitles = [title, ...state.recentTitles.filter((t) => t !== title)].slice(0, 30); // 중복제거 & 30개 유지
          return {
            activeTimer: newTimer,
            recentTitles: newRecentTitles,
          };
        });
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
        const additionalPauseDuration = (now - activeTimer.lastPausedAt) / 1000; // 초 단위

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
        // 만약 일시정지 상태에서 완료를 눌렀다면, 마지막 일시정지 기간도 pauseDuration에 포함해야 할까?
        // 보통은 일시정지 상태에서 바로 완료하면, 일시정지 시작~현재까지는 작업시간 아님.
        // running 상태에서 완료하면, 그냥 현재시간으로 끝.
        
        // 최종 로그 생성
        const completedLog: TimerLog = {
          ...activeTimer,
          status: 'COMPLETED',
          endTime: now,
          // 만약 PAUSED 상태였다면, lastPausedAt 이후 시간은 작업시간에 포함 안됨 -> pausedDuration 갱신 필요 없음.
          // 만약 RUNNING 상태였다면, 그냥 끝.
        };

        set((state) => ({
          activeTimer: null,
          logs: [...state.logs, completedLog],
        }));
      },

      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
      
      updateLog: (id, updates) => set((state) => ({
        logs: state.logs.map((log) => (log.id === id ? { ...log, ...updates } : log)),
      })),

      deleteLog: (id) => set((state) => ({
        logs: state.logs.filter((log) => log.id !== id),
      })),
    }),
    {
      name: 'timekeeper-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
