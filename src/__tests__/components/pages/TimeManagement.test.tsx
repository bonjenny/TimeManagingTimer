import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../../theme';
import TimeManagement from '../../../components/pages/TimeManagement';
import { useTimerStore } from '../../../store/useTimerStore';
import { useTimeManagementStore } from '../../../store/useTimeManagementStore';
import { v4 as uuidv4 } from 'uuid';

const theme = createAppTheme('#1976d2', '#dc004e', false);

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('TimeManagement 컴포넌트', () => {
  beforeEach(() => {
    useTimerStore.setState({ logs: [], activeTimer: null, deleted_logs: [] });
    useTimeManagementStore.setState({ rows: [] });
  });

  it('빈 상태에서 렌더링된다', () => {
    renderWithTheme(<TimeManagement />);
    expect(screen.getByText(/데이터가 없습니다/)).toBeInTheDocument();
  });

  it('새 행을 추가할 수 있다', () => {
    renderWithTheme(<TimeManagement />);
    
    const add_button = screen.getByRole('button', { name: /새 행 추가/ });
    fireEvent.click(add_button);

    const rows = useTimeManagementStore.getState().rows;
    expect(rows.length).toBe(1);
    expect(rows[0].work_type).toBe('작업');
    expect(rows[0].category_code).toBe('9999');
  });

  it('일간 타이머에서 데이터를 불러올 수 있다', () => {
    const today = new Date();
    const today_start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const today_end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30, 0);

    useTimerStore.setState({
      logs: [
        {
          id: uuidv4(),
          title: '테스트 작업',
          projectCode: 'A26_00413',
          category: '개발',
          startTime: today_start.getTime(),
          endTime: today_end.getTime(),
          status: 'COMPLETED',
          pausedDuration: 0,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const load_button = screen.getByRole('button', { name: /일간 타이머에서 불러오기/ });
    fireEvent.click(load_button);

    const rows = useTimeManagementStore.getState().rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].project_name).toBe('A26_00413');
    expect(rows[0].schedule_name).toBe('테스트 작업');
    expect(rows[0].category_name).toBe('개발');
    expect(rows[0].time_minutes).toBe(90);
  });

  it('체크박스를 선택하고 삭제할 수 있다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: '테스트 1',
          work_type: '작업',
          schedule_name: 'A26_00413',
          category_code: '13',
          category_name: '개발',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    const delete_button = screen.getByRole('button', { name: /삭제 \(1\)/ });
    expect(delete_button).not.toBeDisabled();

    fireEvent.click(delete_button);

    const rows = useTimeManagementStore.getState().rows;
    expect(rows.length).toBe(0);
  });

  it('총 시간이 정확히 계산된다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: '작업 1',
          work_type: '작업',
          schedule_name: '',
          category_code: '13',
          category_name: '개발',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-2',
          checked: false,
          project_name: '작업 2',
          work_type: '작업',
          schedule_name: '',
          category_code: '05',
          category_name: '회의',
          time_minutes: 90,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    expect(screen.getByText(/총 시간: 150분/)).toBeInTheDocument();
    expect(screen.getByText(/2.5시간/)).toBeInTheDocument();
  });

  it('날짜를 변경할 수 있다', () => {
    renderWithTheme(<TimeManagement />);

    const prev_button = screen.getByLabelText('이전 날짜');
    fireEvent.click(prev_button);

    const next_button = screen.getByLabelText('다음 날짜');
    fireEvent.click(next_button);

    expect(screen.getByText(/\d{4}\. \d{1,2}\. \d{1,2}\./)).toBeInTheDocument();
  });
});
