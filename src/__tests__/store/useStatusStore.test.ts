import { renderHook, act } from '@testing-library/react';
import { useStatusStore, DEFAULT_STATUSES } from '../../store/useStatusStore';

describe('useStatusStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 store 초기화
    const { result } = renderHook(() => useStatusStore());
    act(() => {
      result.current.resetToDefault();
    });
  });

  describe('초기 상태', () => {
    it('기본 진행상태가 설정되어 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      expect(result.current.statuses).toHaveLength(DEFAULT_STATUSES.length);
      expect(result.current.statuses[0].value).toBe('completed');
      expect(result.current.statuses[0].label).toBe('완료');
    });
  });

  describe('진행상태 추가', () => {
    it('새 진행상태를 추가할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.addStatus({ value: 'review', label: '검토중' });
      });
      
      const addedStatus = result.current.statuses.find(s => s.value === 'review');
      expect(addedStatus).toBeDefined();
      expect(addedStatus?.label).toBe('검토중');
    });

    it('중복된 value는 추가되지 않는다', () => {
      const { result } = renderHook(() => useStatusStore());
      const initialLength = result.current.statuses.length;
      
      act(() => {
        result.current.addStatus({ value: 'completed', label: '다른라벨' });
      });
      
      expect(result.current.statuses.length).toBe(initialLength);
    });
  });

  describe('진행상태 삭제', () => {
    it('진행상태를 삭제할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.removeStatus('hold');
      });
      
      const removedStatus = result.current.statuses.find(s => s.value === 'hold');
      expect(removedStatus).toBeUndefined();
    });

    it('마지막 하나는 삭제할 수 없다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      // 모든 상태를 삭제 시도
      act(() => {
        result.current.removeStatus('completed');
        result.current.removeStatus('in_progress');
        result.current.removeStatus('pending');
        result.current.removeStatus('hold');
      });
      
      // 최소 1개는 남아있어야 함
      expect(result.current.statuses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('진행상태 수정', () => {
    it('진행상태를 수정할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.updateStatus('completed', { value: 'done', label: '완료됨' });
      });
      
      const updatedStatus = result.current.statuses.find(s => s.value === 'done');
      expect(updatedStatus).toBeDefined();
      expect(updatedStatus?.label).toBe('완료됨');
    });
  });

  describe('getStatusLabel', () => {
    it('value로 label을 조회할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      const label = result.current.getStatusLabel('completed');
      expect(label).toBe('완료');
    });

    it('존재하지 않는 value는 value 그대로 반환한다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      const label = result.current.getStatusLabel('unknown');
      expect(label).toBe('unknown');
    });
  });

  describe('기본값 초기화', () => {
    it('기본 진행상태로 초기화할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.addStatus({ value: 'test', label: '테스트' });
        result.current.removeStatus('hold');
      });
      
      act(() => {
        result.current.resetToDefault();
      });
      
      expect(result.current.statuses).toHaveLength(DEFAULT_STATUSES.length);
      expect(result.current.statuses.find(s => s.value === 'hold')).toBeDefined();
      expect(result.current.statuses.find(s => s.value === 'test')).toBeUndefined();
    });
  });
});
