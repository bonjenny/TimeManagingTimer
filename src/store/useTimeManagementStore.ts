import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';
import { ErpMapping, ErpUser, DEFAULT_ERP_MAPPING, DEFAULT_ERP_USER } from '../utils/erpTimelog';

export interface TimeManagementRow {
  id: string;
  checked: boolean;
  project_name: string;
  work_type: string;
  schedule_name: string;
  category_code: string;
  category_name: string;
  time_minutes: number;
  note: string;
  date: string;
  end_date?: string; // 종료 예정일 YYYY-MM-DD. 없으면 date 로 본다(이전 데이터)
  original_log_id?: string;
}

interface TimeManagementState {
  rows: TimeManagementRow[];
  default_work_type: string;
  category_work_type_map: Record<string, string>;
  project_work_type_map: Record<string, string>;
  erp_mapping: ErpMapping;
  erp_user: ErpUser;
  note_include_title: boolean; // 일간 타이머에서 불러올 때 비고에 작업명을 넣을지 (기본 꺼짐)

  addRow: (row: TimeManagementRow, after_id?: string) => void; // after_id 가 있으면 그 줄 바로 뒤에 넣는다
  addRows: (rows: TimeManagementRow[]) => void;
  updateRow: (id: string, updates: Partial<TimeManagementRow>) => void;
  deleteRow: (id: string) => void;
  deleteRows: (ids: string[]) => void;
  getRowsByDate: (date: string) => TimeManagementRow[];
  setRowsByDate: (date: string, newRows: TimeManagementRow[]) => void;
  toggleCheck: (id: string) => void;
  toggleAllChecks: (date: string, checked: boolean) => void;
  setDefaultWorkType: (type: string) => void;
  setCategoryWorkType: (category: string, work_type: string) => void;
  removeCategoryWorkType: (category: string) => void;
  getWorkTypeForCategory: (category: string) => string | undefined;
  setProjectWorkType: (project_code: string, work_type: string) => void;
  removeProjectWorkType: (project_code: string) => void;
  getWorkTypeForProject: (project_code: string) => string | undefined;
  setErpMapping: (mapping: ErpMapping) => void;
  setErpUser: (user: ErpUser) => void;
  setNoteIncludeTitle: (on: boolean) => void;
}

export const useTimeManagementStore = create<TimeManagementState>()(
  persist(
    (set, get) => ({
      rows: [],
      default_work_type: '작업',
      category_work_type_map: {
        '테스트오류수정': '작업',
        '센터오류수정': '작업',
        '질의응답': '작업',
      },
      project_work_type_map: {
        'A25_05591': '작업',
      },
      erp_mapping: DEFAULT_ERP_MAPPING,
      erp_user: DEFAULT_ERP_USER,
      note_include_title: false,

      addRow: (row, after_id) =>
        set((state) => {
          const index = after_id ? state.rows.findIndex((r) => r.id === after_id) : -1;
          if (index < 0) return { rows: [...state.rows, row] };
          return { rows: [...state.rows.slice(0, index + 1), row, ...state.rows.slice(index + 1)] };
        }),

      addRows: (rows) =>
        set((state) => ({
          rows: [...state.rows, ...rows],
        })),

      updateRow: (id, updates) =>
        set((state) => ({
          rows: state.rows.map((row) =>
            row.id === id ? { ...row, ...updates } : row
          ),
        })),

      deleteRow: (id) =>
        set((state) => ({
          rows: state.rows.filter((row) => row.id !== id),
        })),

      deleteRows: (ids) =>
        set((state) => ({
          rows: state.rows.filter((row) => !ids.includes(row.id)),
        })),

      getRowsByDate: (date) => {
        return get().rows.filter((row) => row.date === date);
      },

      setRowsByDate: (date, newRows) =>
        set((state) => ({
          rows: [
            ...state.rows.filter((row) => row.date !== date),
            ...newRows,
          ],
        })),

      toggleCheck: (id) =>
        set((state) => ({
          rows: state.rows.map((row) =>
            row.id === id ? { ...row, checked: !row.checked } : row
          ),
        })),

      toggleAllChecks: (date, checked) =>
        set((state) => ({
          rows: state.rows.map((row) =>
            row.date === date ? { ...row, checked } : row
          ),
        })),

      setDefaultWorkType: (type) =>
        set({ default_work_type: type }),

      setCategoryWorkType: (category, work_type) =>
        set((state) => ({
          category_work_type_map: {
            ...state.category_work_type_map,
            [category]: work_type,
          },
        })),

      removeCategoryWorkType: (category) =>
        set((state) => {
          const new_map = { ...state.category_work_type_map };
          delete new_map[category];
          return { category_work_type_map: new_map };
        }),

      getWorkTypeForCategory: (category) => {
        return get().category_work_type_map[category];
      },

      setProjectWorkType: (project_code, work_type) =>
        set((state) => ({
          project_work_type_map: {
            ...state.project_work_type_map,
            [project_code]: work_type,
          },
        })),

      removeProjectWorkType: (project_code) =>
        set((state) => {
          const new_map = { ...state.project_work_type_map };
          delete new_map[project_code];
          return { project_work_type_map: new_map };
        }),

      getWorkTypeForProject: (project_code) => {
        return get().project_work_type_map[project_code];
      },

      setErpMapping: (mapping) => set({ erp_mapping: mapping }),

      setErpUser: (user) => set({ erp_user: user }),

      setNoteIncludeTitle: (on) => set({ note_include_title: on }),
    }),
    {
      name: 'timekeeper-time-management',
      storage: createJSONStorage(() => idbStorage),
      version: 1,
      // v1: 관리업무(A25_05591)에 팀장업무(카테고리 07)·팀회의(일정명) 매핑 추가. 이미 고친 값은 건드리지 않고 없을 때만 채운다
      migrate: (persisted, version) => {
        const state = persisted as { erp_mapping?: ErpMapping };
        const admin = state?.erp_mapping?.A25_05591;
        if (version < 1 && admin?.by_category) {
          const defaults = DEFAULT_ERP_MAPPING.A25_05591;
          admin.by_category['07'] ??= defaults.by_category!['07'];
          admin.by_note = { ...admin.by_note };
          admin.by_note['팀회의'] ??= defaults.by_note!['팀회의'];
        }
        return state as TimeManagementState;
      },
    }
  )
);
