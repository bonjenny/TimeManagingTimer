import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'time-manager-statuses';

export interface Status {
  value: string;
  label: string;
}

export const DEFAULT_STATUSES: Status[] = [
  { value: 'completed', label: '완료' },
  { value: 'in_progress', label: '진행중' },
  { value: 'pending', label: '대기' },
  { value: 'hold', label: '보류' },
];

interface StatusState {
  statuses: Status[];
  addStatus: (status: Status) => void;
  removeStatus: (value: string) => void;
  updateStatus: (oldValue: string, newStatus: Status) => void;
  reorderStatuses: (statuses: Status[]) => void;
  resetToDefault: () => void;
  getStatusLabel: (value: string) => string;
}

export const useStatusStore = create<StatusState>()(
  persist(
    (set, get) => ({
      statuses: [...DEFAULT_STATUSES],
      
      addStatus: (status) => {
        const { statuses } = get();
        // 중복 체크 (value 기준)
        if (statuses.some(s => s.value === status.value)) {
          return;
        }
        set({ statuses: [...statuses, status] });
      },
      
      removeStatus: (value) => {
        const { statuses } = get();
        // 최소 1개는 유지
        if (statuses.length <= 1) {
          return;
        }
        set({ statuses: statuses.filter(s => s.value !== value) });
      },
      
      updateStatus: (oldValue, newStatus) => {
        const { statuses } = get();
        set({
          statuses: statuses.map(s => 
            s.value === oldValue ? newStatus : s
          )
        });
      },
      
      reorderStatuses: (statuses) => {
        set({ statuses });
      },
      
      resetToDefault: () => {
        set({ statuses: [...DEFAULT_STATUSES] });
      },
      
      getStatusLabel: (value) => {
        const { statuses } = get();
        const status = statuses.find(s => s.value === value);
        return status?.label || value;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
