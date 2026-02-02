import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface TimerLog {
  id: string;          // UUID
  title: string;       // 업무 제목
  projectCode?: string; // 프로젝트 코드 (기존 boardNo 대체)
  category?: string;   // 카테고리
  note?: string;       // 비고
  
  startTime: number;   // 시작 시각 (timestamp ms)
  endTime?: number;    // 종료 시각 (timestamp ms)
  deletedAt?: number;  // 삭제된 시각 (휴지통 기능용)
  
  status: TimerStatus;
  
  // 일시정지 누적 시간(초)
  pausedDuration: number; 
  
  // 마지막으로 일시정지 시작한 시각
  lastPausedAt?: number; 
}

// 삭제된 로그 타입 (휴지통용)
export interface DeletedLog extends TimerLog {
  deletedAt: number; // 삭제된 로그는 deletedAt이 필수
}

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
}

export interface ViewConfig {
  zoomLevel: number; // 50 ~ 200 (%)
}

interface TimerState {
  activeTimer: TimerLog | null;
  logs: TimerLog[];
  deleted_logs: TimerLog[]; // 휴지통
  excludedTitles: string[]; // 자동완성에서 제외된 제목들
  
  themeConfig: ThemeConfig;
  viewConfig: ViewConfig;

  // --- 색상 인덱스 관리 (글로벌) ---
  titleColorIndexMap: Record<string, number>; // 작업 제목별 색상 인덱스 매핑
  nextColorIndex: number; // 다음에 할당할 색상 인덱스

  // --- Actions ---
  startTimer: (title: string, projectCode?: string, category?: string, note?: string) => void;
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
  reopenTimer: (id: string) => void; // 완료된 작업을 다시 진행 상태로 전환
  removeRecentTitle: (title: string) => void; // 자동완성에서 제목 제외
  pauseAndMoveToLogs: () => void; // 진행중인 타이머를 일시정지 후 logs로 이동
  updateActiveTimer: (updates: Partial<TimerLog>) => void; // activeTimer 업데이트

  // --- Selectors ---
  getRecentTitles: () => string[];
  getDeletedLogs: () => TimerLog[]; // 최근 30일 이내 삭제된 로그 반환
  getOrAssignColorIndex: (title: string) => number; // 색상 인덱스 조회 또는 할당

  // --- Theme Actions ---
  setThemeConfig: (config: Partial<ThemeConfig>) => void;
  toggleDarkMode: () => void;

  // --- View Actions ---
  setZoomLevel: (level: number) => void;
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
      excludedTitles: [],
      
      // 테마 초기값
      themeConfig: {
        primaryColor: '#000000',
        accentColor: '#000000',
        isDark: false,
      },

      // 뷰 설정 초기값
      viewConfig: {
        zoomLevel: 100, // 100%
      },

      // 색상 인덱스 관리 초기값
      titleColorIndexMap: {},
      nextColorIndex: 0,

      // 색상 인덱스 조회 또는 할당
      getOrAssignColorIndex: (title) => {
        const { titleColorIndexMap, nextColorIndex } = get();
        
        // 이미 할당된 색상이 있으면 반환
        if (title in titleColorIndexMap) {
          return titleColorIndexMap[title];
        }
        
        // 새 색상 인덱스 할당 및 저장
        const assignedIndex = nextColorIndex;
        set({
          titleColorIndexMap: { ...titleColorIndexMap, [title]: assignedIndex },
          nextColorIndex: nextColorIndex + 1
        });
        
        return assignedIndex;
      },

      // 자동완성에서 제목 제외
      removeRecentTitle: (title) => set((state) => ({
        excludedTitles: state.excludedTitles.includes(title) 
          ? state.excludedTitles 
          : [...state.excludedTitles, title]
      })),

      // Q1. 자동완성 데이터 관리: logs 기반으로 최근 30일 내 고유 Title 추출
      getRecentTitles: () => {
        const { logs, excludedTitles } = get();
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        // 1. 최근 30일 데이터 필터링
        const recentLogs = logs.filter(log => (now - log.startTime) <= thirtyDaysMs);
        
        // 2. 타이틀만 추출하여 역순 정렬 (최신순)
        const uniqueTitles = new Set<string>();
        const result: string[] = [];

        const sortedLogs = [...recentLogs].sort((a, b) => b.startTime - a.startTime);

        for (const log of sortedLogs) {
          if (log.title && !uniqueTitles.has(log.title) && !excludedTitles.includes(log.title)) {
            uniqueTitles.add(log.title);
            result.push(log.title);
          }
        }

        return result.slice(0, 30); // 최대 30개
      },

      startTimer: (title, projectCode, category, note) => {
        const now = Date.now();
        const { logs } = get();
        
        // 기존 완료된 세션은 그대로 유지 (endTime, status 변경 없음)
        // 새 세션만 새로 시작
        
        const newTimer: TimerLog = {
          id: crypto.randomUUID(),
          title,
          projectCode,
          category,
          note,
          startTime: now,
          status: 'RUNNING',
          pausedDuration: 0,
        };

        // 기존 activeTimer가 있다면 미완료 상태로 logs에 이동
        const currentActive = get().activeTimer;
        if (currentActive) {
          let timerToMove: TimerLog;
          
          if (currentActive.status === 'RUNNING') {
            // RUNNING 상태면 PAUSED로 변경
            timerToMove = {
              ...currentActive,
              status: 'PAUSED',
              lastPausedAt: now,
              endTime: now, // 종료 시간도 함께 설정
            };
          } else {
            // PAUSED 상태면 그대로 유지
            timerToMove = { ...currentActive };
          }
          
          set({
            logs: [...logs, timerToMove],
            activeTimer: newTimer,
          });
        } else {
          set({ 
            logs,
            activeTimer: newTimer 
          });
        }
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
        
        // PAUSED 상태에서 완료 시, 마지막 일시정지 시간을 pausedDuration에 추가
        let finalPausedDuration = activeTimer.pausedDuration;
        if (activeTimer.status === 'PAUSED' && activeTimer.lastPausedAt) {
          finalPausedDuration += (now - activeTimer.lastPausedAt) / 1000;
        }
        
        const completedLog: TimerLog = {
          ...activeTimer,
          status: 'COMPLETED',
          endTime: now,
          pausedDuration: finalPausedDuration,
          lastPausedAt: undefined,
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

      // 완료된 작업을 완료 취소 (COMPLETED → PAUSED로만 변경, 타이머 시작 안 함)
      reopenTimer: (id) => {
        set((state) => ({
          logs: state.logs.map(log => 
            log.id === id && log.status === 'COMPLETED'
              ? { ...log, status: 'PAUSED' as const, endTime: undefined }
              : log
          ),
        }));
      },

      // 진행중인 타이머를 일시정지 후 logs로 이동 (세션 종료)
      pauseAndMoveToLogs: () => {
        const { activeTimer } = get();
        if (!activeTimer) return;

        const now = Date.now();
        const timerToMove: TimerLog = {
          ...activeTimer,
          status: 'PAUSED',
          endTime: now, // 일시정지 시점을 종료 시간으로 설정
          lastPausedAt: now,
        };
        
        set((state) => ({
          logs: [...state.logs, timerToMove],
          activeTimer: null,
        }));
      },

      // activeTimer 업데이트
      updateActiveTimer: (updates) => {
        const { activeTimer } = get();
        if (!activeTimer) return;

        set({
          activeTimer: { ...activeTimer, ...updates },
        });
      },

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

      // 줌 레벨 설정 (50% ~ 200%)
      setZoomLevel: (level) => set((state) => ({
        viewConfig: { ...state.viewConfig, zoomLevel: Math.min(200, Math.max(50, level)) }
      })),
    }),
    {
      name: 'timekeeper-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
