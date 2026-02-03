import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { loadPaletteSettings, getAdjustedPalette } from '../utils/colorPalette';
import { useTimerStore } from './useTimerStore';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export interface DeployEvent {
  id: string;
  date: string;           // "2026-01-27" (YYYY-MM-DD)
  job_code: string;       // 프로젝트 코드 "A25_07788"
  job_name: string;       // 표시명 "HTML 다크모드"
  status: string;         // "스테이지", "수시", "연차" 등
  is_holiday: boolean;    // 휴일 여부 (빨간색 텍스트로 표시)
}

export interface JobColor {
  job_code: string;       // 프로젝트 코드
  color: string;          // "#b3e5fc"
}

interface DeployCalendarState {
  events: DeployEvent[];
  job_colors: JobColor[];
  
  // --- Actions ---
  addEvent: (event: Omit<DeployEvent, 'id'>) => string;
  updateEvent: (id: string, updates: Partial<DeployEvent>) => void;
  deleteEvent: (id: string) => void;
  
  // 잡 색상 관리
  setJobColor: (job_code: string, color: string) => void;
  getJobColor: (job_code: string) => string | undefined;
  
  // --- Selectors ---
  getEventsByDate: (date: string) => DeployEvent[];
  getEventsByDateRange: (start_date: string, end_date: string) => DeployEvent[];
  getUniqueJobCodes: () => string[];
}

// ----------------------------------------------------------------------
// 테마 팔레트에서 기본 색상 배열 가져오기
// ----------------------------------------------------------------------

function getDefaultColorsFromTheme(): string[] {
  const settings = loadPaletteSettings();
  const is_dark = useTimerStore.getState().themeConfig.isDark;
  const palette = getAdjustedPalette(settings, is_dark, 45);
  return palette.length > 0 ? palette : ['#b3e5fc', '#c8e6c9', '#fff9c4'];
}

// ----------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------

const STORAGE_KEY = 'timekeeper-deploy-calendar';

export const useDeployCalendarStore = create<DeployCalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      job_colors: [],
      
      addEvent: (event) => {
        const id = uuidv4();
        const new_event: DeployEvent = { ...event, id };
        
        set((state) => ({
          events: [...state.events, new_event]
        }));
        
        // 새 잡 코드에 기본 색상 자동 할당 (테마 팔레트 사용)
        const { job_colors, setJobColor } = get();
        if (event.job_code && !job_colors.find(jc => jc.job_code === event.job_code)) {
          const default_colors = getDefaultColorsFromTheme();
          const color_index = job_colors.length % default_colors.length;
          setJobColor(event.job_code, default_colors[color_index]);
        }
        
        return id;
      },
      
      updateEvent: (id, updates) => set((state) => ({
        events: state.events.map(e => 
          e.id === id ? { ...e, ...updates } : e
        )
      })),
      
      deleteEvent: (id) => set((state) => ({
        events: state.events.filter(e => e.id !== id)
      })),
      
      setJobColor: (job_code, color) => set((state) => {
        const existing = state.job_colors.find(jc => jc.job_code === job_code);
        if (existing) {
          return {
            job_colors: state.job_colors.map(jc =>
              jc.job_code === job_code ? { ...jc, color } : jc
            )
          };
        }
        return {
          job_colors: [...state.job_colors, { job_code, color }]
        };
      }),
      
      getJobColor: (job_code) => {
        const { job_colors } = get();
        return job_colors.find(jc => jc.job_code === job_code)?.color;
      },
      
      getEventsByDate: (date) => {
        const { events } = get();
        return events.filter(e => e.date === date);
      },
      
      getEventsByDateRange: (start_date, end_date) => {
        const { events } = get();
        return events.filter(e => e.date >= start_date && e.date <= end_date);
      },
      
      getUniqueJobCodes: () => {
        const { events } = get();
        const codes = new Set(events.map(e => e.job_code).filter(Boolean));
        return Array.from(codes);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
