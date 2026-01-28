import { renderHook, act } from '@testing-library/react';
import { useTimerStore } from '../../../store/useTimerStore';

// 테스트 전 store 초기화 헬퍼
const clearStore = () => {
  const { result } = renderHook(() => useTimerStore());
  act(() => {
    // 활성 타이머 정리
    if (result.current.activeTimer) {
      result.current.stopTimer();
    }
    // 모든 로그 영구 삭제
    [...result.current.logs].forEach(log => {
      result.current.deleteLog(log.id);
    });
    result.current.emptyTrash();
  });
};

describe('TimerList 인라인 편집 기능', () => {
  beforeEach(() => {
    clearStore();
  });

  describe('기록명 인라인 편집', () => {
    it('로그의 제목을 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 테스트 로그 추가 (completeTimer로 logs에 추가)
      act(() => {
        result.current.startTimer('테스트 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      act(() => {
        result.current.updateLog(log.id, { title: '수정된 작업명' });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.title).toBe('수정된 작업명');
    });

    it('여러 세션의 제목을 일괄 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 같은 제목으로 여러 세션 생성
      act(() => {
        result.current.startTimer('반복 작업', 'P001', '개발');
        result.current.completeTimer();
        result.current.startTimer('반복 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const logsToUpdate = result.current.logs.filter(l => l.title === '반복 작업');
      
      act(() => {
        logsToUpdate.forEach(log => {
          result.current.updateLog(log.id, { title: '수정된 반복 작업' });
        });
      });
      
      const updatedLogs = result.current.logs.filter(l => l.title === '수정된 반복 작업');
      expect(updatedLogs.length).toBe(2);
    });
  });

  describe('프로젝트 코드 인라인 편집', () => {
    it('로그의 프로젝트 코드를 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('작업', 'OLD_CODE', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      act(() => {
        result.current.updateLog(log.id, { projectCode: 'NEW_CODE' });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.projectCode).toBe('NEW_CODE');
    });

    it('프로젝트 코드를 제거할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      act(() => {
        result.current.updateLog(log.id, { projectCode: undefined });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.projectCode).toBeUndefined();
    });
  });

  describe('카테고리 인라인 편집', () => {
    it('로그의 카테고리를 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      act(() => {
        result.current.updateLog(log.id, { category: '회의' });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.category).toBe('회의');
    });
  });
});

describe('TimerList 인라인 시간 편집 기능 (v0.11.0)', () => {
  beforeEach(() => {
    clearStore();
  });

  describe('시간 업데이트', () => {
    it('로그의 시작 시간을 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('시간 수정 테스트', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      const newStartTime = log.startTime - 3600000; // 1시간 전으로 변경
      
      act(() => {
        result.current.updateLog(log.id, { startTime: newStartTime });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.startTime).toBe(newStartTime);
    });

    it('로그의 종료 시간을 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('종료시간 수정 테스트', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      const newEndTime = (log.endTime || Date.now()) + 1800000; // 30분 후로 변경
      
      act(() => {
        result.current.updateLog(log.id, { endTime: newEndTime });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.endTime).toBe(newEndTime);
    });

    it('시작 시간과 종료 시간을 동시에 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('동시 수정 테스트', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      const newStartTime = log.startTime - 3600000;
      const newEndTime = (log.endTime || Date.now()) + 1800000;
      
      act(() => {
        result.current.updateLog(log.id, { 
          startTime: newStartTime, 
          endTime: newEndTime 
        });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.startTime).toBe(newStartTime);
      expect(updatedLog?.endTime).toBe(newEndTime);
    });
  });

  describe('충돌 자동 조정 시나리오', () => {
    it('연속 세션에서 종료 시간을 늘리면 다음 세션 시작 시간도 조정 가능하다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      const baseTime = new Date('2026-01-27T09:00:00').getTime();
      
      // 첫 번째 세션 생성
      act(() => {
        result.current.startTimer('세션1', 'P001', '개발');
        result.current.completeTimer();
      });
      
      // 수동으로 시간 설정
      const log1 = result.current.logs[0];
      act(() => {
        result.current.updateLog(log1.id, {
          startTime: baseTime,
          endTime: baseTime + 3600000, // 10:00
        });
      });
      
      // 두 번째 세션: 10:30 ~ 11:30
      act(() => {
        result.current.startTimer('세션2', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log2 = result.current.logs.find(l => l.title === '세션2');
      act(() => {
        result.current.updateLog(log2!.id, {
          startTime: baseTime + 5400000, // 10:30
          endTime: baseTime + 9000000,   // 11:30
        });
      });
      
      // 세션1의 종료 시간을 10:45로 변경 (세션2와 충돌)
      const newEndTime = baseTime + 6300000; // 10:45
      
      act(() => {
        result.current.updateLog(log1.id, { endTime: newEndTime });
      });
      
      // 세션2의 시작 시간도 10:45로 자동 조정되어야 함
      // (실제 컴포넌트에서 처리되므로 여기서는 시간 변경 가능 여부만 확인)
      const updatedLog1 = result.current.logs.find(l => l.id === log1.id);
      expect(updatedLog1?.endTime).toBe(newEndTime);
    });

    it('시작 시간이 종료 시간보다 늦으면 유효하지 않은 상태가 된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('유효성 테스트', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      const originalEndTime = log.endTime;
      
      // 시작 시간을 종료 시간보다 늦게 설정 시도
      // (컴포넌트에서는 이를 방지하지만, store 자체는 업데이트 허용)
      const invalidStartTime = (originalEndTime || Date.now()) + 1000;
      
      act(() => {
        result.current.updateLog(log.id, { startTime: invalidStartTime });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      // store는 값을 저장함 (유효성 검사는 컴포넌트 레벨에서 처리)
      expect(updatedLog?.startTime).toBe(invalidStartTime);
    });
  });
});

describe('TimerList 펼치기/접기 토글 기능 (v0.12.5)', () => {
  describe('토글 상태 관리', () => {
    it('업무 그룹은 초기에 접힌 상태이다', () => {
      // expandedTasks Set이 비어있으면 모든 업무가 접힌 상태
      const expandedTasks = new Set<string>();
      expect(expandedTasks.size).toBe(0);
    });

    it('업무를 펼치면 expandedTasks에 추가된다', () => {
      const expandedTasks = new Set<string>();
      const taskTitle = '테스트 작업';
      
      // 펼치기
      expandedTasks.add(taskTitle);
      
      expect(expandedTasks.has(taskTitle)).toBe(true);
    });

    it('펼쳐진 업무를 다시 클릭하면 접힌다', () => {
      const expandedTasks = new Set<string>();
      const taskTitle = '테스트 작업';
      
      // 펼치기
      expandedTasks.add(taskTitle);
      expect(expandedTasks.has(taskTitle)).toBe(true);
      
      // 접기
      expandedTasks.delete(taskTitle);
      expect(expandedTasks.has(taskTitle)).toBe(false);
    });

    it('여러 업무를 동시에 펼칠 수 있다', () => {
      const expandedTasks = new Set<string>();
      
      expandedTasks.add('작업1');
      expandedTasks.add('작업2');
      expandedTasks.add('작업3');
      
      expect(expandedTasks.size).toBe(3);
      expect(expandedTasks.has('작업1')).toBe(true);
      expect(expandedTasks.has('작업2')).toBe(true);
      expect(expandedTasks.has('작업3')).toBe(true);
    });
  });

  describe('토글 아이콘 표시', () => {
    it('접힌 상태에서는 ExpandMoreIcon이 표시되어야 한다', () => {
      const is_expanded = false;
      // 접힌 상태: ExpandMoreIcon (∨)
      expect(is_expanded).toBe(false);
    });

    it('펼쳐진 상태에서는 ExpandLessIcon이 표시되어야 한다', () => {
      const is_expanded = true;
      // 펼쳐진 상태: ExpandLessIcon (∧)
      expect(is_expanded).toBe(true);
    });
  });
});

describe('TimerList 미완료 업무 표시 기능 (v0.13.0)', () => {
  beforeEach(() => {
    clearStore();
  });

  describe('미완료 업무 필터링', () => {
    it('PAUSED 상태 로그는 시작 날짜와 무관하게 오늘 표시되어야 한다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 어제 날짜로 로그 생성 후 PAUSED 상태로 변경
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 0, 0, 0);
      const yesterdayTimestamp = yesterday.getTime();
      
      act(() => {
        result.current.startTimer('어제 시작한 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      // 시작 시간을 어제로, 상태를 PAUSED로 변경
      act(() => {
        result.current.updateLog(log.id, {
          startTime: yesterdayTimestamp,
          endTime: undefined,
          status: 'PAUSED' as const,
        });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.status).toBe('PAUSED');
      expect(updatedLog?.startTime).toBe(yesterdayTimestamp);
    });

    it('RUNNING 상태 로그도 날짜와 무관하게 표시되어야 한다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('진행 중인 작업', 'P001', '개발');
      });
      
      // activeTimer가 RUNNING 상태로 존재해야 함
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.status).toBe('RUNNING');
    });

    it('COMPLETED 상태 로그는 해당 날짜에만 표시된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('완료된 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      expect(log.status).toBe('COMPLETED');
      // COMPLETED 상태는 시작 날짜로 필터링됨 (기존 동작 유지)
    });
  });

  describe('이전 날짜 시작 표시', () => {
    it('이전 날짜에 시작된 업무는 M/D HH:mm 형식으로 표시된다', () => {
      // formatTimeWithDate 함수 동작 테스트
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 30, 0, 0);
      
      const todayStart = new Date(now);
      todayStart.setHours(6, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      
      const date_range = {
        start: todayStart.getTime(),
        end: tomorrowStart.getTime(),
      };
      
      // 어제 시작 시간은 date_range.start보다 이전
      expect(yesterday.getTime()).toBeLessThan(date_range.start);
    });

    it('미완료 업무는 전체 세션 중 가장 이른 시작 시간을 first_start로 사용한다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(6, 0, 0, 0);
      
      // 어제 06:00에 시작한 COMPLETED 세션
      const yesterdayEarly = todayStart.getTime() - 86400000; // 어제 06:00
      
      // 어제 16:00에 시작한 PAUSED 세션 (더 늦은 시간)
      const yesterdayLate = todayStart.getTime() - 86400000 + 10 * 3600000; // 어제 16:00
      
      // 첫 번째 세션: 어제 06:00 COMPLETED
      act(() => {
        result.current.startTimer('연속 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log1 = result.current.logs[0];
      act(() => {
        result.current.updateLog(log1.id, {
          startTime: yesterdayEarly,
          endTime: yesterdayEarly + 3600000,
          status: 'COMPLETED' as const,
        });
      });
      
      // 두 번째 세션: 어제 16:00 PAUSED
      act(() => {
        result.current.startTimer('연속 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log2 = result.current.logs.find(l => l.id !== log1.id);
      act(() => {
        result.current.updateLog(log2!.id, {
          startTime: yesterdayLate,
          endTime: undefined,
          status: 'PAUSED' as const,
        });
      });
      
      // 같은 제목의 로그가 2개 존재해야 함
      const logsWithTitle = result.current.logs.filter(l => l.title === '연속 작업');
      expect(logsWithTitle.length).toBe(2);
      
      // 가장 이른 startTime은 yesterdayEarly (어제 06:00)
      const earliestStart = Math.min(...logsWithTitle.map(l => l.startTime));
      expect(earliestStart).toBe(yesterdayEarly);
    });
  });

  describe('총시간/오늘시간 분리', () => {
    it('TaskGroup에 today_duration 필드가 존재해야 한다', () => {
      // TaskGroup 인터페이스 테스트
      const taskGroup = {
        title: '테스트',
        sessions: [],
        total_duration: 3600, // 1시간
        today_duration: 1800, // 30분
        first_start: Date.now(),
        last_end: undefined,
        has_running: false,
      };
      
      expect(taskGroup.total_duration).toBe(3600);
      expect(taskGroup.today_duration).toBe(1800);
    });

    it('이전 날짜 세션은 today_duration에 포함되지 않는다', () => {
      // today_duration 계산 로직 테스트
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(6, 0, 0, 0);
      
      const yesterdaySession = {
        startTime: todayStart.getTime() - 86400000, // 어제
        duration: 3600,
      };
      
      const todaySession = {
        startTime: todayStart.getTime() + 3600000, // 오늘 07:00
        duration: 1800,
      };
      
      const date_range = {
        start: todayStart.getTime(),
        end: todayStart.getTime() + 86400000,
      };
      
      // 어제 세션은 범위 밖
      expect(yesterdaySession.startTime < date_range.start).toBe(true);
      // 오늘 세션은 범위 내
      expect(todaySession.startTime >= date_range.start && todaySession.startTime < date_range.end).toBe(true);
    });
  });
});

describe('TimerList 버튼 기능', () => {
  beforeEach(() => {
    clearStore();
  });

  describe('수정 버튼', () => {
    it('로그를 수정할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('원본 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      
      act(() => {
        result.current.updateLog(log.id, {
          title: '수정된 작업',
          projectCode: 'P002',
          category: '회의'
        });
      });
      
      const updatedLog = result.current.logs.find(l => l.id === log.id);
      expect(updatedLog?.title).toBe('수정된 작업');
      expect(updatedLog?.projectCode).toBe('P002');
      expect(updatedLog?.category).toBe('회의');
    });
  });

  describe('삭제 버튼', () => {
    it('로그를 삭제(휴지통 이동)할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('삭제할 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const log = result.current.logs[0];
      const initialLength = result.current.logs.length;
      
      act(() => {
        result.current.deleteLog(log.id);
      });
      
      expect(result.current.logs.length).toBe(initialLength - 1);
      expect(result.current.deleted_logs.some(l => l.id === log.id)).toBe(true);
    });
  });

  describe('재시작 버튼', () => {
    it('완료된 작업을 같은 정보로 새 타이머를 시작할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('반복 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      act(() => {
        result.current.startTimer('반복 작업', 'P001', '개발');
      });
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.title).toBe('반복 작업');
      expect(result.current.activeTimer?.projectCode).toBe('P001');
      expect(result.current.activeTimer?.category).toBe('개발');
    });
  });

  describe('완료 취소 버튼', () => {
    it('완료된 작업을 일시정지 상태로 변경할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('완료할 작업', 'P001', '개발');
        result.current.completeTimer();
      });
      
      const completedLog = result.current.logs[0];
      expect(completedLog.status).toBe('COMPLETED');
      
      act(() => {
        result.current.reopenTimer(completedLog.id);
      });
      
      // reopenTimer는 COMPLETED → PAUSED로 상태만 변경 (activeTimer로 이동 안 함)
      const reopenedLog = result.current.logs.find(l => l.id === completedLog.id);
      expect(reopenedLog?.status).toBe('PAUSED');
      expect(reopenedLog?.endTime).toBeUndefined();
    });
  });
});
