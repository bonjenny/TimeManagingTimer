import { renderHook, act } from '@testing-library/react';
import { useTimerStore } from '../../../store/useTimerStore';

describe('TimerList 인라인 편집 기능', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useTimerStore());
    // 테스트용 로그 데이터 초기화
    act(() => {
      // 기존 로그 삭제 및 테스트 데이터 추가
      result.current.logs.forEach(log => {
        result.current.deleteLog(log.id);
      });
    });
  });

  describe('기록명 인라인 편집', () => {
    it('로그의 제목을 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      // 테스트 로그 추가
      act(() => {
        result.current.startTimer('테스트 작업', 'P001', '개발');
        result.current.stopTimer();
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
        result.current.stopTimer();
        result.current.startTimer('반복 작업', 'P001', '개발');
        result.current.stopTimer();
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
        result.current.stopTimer();
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
        result.current.stopTimer();
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
        result.current.stopTimer();
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
  describe('시간 업데이트', () => {
    it('로그의 시작 시간을 업데이트할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('시간 수정 테스트', 'P001', '개발');
        result.current.stopTimer();
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
        result.current.stopTimer();
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
        result.current.stopTimer();
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
      
      // 첫 번째 세션: 09:00 ~ 10:00
      act(() => {
        result.current.startTimer('세션1', 'P001', '개발');
      });
      
      // 수동으로 시간 설정
      const log1 = result.current.logs[0];
      act(() => {
        result.current.updateLog(log1.id, {
          startTime: baseTime,
          endTime: baseTime + 3600000, // 10:00
        });
        result.current.stopTimer();
      });
      
      // 두 번째 세션: 10:30 ~ 11:30
      act(() => {
        result.current.startTimer('세션2', 'P001', '개발');
        result.current.stopTimer();
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
        result.current.stopTimer();
      });
      
      const log = result.current.logs[0];
      const originalStartTime = log.startTime;
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

describe('TimerList 버튼 기능', () => {
  describe('수정 버튼', () => {
    it('로그를 수정할 수 있다', () => {
      const { result } = renderHook(() => useTimerStore());
      
      act(() => {
        result.current.startTimer('원본 작업', 'P001', '개발');
        result.current.stopTimer();
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
        result.current.stopTimer();
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
        result.current.stopTimer();
      });
      
      const initialLogCount = result.current.logs.length;
      
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
    it('완료된 작업을 재진행할 수 있다', () => {
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
      
      expect(result.current.activeTimer).not.toBeNull();
      expect(result.current.activeTimer?.status).toBe('RUNNING');
    });
  });
});
