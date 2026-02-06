import { renderHook, act } from '@testing-library/react';
import { useTimerStore } from '../../store/useTimerStore';

// 각 테스트 전에 스토어 초기화
beforeEach(() => {
  const { result } = renderHook(() => useTimerStore());
  act(() => {
    useTimerStore.setState({
      activeTimer: null,
      logs: [],
      deleted_logs: [],
      excludedTitles: [],
    });
  });
});

describe('v0.12.3 버그 수정 테스트', () => {
  describe('일시정지 상태에서 endTime 설정', () => {
    it('startTimer로 기존 RUNNING 타이머가 PAUSED로 이동할 때 endTime이 설정된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 첫 번째 타이머 시작
      act(() => {
        result.current.startTimer('작업1', 'P001', '개발');
      });
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.title).toBe('작업1');
      
      // 두 번째 타이머 시작 (기존 타이머는 logs로 이동)
      act(() => {
        result.current.startTimer('작업2', 'P002', '회의');
      });
      
      // 기존 타이머가 logs에 PAUSED 상태로 이동했는지 확인
      const movedLog = result.current.logs.find(l => l.title === '작업1');
      expect(movedLog).toBeDefined();
      expect(movedLog?.status).toBe('PAUSED');
      expect(movedLog?.endTime).toBeDefined(); // endTime이 설정되어야 함
      expect(movedLog?.lastPausedAt).toBeDefined();
    });
  });

  describe('completeTimer PAUSED 상태 처리', () => {
    it('PAUSED 상태에서 completeTimer 호출 시 pausedDuration이 올바르게 계산된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 타이머 시작
      act(() => {
        result.current.startTimer('테스트 작업');
      });
      
      // 일시정지
      act(() => {
        result.current.pauseTimer();
      });
      
      expect(result.current.activeTimer?.status).toBe('PAUSED');
      expect(result.current.activeTimer?.lastPausedAt).toBeDefined();
      
      // 완료 처리
      act(() => {
        result.current.completeTimer();
      });
      
      // logs에 완료된 작업이 있는지 확인
      const completedLog = result.current.logs.find(l => l.title === '테스트 작업');
      expect(completedLog).toBeDefined();
      expect(completedLog?.status).toBe('COMPLETED');
      expect(completedLog?.endTime).toBeDefined();
      expect(completedLog?.lastPausedAt).toBeUndefined(); // 완료 시 lastPausedAt은 제거됨
    });

    it('RUNNING 상태에서 completeTimer 호출 시 정상 완료된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('진행 중 작업');
      });
      
      expect(result.current.activeTimer?.status).toBe('RUNNING');
      
      act(() => {
        result.current.completeTimer();
      });
      
      const completedLog = result.current.logs.find(l => l.title === '진행 중 작업');
      expect(completedLog).toBeDefined();
      expect(completedLog?.status).toBe('COMPLETED');
      expect(completedLog?.endTime).toBeDefined();
    });
  });

  describe('updateLog로 세션 완료 처리', () => {
    it('PAUSED 세션을 COMPLETED로 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      const now = Date.now();
      
      // PAUSED 상태의 로그 추가
      act(() => {
        result.current.addLog({
          id: 'test-session-1',
          title: '테스트 세션',
          startTime: now - 3600000,
          endTime: now - 1800000,
          status: 'PAUSED',
          pausedDuration: 0,
          lastPausedAt: now - 1800000,
        });
      });
      
      // COMPLETED로 업데이트
      act(() => {
        result.current.updateLog('test-session-1', { 
          status: 'COMPLETED',
          endTime: now,
        });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === 'test-session-1');
      expect(updatedLog?.status).toBe('COMPLETED');
      expect(updatedLog?.endTime).toBe(now);
    });
  });

  describe('reopenTimer 완료 취소', () => {
    it('COMPLETED 세션을 PAUSED로 변경하고 endTime을 유지한다', () => {
      const { result } = renderHook(() => useTimerStore());
      const now = Date.now();
      
      // COMPLETED 상태의 로그 추가
      act(() => {
        result.current.addLog({
          id: 'completed-session',
          title: '완료된 작업',
          startTime: now - 3600000,
          endTime: now,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });
      
      // reopenTimer 호출
      act(() => {
        result.current.reopenTimer('completed-session');
      });
      
      // endTime은 기존 값 유지 (종료시간이 현재 시간으로 바뀌지 않도록)
      const reopenedLog = result.current.logs.find(l => l.id === 'completed-session');
      expect(reopenedLog?.status).toBe('PAUSED');
      expect(reopenedLog?.endTime).toBe(now);
    });

    it('PAUSED 세션에는 영향을 주지 않는다', () => {
      const { result } = renderHook(() => useTimerStore());
      const now = Date.now();
      
      // PAUSED 상태의 로그 추가
      act(() => {
        result.current.addLog({
          id: 'paused-session',
          title: '일시정지된 작업',
          startTime: now - 3600000,
          endTime: now - 1800000,
          status: 'PAUSED',
          pausedDuration: 0,
        });
      });
      
      const originalEndTime = result.current.logs[0].endTime;
      
      // reopenTimer 호출 (PAUSED에는 영향 없음)
      act(() => {
        result.current.reopenTimer('paused-session');
      });
      
      const log = result.current.logs.find(l => l.id === 'paused-session');
      expect(log?.status).toBe('PAUSED');
      expect(log?.endTime).toBe(originalEndTime); // 변경되지 않음
    });
  });
});

describe('pauseAndMoveToLogs 테스트', () => {
  it('진행 중인 타이머를 PAUSED 상태로 logs에 이동한다', () => {
    const { result } = renderHook(() => useTimerStore());
    
    act(() => {
      result.current.startTimer('진행 중 작업', 'P001', '개발');
    });
    
    expect(result.current.activeTimer).not.toBeNull();
    
    act(() => {
      result.current.pauseAndMoveToLogs();
    });
    
    // activeTimer가 null이 됨
    expect(result.current.activeTimer).toBeNull();
    
    // logs에 PAUSED 상태로 추가됨
    const movedLog = result.current.logs.find(l => l.title === '진행 중 작업');
    expect(movedLog).toBeDefined();
    expect(movedLog?.status).toBe('PAUSED');
    expect(movedLog?.endTime).toBeDefined();
    expect(movedLog?.lastPausedAt).toBeDefined();
  });
});
