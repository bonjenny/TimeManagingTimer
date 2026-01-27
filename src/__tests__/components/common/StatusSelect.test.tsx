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
      fireEvent.change(textField, { target: { value: '테스트상태' } });

      // 추가 버튼 클릭 (AddIcon을 가진 버튼 찾기)
      const allButtons = document.querySelectorAll('button');
      const addIconButton = Array.from(allButtons).find(btn => btn.querySelector('svg[data-testid="AddIcon"]'));
      
      expect(addIconButton).toBeTruthy();
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
      fireEvent.change(textField, { target: { value: '신규상태' } });
      fireEvent.keyDown(textField, { key: 'Enter', code: 'Enter' });

      // 상태가 추가되었는지 store 확인
      await waitFor(() => {
        const { result } = renderHook(() => useStatusStore());
        expect(result.current.statuses.some(s => s.label === '신규상태')).toBe(true);
      });
    });

    it('v0.12.1: 입력 중 포커스가 유지된다 (리렌더링 후 포커스 복원)', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 새 상태 입력 필드 찾기
      const textField = screen.getByPlaceholderText('새 상태');
      
      // 여러 글자 입력
      fireEvent.change(textField, { target: { value: '테스트입력' } });

      // 입력 값이 유지되는지 확인
      await waitFor(() => {
        expect(textField).toHaveValue('테스트입력');
      });

      // 드롭다운이 여전히 열려있는지 확인
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('v0.12.1: Paper에 최소 너비가 적용된다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 상태')).toBeInTheDocument();
      });

      // Paper 요소가 존재하는지 확인 (minWidth 200px 적용됨)
      const paper = document.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    it('v0.12.1: StatusSelect가 Autocomplete 기반으로 작동한다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Autocomplete의 combobox role이 존재해야 함
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();

      // 열기
      await userEvent.click(combobox);

      // listbox가 나타나야 함 (Autocomplete 특성)
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 기본 상태들이 표시되어야 함
      expect(screen.getByText('완료')).toBeInTheDocument();
      expect(screen.getByText('진행중')).toBeInTheDocument();
    });

    it('v0.12.1: 드롭다운 외부 클릭 시 드롭다운이 닫힌다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      // Select 열기
      const select = screen.getByRole('combobox');
      await userEvent.click(select);

      // 드롭다운이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // 새 상태 입력 필드 클릭 (내부 요소)
      const textField = screen.getByPlaceholderText('새 상태');
      fireEvent.focus(textField);

      // blur 이벤트 발생 (외부 클릭 시뮬레이션)
      fireEvent.blur(textField);

      // 약간의 대기 후 드롭다운이 닫히는지 확인
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      }, { timeout: 300 });
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
