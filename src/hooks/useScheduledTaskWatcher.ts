import { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/useTimerStore';

const CHECK_INTERVAL_MS = 5000;

export const useScheduledTaskWatcher = () => {
  const interval_ref = useRef<number | null>(null);
  // 예약 업무나 끝날 시각이 정해진 타이머가 없으면 쉰다 (생기는 순간 다시 돈다)
  const has_schedule = useTimerStore((s) => !!s.activeTimer?.scheduledEndTime || s.logs.some((log) => log.status === 'SCHEDULED'));

  useEffect(() => {
    if (!has_schedule) return;
    const check = () => {
      const { logs, activeTimer, activateScheduledTask, completeTimer, updateLog } = useTimerStore.getState();
      const now = Date.now();

      const scheduled_logs = logs
        .filter(log => log.status === 'SCHEDULED')
        .sort((a, b) => a.startTime - b.startTime);

      for (const log of scheduled_logs) {
        if (log.startTime <= now && log.endTime && log.endTime <= now) {
          updateLog(log.id, {
            status: 'COMPLETED',
            pausedDuration: 0,
          });
          continue;
        }

        if (log.startTime <= now) {
          activateScheduledTask(log.id);
          break;
        }
      }

      if (activeTimer?.scheduledEndTime && now >= activeTimer.scheduledEndTime) {
        const { activeTimer: current } = useTimerStore.getState();
        if (current?.scheduledEndTime && Date.now() >= current.scheduledEndTime) {
          const scheduled_end = current.scheduledEndTime;
          useTimerStore.setState((state) => {
            if (!state.activeTimer) return state;
            let final_paused = state.activeTimer.pausedDuration;
            if (state.activeTimer.status === 'PAUSED' && state.activeTimer.lastPausedAt) {
              final_paused += (scheduled_end - state.activeTimer.lastPausedAt) / 1000;
            }
            return {
              activeTimer: null,
              logs: [...state.logs, {
                ...state.activeTimer,
                status: 'COMPLETED' as const,
                endTime: scheduled_end,
                pausedDuration: final_paused,
                lastPausedAt: undefined,
                scheduledEndTime: undefined,
              }],
            };
          });
        }
      }
    };

    check();

    interval_ref.current = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
      }
    };
  }, [has_schedule]);
};
