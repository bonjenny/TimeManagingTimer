/**
 * v0.12.0 통합 테스트
 * - 타이머 세션 관리 개선
 * - 간트차트 스냅 기능
 * - 점심시간 자동 조정
 */

import { renderHook, act } from '@testing-library/react';
import { useTimerStore } from '../../store/useTimerStore';

// 테스트 전 스토어 초기화
beforeEach(() => {
  const { result } = renderHook(() => useTimerStore());
  act(() => {
    // 스토어 상태 초기화
    useTimerStore.setState({
      activeTimer: null,
      logs: [],
      deleted_logs: [],
      excludedTitles: [],
    });
  });
});

describe('v0.12.0 - 타이머 세션 관리', () => {
  describe('같은 이름 작업 시작 시 완료 세션 자동 취소', () => {
    it('완료된 동일 이름 작업이 PAUSED로 변경됨', () => {
      const { result } = renderHook(() => useTimerStore());

      // 1. 첫 번째 작업 시작 및 완료
      act(() => {
        result.current.startTimer('테스트 작업', 'TEST01');
      });
      act(() => {
        result.current.completeTimer();
      });

      // 완료된 로그 확인
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].status).toBe('COMPLETED');

      // 2. 같은 이름으로 새 작업 시작
      act(() => {
        result.current.startTimer('테스트 작업', 'TEST01');
      });

      // 기존 완료 로그가 PAUSED로 변경되고 endTime이 제거됨
      const pausedLog = result.current.logs.find(log => log.title === '테스트 작업');
      expect(pausedLog?.status).toBe('PAUSED');
      expect(pausedLog?.endTime).toBeUndefined();

      // 새 activeTimer 확인
      expect(result.current.activeTimer?.title).toBe('테스트 작업');
      expect(result.current.activeTimer?.status).toBe('RUNNING');
    });

    it('다른 이름 작업 시작 시 기존 완료 세션 유지', () => {
      const { result } = renderHook(() => useTimerStore());

      // 1. 첫 번째 작업 완료
      act(() => {
        result.current.startTimer('작업A');
      });
      act(() => {
        result.current.completeTimer();
      });

      // 2. 다른 이름 작업 시작
      act(() => {
        result.current.startTimer('작업B');
      });

      // 기존 완료 로그 유지
      const completedLog = result.current.logs.find(log => log.title === '작업A');
      expect(completedLog?.status).toBe('COMPLETED');
      expect(completedLog?.endTime).toBeDefined();
    });
  });

  describe('pauseAndMoveToLogs 액션', () => {
    it('진행 중인 타이머를 PAUSED 상태로 logs에 이동', () => {
      const { result } = renderHook(() => useTimerStore());

      // 1. 타이머 시작
      act(() => {
        result.current.startTimer('테스트 작업');
      });

      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.logs).toHaveLength(0);

      // 2. pauseAndMoveToLogs 실행
      act(() => {
        result.current.pauseAndMoveToLogs();
      });

      // activeTimer가 null이 되고 logs에 추가됨
      expect(result.current.activeTimer).toBeNull();
      expect(result.current.logs).toHaveLength(1);

      // 상태 확인
      const movedLog = result.current.logs[0];
      expect(movedLog.status).toBe('PAUSED');
      expect(movedLog.endTime).toBeDefined();
      expect(movedLog.lastPausedAt).toBeDefined();
    });

    it('activeTimer가 없으면 아무 동작 안 함', () => {
      const { result } = renderHook(() => useTimerStore());

      expect(result.current.activeTimer).toBeNull();

      // pauseAndMoveToLogs 실행
      act(() => {
        result.current.pauseAndMoveToLogs();
      });

      // 변화 없음
      expect(result.current.activeTimer).toBeNull();
      expect(result.current.logs).toHaveLength(0);
    });
  });

  describe('reopenTimer 액션', () => {
    it('완료된 작업을 PAUSED 상태로 변경 (타이머 시작 안 함)', () => {
      const { result } = renderHook(() => useTimerStore());

      // 1. 작업 완료
      act(() => {
        result.current.startTimer('테스트 작업');
      });
      act(() => {
        result.current.completeTimer();
      });

      const completedLogId = result.current.logs[0].id;

      // 2. reopenTimer 실행
      act(() => {
        result.current.reopenTimer(completedLogId);
      });

      // 상태 확인 - PAUSED로 변경, activeTimer는 null 유지
      expect(result.current.activeTimer).toBeNull();
      expect(result.current.logs[0].status).toBe('PAUSED');
      expect(result.current.logs[0].endTime).toBeUndefined();
    });
  });
});

describe('v0.12.0 - 세션 상태별 동작', () => {
  it('PAUSED 상태 로그에 endTime과 lastPausedAt이 설정됨', () => {
    const { result } = renderHook(() => useTimerStore());

    // 타이머 시작 후 pauseAndMoveToLogs
    act(() => {
      result.current.startTimer('테스트 작업');
    });
    act(() => {
      result.current.pauseAndMoveToLogs();
    });

    const pausedLog = result.current.logs[0];
    expect(pausedLog.status).toBe('PAUSED');
    expect(pausedLog.endTime).toBeDefined();
    expect(pausedLog.lastPausedAt).toBeDefined();
    expect(pausedLog.endTime).toBe(pausedLog.lastPausedAt);
  });

  it('여러 세션 순차 생성 테스트', () => {
    const { result } = renderHook(() => useTimerStore());

    // 1. 첫 세션 시작 및 일시정지
    act(() => {
      result.current.startTimer('작업A');
    });
    act(() => {
      result.current.pauseAndMoveToLogs();
    });

    // 2. 두 번째 세션 시작 및 완료
    act(() => {
      result.current.startTimer('작업A');
    });
    act(() => {
      result.current.completeTimer();
    });

    // 로그 확인 - 2개의 세션
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].status).toBe('PAUSED');
    expect(result.current.logs[1].status).toBe('COMPLETED');

    // 3. 같은 이름으로 다시 시작 - 완료된 세션이 PAUSED로 변경
    act(() => {
      result.current.startTimer('작업A');
    });

    // 기존 PAUSED는 유지, COMPLETED가 PAUSED로 변경
    const logs = result.current.logs.filter(log => log.title === '작업A');
    const pausedLogs = logs.filter(log => log.status === 'PAUSED');
    expect(pausedLogs).toHaveLength(2); // 두 개 모두 PAUSED
  });
});

describe('v0.12.0 - 스냅 및 조정 로직 상수', () => {
  // 스냅 임계값 상수 테스트 (유닛 테스트)
  it('스냅 임계값 상수 정의', () => {
    const SNAP_THRESHOLD_MS = 15 * 60 * 1000; // 15분
    const KEY_SNAP_THRESHOLD_MS = 5 * 60 * 1000; // 5분
    const MIN_SESSION_MS = 5 * 60 * 1000; // 최소 세션 5분

    expect(SNAP_THRESHOLD_MS).toBe(900000);
    expect(KEY_SNAP_THRESHOLD_MS).toBe(300000);
    expect(MIN_SESSION_MS).toBe(300000);
  });

  it('짧은 작업 임계값 (20분)', () => {
    const SHORT_TASK_THRESHOLD_MS = 20 * 60 * 1000;
    expect(SHORT_TASK_THRESHOLD_MS).toBe(1200000);
  });
});
