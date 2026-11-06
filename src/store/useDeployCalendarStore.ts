import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { idbStorage } from '../utils/storage';
import { loadPaletteSettings, getAdjustedPalette } from '../utils/colorPalette';
import { useTimerStore } from './useTimerStore';
import type { AttendanceTarget, ErpAttendance } from '../utils/erpAttendance';

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

/** 저장해 두는 근태 한 건 (어느 조회 대상에서 왔는지 target 키를 단다) */
export type StoredAttendance = ErpAttendance & { target: string };

/** 캘린더에 한 번에 표시할 주 수 (1~4) */
export const DEPLOY_CALENDAR_WEEKS_MIN = 1;
export const DEPLOY_CALENDAR_WEEKS_MAX = 4;
export const DEPLOY_CALENDAR_WEEKS_DEFAULT = 2;

/** 보기 방식: week = 설정한 주 수만큼(이번 주가 마지막), month = 한 달 고정 */
export type DeployCalendarViewMode = 'week' | 'month';

interface DeployCalendarState {
  events: DeployEvent[];
  job_colors: JobColor[];
  /** 표시할 주 수 (1~4). 주 단위 보기에서만 쓴다. 설정에서 변경 */
  weeks_to_show: number;
  /** 주 / 월 보기. 캘린더 상단에서 바꾸고 저장된다 */
  view_mode: DeployCalendarViewMode;
  /** 오늘 날짜 강조 표시. 설정에서 끄고 켠다 */
  show_today: boolean;
  /** ERP 근태(연차·반차) 표시. 캘린더 상단 스위치 */
  show_attendance: boolean;
  /** 근태를 볼 대상: 부서·사원 여러 개 (ERP 근태현황 조회 조건) */
  attendance_targets: AttendanceTarget[];
  /** 마지막으로 불러온 근태 (대상 키 target 이 붙어 있다). 세션이 없어도 이걸 보여준다 */
  attendance_records: StoredAttendance[];
  /** 마지막으로 근태를 불러온 시각 (ms) */
  attendance_fetched_at: number;

  // --- Actions ---
  addEvent: (event: Omit<DeployEvent, 'id'>) => string;
  updateEvent: (id: string, updates: Partial<DeployEvent>) => void;
  deleteEvent: (id: string) => void;

  setWeeksToShow: (weeks: number) => void;
  setViewMode: (mode: DeployCalendarViewMode) => void;
  setShowToday: (show: boolean) => void;
  setShowAttendance: (show: boolean) => void;
  setAttendanceTargets: (targets: AttendanceTarget[]) => void;
  /** from~to(YYYY-MM-DD) 근태일자의 그 대상들 근태를 새로 받은 것으로 바꾼다 */
  replaceAttendance: (target_keys: string[], from: string, to: string, records: StoredAttendance[]) => void;

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
      weeks_to_show: DEPLOY_CALENDAR_WEEKS_DEFAULT,
      view_mode: 'week',
      show_today: true,
      show_attendance: false,
      attendance_targets: [],
      attendance_records: [],
      attendance_fetched_at: 0,

      setViewMode: (mode) => set({ view_mode: mode }),
      setShowToday: (show) => set({ show_today: show }),
      setShowAttendance: (show) => set({ show_attendance: show }),
      setAttendanceTargets: (targets) => set({ attendance_targets: targets }),
      replaceAttendance: (target_keys, from, to, records) =>
        set((state) => ({
          attendance_records: [
            ...state.attendance_records.filter((r) => !(target_keys.includes(r.target) && r.date >= from && r.date <= to)),
            ...records,
          ],
          attendance_fetched_at: Date.now(),
        })),

      setWeeksToShow: (weeks) => set(() => ({
        weeks_to_show: Math.max(DEPLOY_CALENDAR_WEEKS_MIN, Math.min(DEPLOY_CALENDAR_WEEKS_MAX, Math.floor(weeks))),
      })),

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
      storage: createJSONStorage(() => idbStorage),
      // v1: 근태 부서 하나(attendance_site) → 대상 여러 개(부서·사원)
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<DeployCalendarState> & { attendance_site?: string };
        if (version < 1 && state) {
          const site = (state.attendance_site || '').trim();
          state.attendance_targets = site ? [{ type: 'site', code: site, name: site }] : [];
          delete state.attendance_site;
        }
        return state as DeployCalendarState;
      },
    }
  )
);
