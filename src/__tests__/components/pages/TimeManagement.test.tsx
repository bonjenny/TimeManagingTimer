import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByText('여기를 눌러 새 줄 입력')).toBeInTheDocument();
  });

  it('새 행을 추가할 수 있다', () => {
    renderWithTheme(<TimeManagement />);
    
    fireEvent.click(screen.getByText('여기를 눌러 새 줄 입력'));

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

    const load_button = screen.getByRole('button', { name: /일간 타이머에서( 다시)? 불러오기/ });
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    fireEvent.click(load_button);
    
    // Restore window.confirm
    window.confirm = originalConfirm;

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

    const load_button = screen.getByRole('button', { name: /일간 타이머에서( 다시)? 불러오기/ });
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    fireEvent.click(load_button);
    
    // Restore window.confirm
    window.confirm = originalConfirm;

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

    const load_button = screen.getByRole('button', { name: /일간 타이머에서( 다시)? 불러오기/ });
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    fireEvent.click(load_button);
    
    // Restore window.confirm
    window.confirm = originalConfirm;

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

  it('데이터가 있을 때 엑셀 Export가 가능하다', async () => {
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

    // xlsx 는 클릭 시점에 동적 import 된다
    await waitFor(() => expect(XLSX.utils.json_to_sheet).toHaveBeenCalled());
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('헤더 클릭 시 오름차순으로 정렬된다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'C작업',
          category_code: '13',
          category_name: '개발',
          time_minutes: 90,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-2',
          checked: false,
          project_name: 'A25_05591',
          work_type: '개발',
          schedule_name: 'A작업',
          category_code: '05',
          category_name: '회의',
          time_minutes: 30,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-3',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'B작업',
          category_code: '14',
          category_name: '테스트',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const time_header = screen.getByText('시간(분)').closest('th');
    fireEvent.click(time_header!);

    const data_rows = screen.getAllByRole('row').slice(1);
    const time_cells = data_rows.map(row => {
      const cells = within(row as HTMLElement).getAllByRole('cell');
      return cells[6];
    });
    
    expect(time_cells[0]).toHaveTextContent('30');
    expect(time_cells[1]).toHaveTextContent('60');
    expect(time_cells[2]).toHaveTextContent('90');
  });

  it('헤더 재클릭 시 내림차순으로 정렬된다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'C작업',
          category_code: '13',
          category_name: '개발',
          time_minutes: 90,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-2',
          checked: false,
          project_name: 'A25_05591',
          work_type: '개발',
          schedule_name: 'A작업',
          category_code: '05',
          category_name: '회의',
          time_minutes: 30,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const time_header = screen.getByText('시간(분)').closest('th');
    fireEvent.click(time_header!);
    fireEvent.click(time_header!);

    const rows = useTimeManagementStore.getState().rows;
    
    expect(rows[0].time_minutes).toBe(90);
    expect(rows[1].time_minutes).toBe(30);
  });

  it('헤더 3번 클릭 시 정렬이 해제된다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'C작업',
          category_code: '13',
          category_name: '개발',
          time_minutes: 90,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-2',
          checked: false,
          project_name: 'A25_05591',
          work_type: '개발',
          schedule_name: 'A작업',
          category_code: '05',
          category_name: '회의',
          time_minutes: 30,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const time_header = screen.getByText('시간(분)').closest('th');
    fireEvent.click(time_header!);
    fireEvent.click(time_header!);
    fireEvent.click(time_header!);

    const rows = useTimeManagementStore.getState().rows;
    
    expect(rows[0].time_minutes).toBe(90);
    expect(rows[1].time_minutes).toBe(30);
  });

  it('문자열 컬럼도 정렬할 수 있다', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    useTimeManagementStore.setState({
      rows: [
        {
          id: 'test-row-1',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'C작업',
          category_code: '1301',
          category_name: '개발',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-2',
          checked: false,
          project_name: 'A25_05591',
          work_type: '개발',
          schedule_name: 'A작업',
          category_code: '0501',
          category_name: '회의',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
        {
          id: 'test-row-3',
          checked: false,
          project_name: 'A26_00413',
          work_type: '작업',
          schedule_name: 'B작업',
          category_code: '0701',
          category_name: '테스트',
          time_minutes: 60,
          note: '',
          date: date_string,
        },
      ],
    });

    renderWithTheme(<TimeManagement />);

    const schedule_header = screen.getByText('거래형(일정명)').closest('th');
    fireEvent.click(schedule_header!);

    const rows = screen.getAllByRole('row');
    const data_rows = rows.slice(1);
    
    expect(data_rows[0]).toHaveTextContent('A작업');
    expect(data_rows[1]).toHaveTextContent('B작업');
    expect(data_rows[2]).toHaveTextContent('C작업');
  });

  it('작업 드롭다운의 「새 프로젝트 추가」로 코드·이름을 나눠 등록하고 그 행에 바로 넣는다', async () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    useTimeManagementStore.setState({
      rows: [{ id: 'r1', checked: false, project_name: '', work_type: '작업', schedule_name: '팀장 업무', category_code: '07', category_name: '팀장업무', time_minutes: 30, note: '', date: date_string }],
    });
    renderWithTheme(<TimeManagement />);

    // 첫 데이터 행의 「작업」 칸 (체크박스 다음 칸)
    const project_cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[1];
    fireEvent.click(within(project_cell).getByText('-'));
    // 목록에 없는 걸 치면 「새 프로젝트 추가」 하나만 남고, 친 글자가 코드로 넘어간다
    const search = within(project_cell).getByLabelText('작업 검색');
    fireEvent.change(search, { target: { value: '6010' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    const dialog = await screen.findByRole('dialog', { name: '새 프로젝트 추가' });
    expect(within(dialog).getByLabelText('프로젝트 코드')).toHaveValue('6010');
    fireEvent.change(within(dialog).getByLabelText('프로젝트 명'), { target: { value: '팀장업무' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /추가/ }));

    await waitFor(() => expect(useTimeManagementStore.getState().rows[0].project_name).toBe('6010'));
    expect(useProjectStore.getState().projects.find((p) => p.code === '6010')?.name).toBe('팀장업무');
  });

  describe('줄 입력 편의 (5.0 그리드처럼)', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const base = { checked: false, note: '', date: date_string };

    it('맨 아래 빈 줄을 누르면 새 줄이 생기고 종료예정일은 그 날짜', () => {
      useTimeManagementStore.setState({ rows: [] });
      renderWithTheme(<TimeManagement />);
      fireEvent.click(screen.getByText('여기를 눌러 새 줄 입력'));
      const rows = useTimeManagementStore.getState().rows;
      expect(rows).toHaveLength(1);
      expect(rows[0].end_date).toBe(date_string);
    });

    it('줄의 + 는 바로 아래에 새 줄을 넣고, 이어서 Ctrl+D 로 그 줄을 복사', () => {
      useTimeManagementStore.setState({
        rows: [
          { ...base, id: 'a', project_name: 'A26_05557', work_type: '개발', schedule_name: '조사', category_code: '17', category_name: '분석', time_minutes: 60, end_date: date_string },
          { ...base, id: 'z', project_name: '', work_type: '작업', schedule_name: '끝줄', category_code: '9999', category_name: '기타', time_minutes: 0, end_date: date_string },
        ],
      });
      renderWithTheme(<TimeManagement />);
      fireEvent.click(screen.getAllByRole('button', { name: '아래에 새 줄' })[0]);
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD', ctrlKey: true });
      const rows = useTimeManagementStore.getState().rows;
      expect(rows.map((r) => r.id)[2]).toBe('z');
      expect(rows[1]).toMatchObject({ project_name: 'A26_05557', schedule_name: '조사', category_code: '17', time_minutes: 0 });
    });

    it('Ctrl+D: 칸을 눌렀으면 그 칸만 윗줄 값으로 (카테고리는 코드·이름 함께)', () => {
      useTimeManagementStore.setState({
        rows: [
          { ...base, id: 'a', project_name: 'A26_05557', work_type: '개발', schedule_name: '조사', category_code: '17', category_name: '분석', time_minutes: 60, end_date: '2026-10-30' },
          { ...base, id: 'b', project_name: '', work_type: '작업', schedule_name: '내 일', category_code: '9999', category_name: '기타', time_minutes: 15, end_date: date_string },
        ],
      });
      renderWithTheme(<TimeManagement />);
      const cells = () => within(screen.getAllByRole('row')[2]).getAllByRole('cell');
      fireEvent.click(within(cells()[1]).getByText('-')); // 작업 칸
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD', ctrlKey: true });
      expect(useTimeManagementStore.getState().rows[1]).toMatchObject({ project_name: 'A26_05557', work_type: '작업', schedule_name: '내 일', category_code: '9999' });

      fireEvent.click(within(cells()[5]).getByText('기타')); // 카테고리명 칸
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD', ctrlKey: true });
      expect(useTimeManagementStore.getState().rows[1]).toMatchObject({ work_type: '작업', schedule_name: '내 일', category_code: '17', category_name: '분석', end_date: date_string });
    });

    it('Ctrl+D: 선택한 줄에 윗줄을 복사 (시간·비고는 그대로)', () => {
      useTimeManagementStore.setState({
        rows: [
          { ...base, id: 'a', project_name: 'A26_05557', work_type: '개발', schedule_name: '조사', category_code: '17', category_name: '분석', time_minutes: 60, note: '윗줄 비고', end_date: '2026-10-30' },
          { ...base, id: 'b', project_name: '', work_type: '작업', schedule_name: '', category_code: '9999', category_name: '기타', time_minutes: 15, note: '내 비고', end_date: date_string },
        ],
      });
      renderWithTheme(<TimeManagement />);
      fireEvent.click(within(screen.getAllByRole('row')[2]).getAllByRole('cell')[0]); // 둘째 줄 선택
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD', ctrlKey: true });
      const b = useTimeManagementStore.getState().rows.find((r) => r.id === 'b')!;
      expect(b).toMatchObject({ project_name: 'A26_05557', work_type: '개발', schedule_name: '조사', category_code: '17', category_name: '분석', end_date: '2026-10-30', time_minutes: 15, note: '내 비고' });
    });
  });

  describe('일괄 변경 · 필수값 · 작업 검색 · 줄 가져오기', () => {
    const today = new Date();
    const date_string = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const row = (over: Record<string, unknown>) => ({
      checked: false, project_name: 'A26_00413', work_type: '작업', schedule_name: '', category_code: '17', category_name: '분석',
      time_minutes: 30, note: '', date: date_string, end_date: date_string, ...over,
    });

    it('작업 칸 검색: 맞는 게 하나면 Enter 로 바로 고른다 (이름으로도 검색)', () => {
      useTimeManagementStore.setState({ rows: [row({ id: 'r1', project_name: '' })] as never });
      renderWithTheme(<TimeManagement />);
      const project_cell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[1];
      fireEvent.click(within(project_cell).getByText('-'));
      const search = within(project_cell).getByLabelText('작업 검색');
      fireEvent.change(search, { target: { value: '특수' } });
      fireEvent.keyDown(search, { key: 'Enter' });
      expect(useTimeManagementStore.getState().rows[0].project_name).toBe('A25_05591');
    });

    it('작업이 비면 빨간 칸으로 알린다 (기타 9999 는 등록되니 표시 안 함)', () => {
      useTimeManagementStore.setState({
        rows: [row({ id: 'ok' }), row({ id: 'bad', project_name: '', category_code: '9999', category_name: '기타' })] as never,
      });
      renderWithTheme(<TimeManagement />);
      expect(screen.getByText(/빨간 칸 1줄/)).toBeInTheDocument();
      expect(screen.getByTitle('작업을 골라야 ERP 에 등록돼요')).toBeInTheDocument();
      expect(screen.queryByTitle(/9999/)).not.toBeInTheDocument();
    });

    it('체크한 줄만 일괄 변경, 비운 항목은 그대로', async () => {
      useTimeManagementStore.setState({
        rows: [row({ id: 'a', checked: true, work_type: '작업' }), row({ id: 'b', checked: false })] as never,
      });
      renderWithTheme(<TimeManagement />);
      fireEvent.click(screen.getByRole('button', { name: /일괄 변경 \(1\)/ }));
      const dialog = await screen.findByRole('dialog', { name: /일괄 변경/ });
      fireEvent.change(within(dialog).getByLabelText('종료예정일'), { target: { value: '2026-11-07' } });
      fireEvent.click(within(dialog).getByRole('button', { name: '적용' }));
      const rows = useTimeManagementStore.getState().rows;
      expect(rows.find((r) => r.id === 'a')).toMatchObject({ end_date: '2026-11-07', work_type: '작업', project_name: 'A26_00413' });
      expect(rows.find((r) => r.id === 'b')!.end_date).toBe(date_string);
    });

    it('웹자료 올리기: 엑셀 표를 붙여넣으면 그 날짜 줄로 추가', async () => {
      renderWithTheme(<TimeManagement />);
      fireEvent.click(screen.getByRole('button', { name: /줄 가져오기/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /웹자료 올리기/ }));
      const dialog = await screen.findByRole('dialog', { name: /웹자료 올리기/ });
      fireEvent.change(within(dialog).getByLabelText('붙여넣을 표'), {
        target: { value: '테스트 프로젝트\t개발\t조사\t17\t분석\t45\t\t메모' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '1줄 추가' }));
      const rows = useTimeManagementStore.getState().rows;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ project_name: 'A26_00413', work_type: '개발', schedule_name: '조사', category_code: '17', time_minutes: 45, note: '메모', date: date_string, end_date: date_string });
    });

    it('다른 날짜에서 복사: 종료예정일은 입력하는 날짜, 원래 줄은 그대로', async () => {
      useTimeManagementStore.setState({
        rows: [row({ id: 'old', date: '2026-01-05', end_date: '2026-01-09', schedule_name: '어제 일', original_log_id: 'log1' })] as never,
      });
      renderWithTheme(<TimeManagement />);
      fireEvent.click(screen.getByRole('button', { name: /줄 가져오기/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /다른 날짜에서 복사/ }));
      const dialog = await screen.findByRole('dialog', { name: /다른 날짜에서 복사/ });
      expect(within(dialog).getByText('어제 일')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: '1줄 복사' }));
      const rows = useTimeManagementStore.getState().rows;
      const copied = rows.find((r) => r.date === date_string)!;
      expect(copied).toMatchObject({ schedule_name: '어제 일', end_date: date_string, checked: false });
      expect(copied.id).not.toBe('old');
      expect(copied.original_log_id).toBeUndefined();
      expect(rows.find((r) => r.id === 'old')!.end_date).toBe('2026-01-09');
    });
  });
});
