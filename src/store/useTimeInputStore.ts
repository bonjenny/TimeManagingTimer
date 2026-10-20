import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';

/** 시간 입력 방식: 브라우저 기본(오전 09:51 ⏰) / 시계 위젯 */
export type TimeInputStyle = 'native' | 'clock';

interface TimeInputState {
  time_input_style: TimeInputStyle;
  setTimeInputStyle: (style: TimeInputStyle) => void;
}

export const useTimeInputStore = create<TimeInputState>()(
  persist(
    (set) => ({
      time_input_style: 'native',
      setTimeInputStyle: (time_input_style) => set({ time_input_style }),
    }),
    { name: 'timekeeper-time-input', storage: createJSONStorage(() => idbStorage) }
  )
);
