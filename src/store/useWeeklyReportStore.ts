import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { idbStorage } from '../utils/storage';
import type { ErpReportWork, ReportExtraRow, ReportProjectOverride, ReportWeekOverride } from '../utils/weeklyStatusReport';
import type { ErpPostSummary } from '../utils/erpTimelog';

// 주간 진행 현황표에서 손으로 고친 값. 자동값 위에 덮어쓴다.
const STORAGE_KEY = 'timekeeper-weekly-report';

type ProjectField = keyof Omit<ReportProjectOverride, 'hidden'>;
type WeekField = keyof ReportWeekOverride;

interface WeeklyReportState {
  project_overrides: Record<string, ReportProjectOverride>;
  /** key: "주 월요일|프로젝트" */
  week_overrides: Record<string, ReportWeekOverride>;
  extras: ReportExtraRow[];
  /** ERP 에서 가져온 게시글 요약 (프로젝트 코드별), 가져온 시각 */
  erp_info: Record<string, ErpPostSummary>;
  erp_fetched_at: number | null;
  /** ERP 기준으로 만든 현황표 (담당자·기간·작업별 시간·게시글 요약) */
  erp_report: {
    mode: 'local' | 'erp';
    pic_sid: string;
    pic_name: string;
    from: string;
    to: string;
    works: ErpReportWork[];
    fetched_at: number | null;
    /** 전에 찾은 담당자 (최근 순) — 이름이나 사번 하나로 다시 고를 수 있게 */
    people?: { sid: string; name: string }[];
  };

  setErpReport: (patch: Partial<WeeklyReportState['erp_report']>) => void;
  setErpInfo: (info: Record<string, ErpPostSummary>) => void;
  setProjectField: (key: string, field: ProjectField, value: string) => void;
  setWeekField: (week: string, key: string, field: WeekField, value: string) => void;
  /** 그 줄에서 고친 값을 모두 지우고 자동값으로 */
  resetRow: (week: string, key: string) => void;
  hideProject: (key: string) => void;
  showAllHidden: () => void;
  addExtra: () => void;
  updateExtra: (id: string, patch: Partial<ReportExtraRow>) => void;
  removeExtra: (id: string) => void;
}

export const useWeeklyReportStore = create<WeeklyReportState>()(
  persist(
    (set) => ({
      project_overrides: {},
      week_overrides: {},
      extras: [],
      erp_info: {},
      erp_fetched_at: null,
      erp_report: { mode: 'local', pic_sid: '', pic_name: '', from: '', to: '', works: [], fetched_at: null },

      setErpReport: (patch) => set((s) => ({ erp_report: { ...s.erp_report, ...patch } })),
      setErpInfo: (info) => set((s) => ({ erp_info: { ...s.erp_info, ...info }, erp_fetched_at: Date.now() })),

      setProjectField: (key, field, value) =>
        set((s) => ({ project_overrides: { ...s.project_overrides, [key]: { ...s.project_overrides[key], [field]: value } } })),

      setWeekField: (week, key, field, value) =>
        set((s) => {
          const id = `${week}|${key}`;
          return { week_overrides: { ...s.week_overrides, [id]: { ...s.week_overrides[id], [field]: value } } };
        }),

      resetRow: (week, key) =>
        set((s) => {
          const { [`${week}|${key}`]: _week, ...week_overrides } = s.week_overrides;
          const hidden = s.project_overrides[key]?.hidden;
          const project_overrides = { ...s.project_overrides };
          if (hidden) project_overrides[key] = { hidden };
          else delete project_overrides[key];
          return { week_overrides, project_overrides };
        }),

      hideProject: (key) =>
        set((s) => ({ project_overrides: { ...s.project_overrides, [key]: { ...s.project_overrides[key], hidden: true } } })),

      showAllHidden: () =>
        set((s) => ({
          project_overrides: Object.fromEntries(
            Object.entries(s.project_overrides).map(([k, v]) => [k, { ...v, hidden: undefined }])
          ),
        })),

      addExtra: () =>
        set((s) => ({
          extras: [...s.extras, { id: `manual-${uuidv4()}`, task: '', status: '진행예정', start_date: '', end_date: '', note: '' }],
        })),

      updateExtra: (id, patch) => set((s) => ({ extras: s.extras.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

      removeExtra: (id) => set((s) => ({ extras: s.extras.filter((x) => x.id !== id) })),
    }),
    { name: STORAGE_KEY, storage: createJSONStorage(() => idbStorage) }
  )
);
