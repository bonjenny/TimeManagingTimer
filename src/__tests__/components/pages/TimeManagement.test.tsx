import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../../theme';
import TimeManagement from '../../../components/pages/TimeManagement';
import { useTimerStore } from '../../../store/useTimerStore';
import { useTimeManagementStore } from '../../../store/useTimeManagementStore';
import { useProjectStore } from '../../../store/useProjectStore';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

const theme = createAppTheme('#1976d2', '#dc004e', false);

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('TimeManagement 컴포넌트', () => {
  beforeEach(() => {
    useTimerStore.setState({ logs: [], activeTimer: null, deleted_logs: [] });
    useTimeManagementStore.setState({
      rows: [],
      default_work_type: '작업',
      category_work_type_map: {},
      project_work_type_map: {},
    });
    useProjectStore.setState({
      projects: [
        { id: '1', code: 'A26_00413', name: '테스트 프로젝트' },
        { id: '2', code: 'A25_05591', name: '특수 프로젝트' },
      ],
    });
    jest.clearAllMocks();
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

  it('프로젝트별 업무형 설정이 적용된다', () => {
    const today = new Date();
    const today_start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const today_end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

    useTimeManagementStore.setState({
      rows: [],
      default_work_type: '개발',
      category_work_type_map: {},
      project_work_type_map: {
        'A25_05591': '작업',
      },
    });

    useTimerStore.setState({
      logs: [
        {
          id: uuidv4(),
          title: '특수 작업',
          projectCode: 'A25_05591',
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
    expect(rows[0].project_name).toBe('A25_05591');
    expect(rows[0].work_type).toBe('작업');
  });

  it('카테고리별 업무형 설정이 적용된다', () => {
    const today = new Date();
    const today_start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const today_end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

    useTimeManagementStore.setState({
      rows: [],
      default_work_type: '개발',
      category_work_type_map: {
        '질의응답': '작업',
      },
      project_work_type_map: {},
    });

    useTimerStore.setState({
      logs: [
        {
          id: uuidv4(),
          title: '고객 질의응답',
          category: '질의응답',
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
    expect(rows[0].category_name).toBe('질의응답');
    expect(rows[0].work_type).toBe('작업');
  });

  it('엑셀 Export 버튼이 렌더링된다', () => {
    renderWithTheme(<TimeManagement />);
    
    const export_button = screen.getByRole('button', { name: /엑셀 Export/ });
    expect(export_button).toBeInTheDocument();
    expect(export_button).toBeDisabled();
  });

  it('데이터가 있을 때 엑셀 Export가 가능하다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: '테스트 작업',
          category_code: '13',
          category_name: '개발',
          time_minutes: 60,
          note: '테스트',
          date: date_string,
        },
      ],
      default_work_type: '작업',
      category_work_type_map: {},
      project_work_type_map: {},
    });

    renderWithTheme(<TimeManagement />);

    const export_button = screen.getByRole('button', { name: /엑셀 Export/ });
    expect(export_button).not.toBeDisabled();

    fireEvent.click(export_button);

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });
});
