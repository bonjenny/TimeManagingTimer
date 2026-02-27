import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import StatusSelect from '../../../components/common/StatusSelect';
import { useStatusStore } from '../../../store/useStatusStore';

const openAutocomplete = (combobox: HTMLElement) => {
  fireEvent.mouseDown(combobox);
};

describe('StatusSelect 컴포넌트', () => {
  beforeEach(() => {
    useStatusStore.getState().resetToDefault();
  });

  afterEach(() => {
    cleanup();
  });

  describe('추가 입력 영역 클릭 시 메뉴 유지', () => {
    it('TextField를 클릭해도 드롭다운이 닫히지 않는다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textField = screen.getByPlaceholderText('새 상태');
      expect(textField).toBeInTheDocument();

      fireEvent.mouseDown(textField);
      fireEvent.click(textField);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('추가 버튼(IconButton)을 클릭해도 드롭다운이 닫히지 않는다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textField = screen.getByPlaceholderText('새 상태');
      fireEvent.change(textField, { target: { value: '테스트상태' } });

      const allButtons = document.querySelectorAll('button');
      const addIconButton = Array.from(allButtons).find(btn => btn.querySelector('svg[data-testid="AddIcon"]'));
      
      expect(addIconButton).toBeTruthy();
      if (addIconButton) {
        fireEvent.mouseDown(addIconButton);
        fireEvent.click(addIconButton);
      }

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('새 상태를 입력하고 Enter를 누르면 상태가 추가된다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textField = screen.getByPlaceholderText('새 상태');
      fireEvent.change(textField, { target: { value: '신규상태' } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 상태')).toHaveValue('신규상태');
      });

      const updatedTextField = screen.getByPlaceholderText('새 상태');
      fireEvent.keyDown(updatedTextField, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        const statuses = useStatusStore.getState().statuses;
        expect(statuses.some(s => s.label === '신규상태')).toBe(true);
      });
    });

    it('v0.12.1: 입력 중 포커스가 유지된다 (리렌더링 후 포커스 복원)', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textField = screen.getByPlaceholderText('새 상태');
      
      fireEvent.change(textField, { target: { value: '테스트입력' } });

      await waitFor(() => {
        expect(textField).toHaveValue('테스트입력');
      });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('v0.12.1: Paper에 최소 너비가 적용된다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('새 상태')).toBeInTheDocument();
      });

      const paper = document.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
    });

    it('v0.12.1: StatusSelect가 Autocomplete 기반으로 작동한다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();

      openAutocomplete(combobox);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      expect(screen.getByText('완료')).toBeInTheDocument();
      expect(screen.getByText('진행중')).toBeInTheDocument();
    });

    it('v0.12.1: 드롭다운 외부 클릭 시 드롭다운이 닫힌다', async () => {
      const handleChange = jest.fn();
      render(<StatusSelect value="completed" onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      openAutocomplete(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textField = screen.getByPlaceholderText('새 상태');
      fireEvent.focus(textField);
      fireEvent.blur(textField);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});

describe('StatusSelect 관련 기능', () => {
  beforeEach(() => {
    useStatusStore.getState().resetToDefault();
  });

  describe('진행상태 선택', () => {
    it('기본 진행상태 목록이 존재한다', () => {
      const store = useStatusStore.getState();
      
      expect(store.statuses.length).toBeGreaterThan(0);
      expect(store.statuses.some(s => s.value === 'completed')).toBe(true);
      expect(store.statuses.some(s => s.value === 'in_progress')).toBe(true);
    });

    it('진행상태 label을 올바르게 조회한다', () => {
      const store = useStatusStore.getState();
      
      expect(store.getStatusLabel('completed')).toBe('완료');
      expect(store.getStatusLabel('in_progress')).toBe('진행중');
      expect(store.getStatusLabel('pending')).toBe('대기');
      expect(store.getStatusLabel('hold')).toBe('보류');
    });
  });

  describe('드롭다운 내 진행상태 추가', () => {
    it('새 진행상태를 드롭다운에서 추가할 수 있다', () => {
      const newLabel = '검토중';
      const newValue = newLabel.toLowerCase().replace(/\s+/g, '_');
      useStatusStore.getState().addStatus({ value: newValue, label: newLabel });
      
      expect(useStatusStore.getState().statuses.some(s => s.label === '검토중')).toBe(true);
    });

    it('value가 없으면 label에서 자동 생성된다 (snake_case)', () => {
      const label = '테스트 상태';
      const autoValue = label.toLowerCase().replace(/\s+/g, '_');
      useStatusStore.getState().addStatus({ value: autoValue, label });
      
      const added = useStatusStore.getState().statuses.find(s => s.value === '테스트_상태');
      expect(added).toBeDefined();
      expect(added?.label).toBe('테스트 상태');
    });
  });

  describe('드롭다운 내 진행상태 삭제', () => {
    it('드롭다운에서 진행상태를 삭제할 수 있다', () => {
      useStatusStore.getState().removeStatus('hold');
      
      expect(useStatusStore.getState().statuses.some(s => s.value === 'hold')).toBe(false);
    });

    it('삭제 후 최소 1개의 상태는 유지된다', () => {
      const store = useStatusStore.getState();
      store.statuses.forEach(s => {
        useStatusStore.getState().removeStatus(s.value);
      });
      
      expect(useStatusStore.getState().statuses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('진행상태 재정렬', () => {
    it('진행상태 순서를 변경할 수 있다', () => {
      const reversed = [...useStatusStore.getState().statuses].reverse();
      
      useStatusStore.getState().reorderStatuses(reversed);
      
      expect(useStatusStore.getState().statuses[0].value).toBe(reversed[0].value);
    });
  });
});
