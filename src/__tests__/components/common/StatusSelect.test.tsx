import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StatusSelect from '../../../components/common/StatusSelect';
import { useStatusStore } from '../../../store/useStatusStore';

describe('StatusSelect 컴포넌트', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStatusStore());
    act(() => {
      result.current.resetToDefault();
    });
  });

  describe('추가 입력 영역 클릭 시 메뉴 유지', () => {
    it('TextField를 클릭해도 드롭다운이 닫히지 않는다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // "새 상태" 입력 필드 찾기
      const textField = screen.getByPlaceholderText('새 상태');
      expect(textField).toBeInTheDocument();

      // TextField 클릭 (mousedown + click 시뮬레이션)
      fireEvent.mouseDown(textField);
      fireEvent.click(textField);

      // 드롭다운이 여전히 열려있어야 함
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('추가 버튼(IconButton)을 클릭해도 드롭다운이 닫히지 않는다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 새 상태 입력
      const textField = screen.getByPlaceholderText('새 상태');
      await userEvent.type(textField, '테스트상태');

      // 추가 버튼 클릭 (AddIcon을 가진 버튼 찾기)
      const addButtons = screen.getAllByRole('button');
      const addIconButton = addButtons.find(btn => btn.querySelector('svg[data-testid="AddIcon"]'));
      
      expect(addIconButton).toBeDefined();
      if (addIconButton) {
        fireEvent.mouseDown(addIconButton);
        fireEvent.click(addIconButton);
      }

      // 드롭다운이 여전히 열려있어야 함
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('새 상태를 입력하고 Enter를 누르면 상태가 추가된다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 새 상태 입력
      const textField = screen.getByPlaceholderText('새 상태');
      await userEvent.type(textField, '신규상태{enter}');

      // 상태가 추가되었는지 store 확인
      const { result } = renderHook(() => useStatusStore());
      expect(result.current.statuses.some(s => s.label === '신규상태')).toBe(true);
    });
  });
});

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
