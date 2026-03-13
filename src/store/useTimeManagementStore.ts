import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

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
  original_log_id?: string;
}

interface TimeManagementState {
  rows: TimeManagementRow[];
  default_work_type: string;
  category_work_type_map: Record<string, string>;
  project_work_type_map: Record<string, string>;

  addRow: (row: TimeManagementRow) => void;
  addRows: (rows: TimeManagementRow[]) => void;
  updateRow: (id: string, updates: Partial<TimeManagementRow>) => void;
  deleteRow: (id: string) => void;
  deleteRows: (ids: string[]) => void;
  getRowsByDate: (date: string) => TimeManagementRow[];
  toggleCheck: (id: string) => void;
  toggleAllChecks: (date: string, checked: boolean) => void;
  setDefaultWorkType: (type: string) => void;
  setCategoryWorkType: (category: string, work_type: string) => void;
  removeCategoryWorkType: (category: string) => void;
  getWorkTypeForCategory: (category: string) => string | undefined;
  setProjectWorkType: (project_code: string, work_type: string) => void;
  removeProjectWorkType: (project_code: string) => void;
  getWorkTypeForProject: (project_code: string) => string | undefined;
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

      addRow: (row) =>
        set((state) => ({
          rows: [...state.rows, row],
        })),

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
    }),
    {
      name: 'timekeeper-time-management',
      storage: createJSONStorage(() => idbStorage),
      version: 0,
    }
  )
);
