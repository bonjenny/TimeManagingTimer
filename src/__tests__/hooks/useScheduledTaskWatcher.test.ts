import { useTimerStore } from '../../store/useTimerStore';
import { act } from '@testing-library/react';

describe('Scheduled Task Feature', () => {
  beforeEach(() => {
    useTimerStore.setState({ logs: [], deleted_logs: [], activeTimer: null });
  });

  describe('TimerStatus SCHEDULED', () => {
    it('SCHEDULED 상태의 로그를 추가할 수 있다', () => {
      const { addLog } = useTimerStore.getState();
      const future = Date.now() + 60 * 60 * 1000;

      act(() => {
        addLog({
          id: 'scheduled-1',
          title: '회의',
          startTime: future,
          endTime: future + 60 * 60 * 1000,
          status: 'SCHEDULED',
          pausedDuration: 0,
        });
      });

      const { logs } = useTimerStore.getState();
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('SCHEDULED');
      expect(logs[0].title).toBe('회의');
    });
  });

  describe('activateScheduledTask', () => {
    it('SCHEDULED 로그를 activeTimer로 전환한다', () => {
      const future = Date.now() + 60 * 60 * 1000;
      useTimerStore.setState({
        logs: [{
          id: 'scheduled-1',
          title: '회의',
          startTime: future,
          endTime: future + 60 * 60 * 1000,
          status: 'SCHEDULED',
          pausedDuration: 0,
        }],
        activeTimer: null,
      });

      act(() => {
        useTimerStore.getState().activateScheduledTask('scheduled-1');
      });

      const { activeTimer, logs } = useTimerStore.getState();
      expect(activeTimer).not.toBeNull();
      expect(activeTimer?.id).toBe('scheduled-1');
      expect(activeTimer?.status).toBe('RUNNING');
      expect(activeTimer?.scheduledEndTime).toBe(future + 60 * 60 * 1000);
      expect(activeTimer?.endTime).toBeUndefined();
      expect(logs).toHaveLength(0);
    });

    it('기존 activeTimer가 있으면 paused 처리 후 logs에 추가한다', () => {
      const now = Date.now();
      const future = now + 60 * 60 * 1000;

      useTimerStore.setState({
        logs: [{
          id: 'scheduled-1',
          title: '회의',
          startTime: future,
          endTime: future + 60 * 60 * 1000,
          status: 'SCHEDULED',
          pausedDuration: 0,
        }],
        activeTimer: {
          id: 'active-1',
          title: '개발 작업',
          startTime: now - 30 * 60 * 1000,
          status: 'RUNNING',
          pausedDuration: 0,
        },
      });

      act(() => {
        useTimerStore.getState().activateScheduledTask('scheduled-1');
      });

      const { activeTimer, logs } = useTimerStore.getState();
      expect(activeTimer?.id).toBe('scheduled-1');
      expect(activeTimer?.status).toBe('RUNNING');
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('active-1');
      expect(logs[0].status).toBe('PAUSED');
      expect(logs[0].endTime).toBeDefined();
    });

    it('존재하지 않는 로그 ID로 호출하면 아무것도 하지 않는다', () => {
      useTimerStore.setState({ logs: [], activeTimer: null });

      act(() => {
        useTimerStore.getState().activateScheduledTask('nonexistent');
      });

      const { activeTimer, logs } = useTimerStore.getState();
      expect(activeTimer).toBeNull();
      expect(logs).toHaveLength(0);
    });
  });

  describe('scheduledEndTime', () => {
    it('TimerLog에 scheduledEndTime 필드가 지원된다', () => {
      const now = Date.now();
      useTimerStore.setState({
        activeTimer: {
          id: 'test-1',
          title: '회의',
          startTime: now,
          status: 'RUNNING',
          pausedDuration: 0,
          scheduledEndTime: now + 60 * 60 * 1000,
        },
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.scheduledEndTime).toBe(now + 60 * 60 * 1000);
    });
  });
});
