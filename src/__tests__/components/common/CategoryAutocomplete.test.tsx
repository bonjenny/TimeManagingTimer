import { renderHook, act } from '@testing-library/react';
import { useCategoryStore } from '../../../store/useCategoryStore';

describe('CategoryAutocomplete 관련 기능', () => {
  beforeEach(() => {
    // 각 테스트 전에 store 초기화
    const { result } = renderHook(() => useCategoryStore());
    act(() => {
      result.current.resetToDefault();
    });
  });

  describe('카테고리 추가', () => {
    it('새 카테고리를 추가할 수 있다', () => {
      const { result } = renderHook(() => useCategoryStore());
      
      act(() => {
        result.current.addCategory('새카테고리');
      });
      
      expect(result.current.categories).toContain('새카테고리');
    });

    it('중복된 카테고리는 추가되지 않는다', () => {
      const { result } = renderHook(() => useCategoryStore());
      const initialLength = result.current.categories.length;
      
      act(() => {
        result.current.addCategory('개발'); // 기본 카테고리
      });
      
      expect(result.current.categories.length).toBe(initialLength);
    });

    it('빈 문자열은 추가되지 않는다', () => {
      const { result } = renderHook(() => useCategoryStore());
      const initialLength = result.current.categories.length;
      
      act(() => {
        result.current.addCategory('');
      });
      
      expect(result.current.categories.length).toBe(initialLength);
    });
  });

  describe('카테고리 삭제', () => {
    it('카테고리를 삭제할 수 있다', () => {
      const { result } = renderHook(() => useCategoryStore());
      
      act(() => {
        result.current.removeCategory('개발');
      });
      
      expect(result.current.categories).not.toContain('개발');
    });

    it('존재하지 않는 카테고리 삭제 시도는 무시된다', () => {
      const { result } = renderHook(() => useCategoryStore());
      const initialLength = result.current.categories.length;
      
      act(() => {
        result.current.removeCategory('존재하지않는카테고리');
      });
      
      expect(result.current.categories.length).toBe(initialLength);
    });
  });

  describe('카테고리 수정', () => {
    it('카테고리 이름을 수정할 수 있다', () => {
      const { result } = renderHook(() => useCategoryStore());
      
      act(() => {
        result.current.updateCategory('개발', '개발업무');
      });
      
      expect(result.current.categories).toContain('개발업무');
      expect(result.current.categories).not.toContain('개발');
    });
  });

  describe('기본값 초기화', () => {
    it('기본 카테고리로 초기화할 수 있다', () => {
      const { result } = renderHook(() => useCategoryStore());
      
      act(() => {
        result.current.addCategory('테스트');
        result.current.removeCategory('개발');
      });
      
      act(() => {
        result.current.resetToDefault();
      });
      
      expect(result.current.categories).toContain('개발');
      expect(result.current.categories).not.toContain('테스트');
    });
  });
});
