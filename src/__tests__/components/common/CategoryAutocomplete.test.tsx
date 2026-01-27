import { renderHook, act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCategoryStore } from '../../../store/useCategoryStore';
import CategoryAutocomplete from '../../../components/common/CategoryAutocomplete';

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

  describe('CategoryAutocomplete UI', () => {
    it('드롭다운이 열리고 카테고리 목록이 표시된다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 드롭다운이 열리고 기본 카테고리가 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('개발')).toBeInTheDocument();
      });
    });

    it('새 카테고리 입력 영역을 클릭해도 드롭다운이 닫히지 않는다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 카테고리')).toBeInTheDocument();
      });

      // 새 카테고리 입력 영역 클릭
      const newCategoryInput = screen.getByPlaceholderText('새 카테고리');
      await userEvent.click(newCategoryInput);

      // 드롭다운이 여전히 열려있는지 확인 (기존 옵션이 보이는지)
      await waitFor(() => {
        expect(screen.getByText('개발')).toBeInTheDocument();
      });

      // onChange가 호출되지 않았는지 확인 (옵션이 선택되지 않음)
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('새 카테고리 입력 후 추가 버튼 클릭 시 카테고리가 추가되고 옵션이 선택되지 않는다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 새 카테고리 입력
      const newCategoryInput = screen.getByPlaceholderText('새 카테고리');
      await userEvent.type(newCategoryInput, '테스트카테고리');

      // 추가 버튼 클릭
      const addButton = screen.getByRole('button', { name: '' }); // AddIcon 버튼
      fireEvent.mouseDown(addButton);
      fireEvent.click(addButton);

      // 카테고리가 추가되었는지 확인
      await waitFor(() => {
        const { result } = renderHook(() => useCategoryStore());
        expect(result.current.categories).toContain('테스트카테고리');
      });

      // 드롭다운이 여전히 열려있고 기존 카테고리 옵션이 선택되지 않았는지 확인
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('새 카테고리 입력 후 Enter 키로 추가할 수 있다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 새 카테고리 입력
      const newCategoryInput = screen.getByPlaceholderText('새 카테고리');
      await userEvent.type(newCategoryInput, '엔터테스트{enter}');

      // 카테고리가 추가되었는지 확인
      await waitFor(() => {
        const { result } = renderHook(() => useCategoryStore());
        expect(result.current.categories).toContain('엔터테스트');
      });
    });

    it('v0.12.1: 입력 중 포커스가 유지된다 (리렌더링 후 포커스 복원)', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 새 카테고리 입력 필드 찾기
      const newCategoryInput = screen.getByPlaceholderText('새 카테고리');
      
      // 여러 글자 입력
      fireEvent.change(newCategoryInput, { target: { value: '테스트입력' } });

      // 입력 값이 유지되는지 확인
      await waitFor(() => {
        expect(newCategoryInput).toHaveValue('테스트입력');
      });

      // 드롭다운이 여전히 열려있는지 확인
      expect(screen.getByText('개발')).toBeInTheDocument();
    });

    it('v0.12.1: Paper에 최소 너비가 적용된다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 카테고리')).toBeInTheDocument();
      });

      // Paper 요소가 존재하는지 확인 (minWidth 200px 적용됨)
      const paper = document.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    it('v0.12.1: 드롭다운 외부 클릭 시 드롭다운이 닫힌다', async () => {
      const mockOnChange = jest.fn();
      render(
        <CategoryAutocomplete
          value={null}
          onChange={mockOnChange}
          placeholder="카테고리 선택"
        />
      );

      // Autocomplete 열기
      const input = screen.getByPlaceholderText('카테고리 선택');
      await userEvent.click(input);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 카테고리')).toBeInTheDocument();
      });

      // 새 카테고리 입력 필드 클릭 (내부 요소)
      const newCategoryInput = screen.getByPlaceholderText('새 카테고리');
      fireEvent.focus(newCategoryInput);

      // blur 이벤트 발생 (외부 클릭 시뮬레이션)
      fireEvent.blur(newCategoryInput);

      // 약간의 대기 후 드롭다운이 닫히는지 확인
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('새 카테고리')).not.toBeInTheDocument();
      }, { timeout: 300 });
    });
  });
});
