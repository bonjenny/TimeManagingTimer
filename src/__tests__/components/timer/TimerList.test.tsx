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
