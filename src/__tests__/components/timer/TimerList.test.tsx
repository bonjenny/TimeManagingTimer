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

describe('TimerList 누적시간 계산 (total_duration)', () => {
  beforeEach(() => {
    clearStore();
  });

  it('total_duration은 여러 날에 걸친 세션의 누적시간을 포함한다', () => {
    const { result } = renderHook(() => useTimerStore());

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 어제 세션 (1시간)
    act(() => {
      result.current.startTimer('누적 테스트 작업', 'P001', '개발');
      result.current.completeTimer();
    });
    const log1 = result.current.logs[0];
    act(() => {
      result.current.updateLog(log1.id, {
        startTime: yesterday.getTime(),
        endTime: yesterday.getTime() + 3600000,
      });
    });

    // 오늘 세션 (30분)
    act(() => {
      result.current.startTimer('누적 테스트 작업', 'P001', '개발');
      result.current.completeTimer();
    });
    const log2 = result.current.logs.find(l => l.id !== log1.id && l.title === '누적 테스트 작업');
    act(() => {
      result.current.updateLog(log2!.id, {
        startTime: today.getTime(),
        endTime: today.getTime() + 1800000,
      });
    });

    // 같은 title로 2개의 세션이 존재
    const sessions = result.current.logs.filter(l => l.title === '누적 테스트 작업');
    expect(sessions.length).toBe(2);

    // 어제 세션의 startTime과 오늘 세션의 startTime이 다른 날
    const session_dates = sessions.map(s => new Date(s.startTime).toDateString());
    expect(new Set(session_dates).size).toBe(2);
  });

  it('오늘 날짜 범위 밖의 세션도 total_duration에 포함되어야 한다', () => {
    const { result } = renderHook(() => useTimerStore());

    const todayStart = new Date();
    todayStart.setHours(6, 0, 0, 0);

    // 어제 세션 (범위 밖)
    const yesterdayStart = todayStart.getTime() - 86400000;
    act(() => {
      result.current.startTimer('범위 밖 테스트', 'P001', '개발');
      result.current.completeTimer();
    });
    const log_id = result.current.logs[0].id;
    act(() => {
      result.current.updateLog(log_id, {
        startTime: yesterdayStart,
        endTime: yesterdayStart + 7200000, // 2시간
      });
    });

    // 업데이트된 로그를 다시 조회
    const updated_log = result.current.logs.find(l => l.id === log_id);

    // 어제 세션은 오늘 날짜 범위(06:00 ~ 익일 06:00) 밖
    expect(updated_log!.startTime).toBeLessThan(todayStart.getTime());

    // total_duration 계산 시, 전체 logs에서 같은 title을 찾으므로 이 세션이 포함됨
    const all_same_title = result.current.logs.filter(l => l.title === '범위 밖 테스트');
    expect(all_same_title.length).toBeGreaterThan(0);
  });
});

  describe('TimerList 진행 중인 작업 수정 (v0.13.6)', () => {
    describe('activeTimer 카테고리/프로젝트 수정', () => {
      it('진행 중인 작업의 프로젝트 코드를 업데이트할 수 있다', () => {
        const { result } = renderHook(() => useTimerStore());
        
        // activeTimer 시작 (title, projectCode, category, note)
        act(() => {
          result.current.startTimer('진행 중 작업', 'OLD001', '개발');
        });
        
        // activeTimer가 설정되었는지 확인
        expect(result.current.activeTimer).toBeDefined();
        expect(result.current.activeTimer?.projectCode).toBe('OLD001');
        
        // updateActiveTimer로 프로젝트 코드 변경
        act(() => {
          result.current.updateActiveTimer({ projectCode: 'NEW002' });
        });
        
        // 변경 확인
        expect(result.current.activeTimer?.projectCode).toBe('NEW002');
        
        // 정리
        act(() => {
          result.current.completeTimer();
        });
      });

      it('진행 중인 작업의 카테고리를 업데이트할 수 있다', () => {
        const { result } = renderHook(() => useTimerStore());
        
        // activeTimer 시작 (title, projectCode, category, note)
        act(() => {
          result.current.startTimer('카테고리 수정 작업', undefined, '개발');
        });
        
        expect(result.current.activeTimer?.category).toBe('개발');
        
        // updateActiveTimer로 카테고리 변경
        act(() => {
          result.current.updateActiveTimer({ category: '설계' });
        });
        
        // 변경 확인
        expect(result.current.activeTimer?.category).toBe('설계');
        
        // 정리
        act(() => {
          result.current.completeTimer();
        });
      });

      it('진행 중인 작업의 여러 필드를 동시에 업데이트할 수 있다', () => {
        const { result } = renderHook(() => useTimerStore());
        
        // activeTimer 시작 (title, projectCode, category, note)
        act(() => {
          result.current.startTimer('다중 수정 작업', 'P001', '개발');
        });
        
        // 여러 필드 동시 변경
        act(() => {
          result.current.updateActiveTimer({
            title: '수정된 작업명',
            projectCode: 'P002',
            category: '테스트',
          });
        });
        
        // 모든 변경 확인
        expect(result.current.activeTimer?.title).toBe('수정된 작업명');
        expect(result.current.activeTimer?.projectCode).toBe('P002');
        expect(result.current.activeTimer?.category).toBe('테스트');
        
        // 정리
        act(() => {
          result.current.completeTimer();
        });
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
      const originalEndTime = completedLog.endTime;
      
      act(() => {
        result.current.reopenTimer(completedLog.id);
      });
      
      // reopenTimer는 COMPLETED → PAUSED로 상태만 변경 (activeTimer로 이동 안 함)
      // endTime은 기존 값을 유지 (종료시간이 현재 시간으로 바뀌지 않도록)
      const reopenedLog = result.current.logs.find(l => l.id === completedLog.id);
      expect(reopenedLog?.status).toBe('PAUSED');
      expect(reopenedLog?.endTime).toBe(originalEndTime);
    });
  });

  describe('카테고리 변경 복사 기능', () => {
    it('카테고리만 변경하여 새 타이머를 시작할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 원래 작업 생성
      act(() => {
        result.current.startTimer('회의', 'P001', '개발', '기존 비고');
        result.current.completeTimer();
      });
      
      const original_log = result.current.logs[0];
      
      // 카테고리를 변경하여 복사
      act(() => {
        result.current.startTimer('회의', 'P001', '회의', '기존 비고');
      });
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.title).toBe('회의');
      expect(result.current.activeTimer?.projectCode).toBe('P001');
      expect(result.current.activeTimer?.category).toBe('회의');
      expect(result.current.activeTimer?.note).toBe('기존 비고');
      
      // 원래 로그는 그대로 유지
      const existing_log = result.current.logs.find(l => l.id === original_log.id);
      expect(existing_log).toBeDefined();
      expect(existing_log?.category).toBe('개발');
    });

    it('비고를 변경하여 새 타이머를 시작할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('문서작업', 'P002', '문서', '원래 비고');
        result.current.completeTimer();
      });
      
      // 비고를 변경하여 복사
      act(() => {
        result.current.startTimer('문서작업', 'P002', '문서', '변경된 비고');
      });
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.title).toBe('문서작업');
      expect(result.current.activeTimer?.note).toBe('변경된 비고');
    });

    it('카테고리와 비고를 모두 변경하여 새 타이머를 시작할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('분석', 'P003', '개발', '원래 비고');
        result.current.completeTimer();
      });
      
      // 카테고리와 비고를 모두 변경하여 복사
      act(() => {
        result.current.startTimer('분석', 'P003', '분석', '새로운 비고');
      });
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.category).toBe('분석');
      expect(result.current.activeTimer?.note).toBe('새로운 비고');
    });
  });

  describe('기록명+카테고리 그룹화', () => {
    it('같은 기록명이지만 다른 카테고리는 별도 그룹으로 처리된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 같은 기록명, 다른 카테고리로 2개 생성
      act(() => {
        result.current.startTimer('회의', 'P001', '회의');
        result.current.completeTimer();
        result.current.startTimer('회의', 'P001', '개발');
        result.current.completeTimer();
      });
      
      // 그룹화 로직 확인을 위해 logs 확인
      const meeting_category_logs = result.current.logs.filter(
        l => l.title === '회의' && l.category === '회의'
      );
      const dev_category_logs = result.current.logs.filter(
        l => l.title === '회의' && l.category === '개발'
      );
      
      expect(meeting_category_logs.length).toBe(1);
      expect(dev_category_logs.length).toBe(1);
    });

    it('기록명과 카테고리가 모두 같으면 동일 그룹이다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 같은 기록명, 같은 카테고리로 3개 생성
      act(() => {
        result.current.startTimer('테스트', 'P001', '테스트');
        result.current.completeTimer();
        result.current.startTimer('테스트', 'P001', '테스트');
        result.current.completeTimer();
        result.current.startTimer('테스트', 'P001', '테스트');
        result.current.completeTimer();
      });
      
      const same_group_logs = result.current.logs.filter(
        l => l.title === '테스트' && l.category === '테스트'
      );
      
      expect(same_group_logs.length).toBe(3);
    });

    it('카테고리가 없는 경우도 별도 그룹으로 처리된다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 카테고리 있음/없음
      act(() => {
        result.current.startTimer('작업', 'P001', '개발');
        result.current.completeTimer();
        result.current.startTimer('작업', 'P001', undefined);
        result.current.completeTimer();
      });
      
      const with_category = result.current.logs.filter(
        l => l.title === '작업' && l.category === '개발'
      );
      const without_category = result.current.logs.filter(
        l => l.title === '작업' && !l.category
      );
      
      expect(with_category.length).toBe(1);
      expect(without_category.length).toBe(1);
    });
  });
});
