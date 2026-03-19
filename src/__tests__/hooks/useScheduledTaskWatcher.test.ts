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

    it('SCHEDULED 로그에 프로젝트와 카테고리를 포함할 수 있다', () => {
      const { addLog } = useTimerStore.getState();
      const future = Date.now() + 60 * 60 * 1000;

      act(() => {
        addLog({
          id: 'scheduled-2',
          title: '코드 리뷰',
          projectCode: 'A26_00413',
          category: '개발',
          startTime: future,
          endTime: future + 30 * 60 * 1000,
          status: 'SCHEDULED',
          pausedDuration: 0,
        });
      });

      const { logs } = useTimerStore.getState();
      expect(logs[0].projectCode).toBe('A26_00413');
      expect(logs[0].category).toBe('개발');
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

    it('SCHEDULED가 아닌 로그는 활성화하지 않는다', () => {
      useTimerStore.setState({
        logs: [{
          id: 'completed-1',
          title: '완료된 작업',
          startTime: Date.now() - 60 * 60 * 1000,
          endTime: Date.now(),
          status: 'COMPLETED',
          pausedDuration: 0,
        }],
        activeTimer: null,
      });

      act(() => {
        useTimerStore.getState().activateScheduledTask('completed-1');
      });

      const { activeTimer, logs } = useTimerStore.getState();
      expect(activeTimer).toBeNull();
      expect(logs).toHaveLength(1);
    });

    it('활성화 시 pausedDuration이 0으로 초기화된다', () => {
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

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.pausedDuration).toBe(0);
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

    it('scheduledEndTime 없이도 타이머가 동작한다', () => {
      const now = Date.now();
      useTimerStore.setState({
        activeTimer: {
          id: 'test-2',
          title: '일반 작업',
          startTime: now,
          status: 'RUNNING',
          pausedDuration: 0,
        },
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.scheduledEndTime).toBeUndefined();
      expect(activeTimer?.status).toBe('RUNNING');
    });
  });

  describe('여러 SCHEDULED 작업 처리', () => {
    it('여러 SCHEDULED 로그 중 가장 빠른 것이 먼저 활성화된다', () => {
      const now = Date.now();

      useTimerStore.setState({
        logs: [
          {
            id: 'scheduled-later',
            title: '오후 회의',
            startTime: now - 1000,
            endTime: now + 60 * 60 * 1000,
            status: 'SCHEDULED',
            pausedDuration: 0,
          },
          {
            id: 'scheduled-earlier',
            title: '오전 회의',
            startTime: now - 2000,
            endTime: now + 30 * 60 * 1000,
            status: 'SCHEDULED',
            pausedDuration: 0,
          },
        ],
        activeTimer: null,
      });

      const { logs } = useTimerStore.getState();
      const ready = logs
        .filter(l => l.status === 'SCHEDULED' && l.startTime <= now)
        .sort((a, b) => a.startTime - b.startTime);

      expect(ready[0].id).toBe('scheduled-earlier');
    });
  });

  describe('SCHEDULED 로그 필터링', () => {
    it('SCHEDULED 로그는 일반 로그와 함께 저장된다', () => {
      const now = Date.now();
      const future = now + 60 * 60 * 1000;

      useTimerStore.setState({
        logs: [
          {
            id: 'completed-1',
            title: '완료 작업',
            startTime: now - 2 * 60 * 60 * 1000,
            endTime: now - 60 * 60 * 1000,
            status: 'COMPLETED',
            pausedDuration: 0,
          },
          {
            id: 'scheduled-1',
            title: '예약 작업',
            startTime: future,
            endTime: future + 60 * 60 * 1000,
            status: 'SCHEDULED',
            pausedDuration: 0,
          },
        ],
      });

      const { logs } = useTimerStore.getState();
      expect(logs).toHaveLength(2);

      const scheduled = logs.filter(l => l.status === 'SCHEDULED');
      const completed = logs.filter(l => l.status === 'COMPLETED');
      expect(scheduled).toHaveLength(1);
      expect(completed).toHaveLength(1);
    });
  });
});
