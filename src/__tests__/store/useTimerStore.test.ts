/**
 * 타이머 스토어 테스트
 * v0.1.0: 기본 타이머 기능
 * v0.7.0: 휴지통 기능
 */
import { useTimerStore, DeletedLog } from '../../store/useTimerStore';
import { act } from '@testing-library/react';

describe('useTimerStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    // 로그 직접 초기화 (휴지통으로 이동하지 않고)
    useTimerStore.setState({ logs: [], deleted_logs: [], activeTimer: null });
    localStorage.clear();
  });

  describe('startTimer', () => {
    it('새 타이머를 시작하면 activeTimer가 설정된다', () => {
      const { startTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업', '12345', '개발');
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer).not.toBeNull();
      expect(activeTimer?.title).toBe('테스트 작업');
      expect(activeTimer?.projectCode).toBe('12345');
      expect(activeTimer?.category).toBe('개발');
      expect(activeTimer?.status).toBe('RUNNING');
    });

    it('타이머 시작 시 startTime이 현재 시간으로 설정된다', () => {
      const before = Date.now();
      const { startTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
      });

      const after = Date.now();
      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.startTime).toBeGreaterThanOrEqual(before);
      expect(activeTimer?.startTime).toBeLessThanOrEqual(after);
    });

    it('다른 작업 진행 중에 새 작업을 시작하면 새 startTime이 현재 시간으로 설정된다', async () => {
      const { startTimer } = useTimerStore.getState();
      
      // 1. 첫 번째 작업 시작
      act(() => {
        startTimer('작업 A', 'P001', '개발');
      });
      
      const firstTimer = useTimerStore.getState().activeTimer;
      expect(firstTimer?.title).toBe('작업 A');
      const firstStartTime = firstTimer?.startTime;
      
      // 2. 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 두 번째 작업 시작 (기존 작업은 logs로 이동)
      const beforeSecond = Date.now();
      act(() => {
        startTimer('작업 B', 'P002', '회의');
      });
      const afterSecond = Date.now();
      
      // 4. 새 activeTimer 확인
      const { activeTimer, logs } = useTimerStore.getState();
      
      // 새 activeTimer는 '작업 B'
      expect(activeTimer?.title).toBe('작업 B');
      
      // 새 activeTimer의 startTime은 현재 시간 (beforeSecond ~ afterSecond 사이)
      expect(activeTimer?.startTime).toBeGreaterThanOrEqual(beforeSecond);
      expect(activeTimer?.startTime).toBeLessThanOrEqual(afterSecond);
      
      // 새 startTime은 첫 번째 작업의 startTime보다 커야 함
      expect(activeTimer?.startTime).toBeGreaterThan(firstStartTime!);
      
      // 기존 작업 A는 logs로 이동됨
      const movedLog = logs.find(l => l.title === '작업 A');
      expect(movedLog).toBeDefined();
      expect(movedLog?.status).toBe('PAUSED');
    });

    it('완료된 작업을 다시 시작하면 새 startTime이 현재 시간으로 설정된다', async () => {
      const { startTimer, completeTimer } = useTimerStore.getState();
      
      // 1. 첫 번째 작업 완료
      act(() => {
        startTimer('작업 A', 'P001', '개발');
        completeTimer();
      });
      
      const { logs: logsAfterComplete } = useTimerStore.getState();
      const completedLog = logsAfterComplete[0];
      const originalStartTime = completedLog.startTime;
      
      // 2. 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 같은 작업을 다시 시작
      const beforeRestart = Date.now();
      act(() => {
        startTimer('작업 A', 'P001', '개발');
      });
      const afterRestart = Date.now();
      
      // 4. 새 activeTimer 확인
      const { activeTimer } = useTimerStore.getState();
      
      // 새 activeTimer는 '작업 A'
      expect(activeTimer?.title).toBe('작업 A');
      
      // 새 activeTimer의 startTime은 현재 시간 (이전 startTime과 다름)
      expect(activeTimer?.startTime).toBeGreaterThanOrEqual(beforeRestart);
      expect(activeTimer?.startTime).toBeLessThanOrEqual(afterRestart);
      expect(activeTimer?.startTime).toBeGreaterThan(originalStartTime);
    });

    it('v0.12.1: 완료된 작업을 다시 시작해도 기존 세션의 상태와 종료시간이 유지된다', async () => {
      const { startTimer, completeTimer } = useTimerStore.getState();
      
      // 1. 첫 번째 작업 완료
      act(() => {
        startTimer('작업 A', 'P001', '개발');
        completeTimer();
      });
      
      const { logs: logsAfterComplete } = useTimerStore.getState();
      const completedLog = logsAfterComplete[0];
      const originalEndTime = completedLog.endTime;
      const originalStatus = completedLog.status;
      
      // 완료된 세션의 상태와 종료시간 확인
      expect(originalStatus).toBe('COMPLETED');
      expect(originalEndTime).toBeDefined();
      
      // 2. 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 같은 작업을 다시 시작
      act(() => {
        startTimer('작업 A', 'P001', '개발');
      });
      
      // 4. 기존 완료된 세션의 상태와 종료시간이 유지되는지 확인
      const { logs } = useTimerStore.getState();
      const existingCompletedLog = logs.find(l => l.id === completedLog.id);
      
      expect(existingCompletedLog).toBeDefined();
      expect(existingCompletedLog?.status).toBe('COMPLETED'); // PAUSED가 아닌 COMPLETED 유지
      expect(existingCompletedLog?.endTime).toBe(originalEndTime); // 종료시간 유지
    });
  });

  describe('pauseTimer', () => {
    it('진행 중인 타이머를 일시정지하면 상태가 PAUSED가 된다', () => {
      const { startTimer, pauseTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        pauseTimer();
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.status).toBe('PAUSED');
    });

    it('일시정지 시 lastPausedAt이 설정된다', () => {
      const { startTimer, pauseTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
      });

      const before = Date.now();

      act(() => {
        pauseTimer();
      });

      const after = Date.now();
      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.lastPausedAt).toBeGreaterThanOrEqual(before);
      expect(activeTimer?.lastPausedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('resumeTimer', () => {
    it('일시정지된 타이머를 재개하면 상태가 RUNNING이 된다', () => {
      const { startTimer, pauseTimer, resumeTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        pauseTimer();
        resumeTimer();
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.status).toBe('RUNNING');
    });

    it('재개 시 pausedDuration이 누적된다', async () => {
      const { startTimer, pauseTimer, resumeTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        pauseTimer();
      });

      // 100ms 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      act(() => {
        resumeTimer();
      });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.pausedDuration).toBeGreaterThan(0);
    });
  });

  describe('completeTimer', () => {
    it('타이머를 완료하면 logs에 추가되고 activeTimer가 null이 된다', () => {
      const { startTimer, completeTimer } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        completeTimer();
      });

      const { activeTimer, logs } = useTimerStore.getState();
      expect(activeTimer).toBeNull();
      expect(logs.length).toBe(1);
      expect(logs[0].title).toBe('테스트 작업');
      expect(logs[0].status).toBe('COMPLETED');
    });

    it('완료된 타이머에 endTime이 설정된다', () => {
      const { startTimer, completeTimer } = useTimerStore.getState();
      const before = Date.now();

      act(() => {
        startTimer('테스트 작업');
        completeTimer();
      });

      const after = Date.now();
      const { logs } = useTimerStore.getState();
      expect(logs[0].endTime).toBeGreaterThanOrEqual(before);
      expect(logs[0].endTime).toBeLessThanOrEqual(after);
    });
  });

  describe('updateLog', () => {
    it('로그의 시작/종료 시간을 수정할 수 있다', () => {
      const { startTimer, completeTimer, updateLog } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const new_start = Date.now() - 3600000; // 1시간 전
      const new_end = Date.now() - 1800000; // 30분 전

      act(() => {
        updateLog(logs[0].id, { startTime: new_start, endTime: new_end });
      });

      const updated_logs = useTimerStore.getState().logs;
      expect(updated_logs[0].startTime).toBe(new_start);
      expect(updated_logs[0].endTime).toBe(new_end);
    });
  });

  describe('deleteLog', () => {
    it('로그를 삭제할 수 있다', () => {
      const { startTimer, completeTimer, deleteLog } = useTimerStore.getState();

      act(() => {
        startTimer('테스트 작업');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const log_id = logs[0].id;

      act(() => {
        deleteLog(log_id);
      });

      const updated_logs = useTimerStore.getState().logs;
      expect(updated_logs.length).toBe(0);
    });
  });

  describe('getRecentTitles', () => {
    it('최근 30일 내의 고유 작업 제목을 반환한다', () => {
      const { addLog, getRecentTitles } = useTimerStore.getState();

      act(() => {
        addLog({
          id: 'test-1',
          title: '작업 A',
          startTime: Date.now() - 86400000, // 1일 전
          endTime: Date.now() - 86400000 + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
        addLog({
          id: 'test-2',
          title: '작업 B',
          startTime: Date.now() - 172800000, // 2일 전
          endTime: Date.now() - 172800000 + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
        addLog({
          id: 'test-3',
          title: '작업 A', // 중복
          startTime: Date.now() - 259200000, // 3일 전
          endTime: Date.now() - 259200000 + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      const titles = getRecentTitles();
      expect(titles).toContain('작업 A');
      expect(titles).toContain('작업 B');
      expect(titles.filter((t) => t === '작업 A').length).toBe(1); // 중복 제거됨
    });
  });

  /**
   * v0.7.0 테스트: 휴지통 기능
   */
  describe('deleteLog (휴지통으로 이동)', () => {
    it('삭제된 로그가 휴지통(deleted_logs)으로 이동한다', () => {
      const { startTimer, completeTimer, deleteLog } = useTimerStore.getState();

      act(() => {
        startTimer('휴지통 테스트 작업');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const log_id = logs[0].id;

      act(() => {
        deleteLog(log_id);
      });

      const state = useTimerStore.getState();
      expect(state.logs.length).toBe(0);
      expect(state.deleted_logs.length).toBe(1);
      expect(state.deleted_logs[0].title).toBe('휴지통 테스트 작업');
    });

    it('삭제된 로그에 deleted_at 타임스탬프가 추가된다', () => {
      const { startTimer, completeTimer, deleteLog } = useTimerStore.getState();

      act(() => {
        startTimer('휴지통 테스트 작업');
        completeTimer();
      });

      const before = Date.now();
      const { logs } = useTimerStore.getState();
      const log_id = logs[0].id;

      act(() => {
        deleteLog(log_id);
      });

      const after = Date.now();
      const { deleted_logs } = useTimerStore.getState();
      const deleted_log = deleted_logs[0] as DeletedLog;
      
      expect(deleted_log.deletedAt).toBeGreaterThanOrEqual(before);
      expect(deleted_log.deletedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('restoreLog', () => {
    it('휴지통에서 로그를 복원하면 logs에 추가된다', () => {
      const { startTimer, completeTimer, deleteLog, restoreLog } = useTimerStore.getState();

      act(() => {
        startTimer('복원 테스트 작업');
        completeTimer();
      });

      const { logs: original_logs } = useTimerStore.getState();
      const log_id = original_logs[0].id;

      act(() => {
        deleteLog(log_id);
      });

      expect(useTimerStore.getState().logs.length).toBe(0);
      expect(useTimerStore.getState().deleted_logs.length).toBe(1);

      act(() => {
        restoreLog(log_id);
      });

      const state = useTimerStore.getState();
      expect(state.logs.length).toBe(1);
      expect(state.deleted_logs.length).toBe(0);
      expect(state.logs[0].title).toBe('복원 테스트 작업');
    });

    it('복원된 로그에서 deleted_at이 제거된다', () => {
      const { startTimer, completeTimer, deleteLog, restoreLog } = useTimerStore.getState();

      act(() => {
        startTimer('복원 테스트 작업');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const log_id = logs[0].id;

      act(() => {
        deleteLog(log_id);
        restoreLog(log_id);
      });

      const restored_log = useTimerStore.getState().logs[0];
      expect((restored_log as DeletedLog).deleted_at).toBeUndefined();
    });

    it('존재하지 않는 ID로 복원을 시도해도 에러가 발생하지 않는다', () => {
      const { restoreLog } = useTimerStore.getState();

      expect(() => {
        act(() => {
          restoreLog('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('permanentlyDeleteLog', () => {
    it('휴지통에서 로그를 영구 삭제한다', () => {
      const { startTimer, completeTimer, deleteLog, permanentlyDeleteLog } = useTimerStore.getState();

      act(() => {
        startTimer('영구 삭제 테스트 작업');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const log_id = logs[0].id;

      act(() => {
        deleteLog(log_id);
      });

      expect(useTimerStore.getState().deleted_logs.length).toBe(1);

      act(() => {
        permanentlyDeleteLog(log_id);
      });

      expect(useTimerStore.getState().deleted_logs.length).toBe(0);
      expect(useTimerStore.getState().logs.length).toBe(0);
    });
  });

  describe('emptyTrash', () => {
    it('휴지통의 모든 로그를 삭제한다', () => {
      const { startTimer, completeTimer, deleteLog, emptyTrash } = useTimerStore.getState();

      // 여러 작업 생성 및 삭제
      act(() => {
        startTimer('작업 1');
        completeTimer();
        startTimer('작업 2');
        completeTimer();
        startTimer('작업 3');
        completeTimer();
      });

      const { logs } = useTimerStore.getState();
      const log_ids = logs.map(log => log.id);

      act(() => {
        log_ids.forEach(id => deleteLog(id));
      });

      expect(useTimerStore.getState().deleted_logs.length).toBe(3);

      act(() => {
        emptyTrash();
      });

      expect(useTimerStore.getState().deleted_logs.length).toBe(0);
    });

    it('빈 휴지통에서 emptyTrash를 호출해도 에러가 발생하지 않는다', () => {
      const { emptyTrash } = useTimerStore.getState();

      expect(() => {
        act(() => {
          emptyTrash();
        });
      }).not.toThrow();

      expect(useTimerStore.getState().deleted_logs.length).toBe(0);
    });
  });

  /**
   * v0.10.4: 자동완성 제외 기능
   */
  describe('excludedTitles (자동완성 제외)', () => {
    beforeEach(() => {
      useTimerStore.setState({ 
        logs: [], 
        deleted_logs: [], 
        activeTimer: null,
        excludedTitles: []
      });
    });

    it('removeRecentTitle로 제목을 자동완성에서 제외할 수 있다', () => {
      const { removeRecentTitle } = useTimerStore.getState();

      act(() => {
        removeRecentTitle('제외할 제목');
      });

      const { excludedTitles } = useTimerStore.getState();
      expect(excludedTitles).toContain('제외할 제목');
    });

    it('이미 제외된 제목은 중복 추가되지 않는다', () => {
      const { removeRecentTitle } = useTimerStore.getState();

      act(() => {
        removeRecentTitle('중복 제목');
        removeRecentTitle('중복 제목');
      });

      const { excludedTitles } = useTimerStore.getState();
      const count = excludedTitles.filter(t => t === '중복 제목').length;
      expect(count).toBe(1);
    });

    it('getRecentTitles에서 excludedTitles가 필터링된다', () => {
      const { startTimer, completeTimer, removeRecentTitle, getRecentTitles } = useTimerStore.getState();

      // 로그 생성 (completeTimer를 사용해야 logs에 추가됨)
      act(() => {
        startTimer('포함될 제목', 'P001', '개발');
      });
      act(() => {
        completeTimer();
      });
      act(() => {
        startTimer('제외될 제목', 'P002', '개발');
      });
      act(() => {
        completeTimer();
      });

      // 제외 처리
      act(() => {
        removeRecentTitle('제외될 제목');
      });

      const recentTitles = getRecentTitles();
      expect(recentTitles).toContain('포함될 제목');
      expect(recentTitles).not.toContain('제외될 제목');
    });

    it('제외된 제목의 로그 데이터는 유지된다', () => {
      const { startTimer, completeTimer, removeRecentTitle } = useTimerStore.getState();

      act(() => {
        startTimer('제외할 제목', 'P001', '개발');
      });
      act(() => {
        completeTimer(); // logs에 추가하려면 completeTimer 사용
      });
      act(() => {
        removeRecentTitle('제외할 제목');
      });

      const { logs } = useTimerStore.getState();
      const log = logs.find(l => l.title === '제외할 제목');
      expect(log).toBeDefined(); // 로그 데이터는 유지됨
    });
  });

  describe('getOrAssignColorIndex (색상 인덱스 관리)', () => {
    beforeEach(() => {
      // 색상 인덱스 초기화
      useTimerStore.setState({ titleColorIndexMap: {}, nextColorIndex: 0 });
    });

    it('새 제목에 대해 순차적인 색상 인덱스를 할당한다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      const index1 = getOrAssignColorIndex('작업 A');
      const index2 = getOrAssignColorIndex('작업 B');
      const index3 = getOrAssignColorIndex('작업 C');

      expect(index1).toBe(0);
      expect(index2).toBe(1);
      expect(index3).toBe(2);
    });

    it('같은 제목에 대해 동일한 색상 인덱스를 반환한다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      const firstCall = getOrAssignColorIndex('동일 작업');
      const secondCall = getOrAssignColorIndex('동일 작업');
      const thirdCall = getOrAssignColorIndex('동일 작업');

      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
    });

    it('서로 다른 제목에 대해 다른 색상 인덱스를 할당한다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      const indexA = getOrAssignColorIndex('작업 A');
      const indexB = getOrAssignColorIndex('작업 B');

      expect(indexA).not.toBe(indexB);
    });

    it('색상 인덱스가 titleColorIndexMap에 저장된다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      getOrAssignColorIndex('저장될 작업');

      const { titleColorIndexMap } = useTimerStore.getState();
      expect(titleColorIndexMap['저장될 작업']).toBe(0);
    });

    it('nextColorIndex가 올바르게 증가한다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      getOrAssignColorIndex('작업 1');
      getOrAssignColorIndex('작업 2');
      getOrAssignColorIndex('작업 3');

      const { nextColorIndex } = useTimerStore.getState();
      expect(nextColorIndex).toBe(3);
    });

    it('같은 제목을 다시 호출해도 nextColorIndex는 증가하지 않는다', () => {
      const { getOrAssignColorIndex } = useTimerStore.getState();

      getOrAssignColorIndex('반복 작업');
      getOrAssignColorIndex('반복 작업');
      getOrAssignColorIndex('반복 작업');

      const { nextColorIndex } = useTimerStore.getState();
      expect(nextColorIndex).toBe(1); // 최초 1번만 증가
    });
  });
});
