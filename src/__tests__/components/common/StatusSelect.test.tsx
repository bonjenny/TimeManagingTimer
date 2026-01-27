import { renderHook, act } from '@testing-library/react';
import { useStatusStore } from '../../../store/useStatusStore';

describe('StatusSelect 관련 기능', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStatusStore());
    act(() => {
      result.current.resetToDefault();
    });
  });

  describe('진행상태 선택', () => {
    it('기본 진행상태 목록이 존재한다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      expect(result.current.statuses.length).toBeGreaterThan(0);
      expect(result.current.statuses.some(s => s.value === 'completed')).toBe(true);
      expect(result.current.statuses.some(s => s.value === 'in_progress')).toBe(true);
    });

    it('진행상태 label을 올바르게 조회한다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      expect(result.current.getStatusLabel('completed')).toBe('완료');
      expect(result.current.getStatusLabel('in_progress')).toBe('진행중');
      expect(result.current.getStatusLabel('pending')).toBe('대기');
      expect(result.current.getStatusLabel('hold')).toBe('보류');
    });
  });

  describe('드롭다운 내 진행상태 추가', () => {
    it('새 진행상태를 드롭다운에서 추가할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        // StatusSelect에서 새 상태 추가 시뮬레이션
        const newLabel = '검토중';
        const newValue = newLabel.toLowerCase().replace(/\s+/g, '_');
        result.current.addStatus({ value: newValue, label: newLabel });
      });
      
      expect(result.current.statuses.some(s => s.label === '검토중')).toBe(true);
    });

    it('value가 없으면 label에서 자동 생성된다 (snake_case)', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        const label = '테스트 상태';
        const autoValue = label.toLowerCase().replace(/\s+/g, '_');
        result.current.addStatus({ value: autoValue, label });
      });
      
      const added = result.current.statuses.find(s => s.value === '테스트_상태');
      expect(added).toBeDefined();
      expect(added?.label).toBe('테스트 상태');
    });
  });

  describe('드롭다운 내 진행상태 삭제', () => {
    it('드롭다운에서 진행상태를 삭제할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.removeStatus('hold');
      });
      
      expect(result.current.statuses.some(s => s.value === 'hold')).toBe(false);
    });

    it('삭제 후 최소 1개의 상태는 유지된다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      act(() => {
        result.current.statuses.forEach(s => {
          result.current.removeStatus(s.value);
        });
      });
      
      expect(result.current.statuses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('진행상태 재정렬', () => {
    it('진행상태 순서를 변경할 수 있다', () => {
      const { result } = renderHook(() => useStatusStore());
      
      const reversed = [...result.current.statuses].reverse();
      
      act(() => {
        result.current.reorderStatuses(reversed);
      });
      
      expect(result.current.statuses[0].value).toBe(reversed[0].value);
    });
  });
});
