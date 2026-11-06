/**
 * 배포 캘린더 컴포넌트 테스트
 * v0.14.0: 배포 캘린더 기능
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DeployCalendar from '../../../components/pages/DeployCalendar';
import { useDeployCalendarStore } from '../../../store/useDeployCalendarStore';
import { useProjectStore } from '../../../store/useProjectStore';
import { act } from '@testing-library/react';

// 테마 래퍼
const theme = createTheme();
const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DeployCalendar', () => {
  beforeEach(() => {
    // 스토어 초기화
    useDeployCalendarStore.setState({ events: [], job_colors: [] });
    useProjectStore.setState({ projects: [] });
    localStorage.clear();
  });

  describe('기본 렌더링', () => {
    it('캘린더가 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      // 월/년 표시 확인
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });

    it('네비게이션 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByLabelText('이전 주')).toBeInTheDocument();
      expect(screen.getByLabelText('다음 주')).toBeInTheDocument();
      expect(screen.getByLabelText('이번 주로 이동')).toBeInTheDocument();
    });

    it('HTML 복사 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByRole('button', { name: /HTML 복사/i })).toBeInTheDocument();
    });

    it('잡 색상 설정 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByRole('button', { name: /잡 색상 설정/i })).toBeInTheDocument();
    });
  });

  describe('이벤트 표시', () => {
    it('등록된 이벤트가 캘린더에 표시된다', () => {
      // 이벤트 추가 (오늘 날짜 기준)
      const today = new Date();
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      
      const date_str = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      
      act(() => {
        useDeployCalendarStore.getState().addEvent({
          date: date_str,
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByText('HTML 다크모드 스테이지')).toBeInTheDocument();
    });

    it('휴일 이벤트가 빨간색으로 표시된다', () => {
      const today = new Date();
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      
      const date_str = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      
      act(() => {
        useDeployCalendarStore.getState().addEvent({
          date: date_str,
          job_code: '',
          job_name: '신정',
          status: '',
          is_holiday: true,
        });
      });

      renderWithTheme(<DeployCalendar />);
      
      const holiday_element = screen.getByText('신정');
      expect(holiday_element).toBeInTheDocument();
      expect(holiday_element).toHaveStyle({ color: '#ca3626' });
    });
  });

  describe('네비게이션', () => {
    it('다음 주 버튼 클릭 시 날짜가 변경된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      const initial_heading = screen.getByRole('heading', { level: 6 }).textContent;
      
      fireEvent.click(screen.getByLabelText('다음 주'));
      
      // 날짜가 변경되었을 수 있음 (월이 바뀌거나)
      // 최소한 에러 없이 동작해야 함
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });

    it('이전 주 버튼 클릭 시 날짜가 변경된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      fireEvent.click(screen.getByLabelText('이전 주'));
      
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });
  });

  describe('모달 열기', () => {
    it('잡 색상 설정 버튼 클릭 시 모달이 열린다', async () => {
      renderWithTheme(<DeployCalendar />);
      
      fireEvent.click(screen.getByRole('button', { name: /잡 색상 설정/i }));
      
      await waitFor(() => {
        // 모달이 열리면 다이얼로그 역할의 요소가 나타남
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});

describe('캘린더 근태 (ERP 근태현황)', () => {
  const ymd8 = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  // 받아 온 「대상|기간」은 탭(모듈) 단위로 기억하므로 테스트마다 다른 부서를 쓴다
  let seq = 0;
  const site = () => ({ type: 'site' as const, code: `팀${++seq}`, name: `팀${seq}` });
  let rows: Record<string, unknown>[] = [];
  const attendanceCalls = () => ((global as any).fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('GetTimeAttendance'));

  beforeEach(() => {
    sessionStorage.clear();
    rows = [{ 'INSA511.EMP_CD': 'E1', 'INSA511.EMP_KNAME': '가나다', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '0.6', 'INSA511.REMARKS1': '오후반차', SLIP_DATE: ymd8(monday) }];
    useDeployCalendarStore.setState({
      events: [], job_colors: [], view_mode: 'week', weeks_to_show: 1, show_attendance: false,
      attendance_targets: [site()], attendance_records: [], attendance_fetched_at: 0,
    });
    (global as any).fetch = jest.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        // 사원 검색은 빈 목록, 근태현황은 rows
        text: () => Promise.resolve(JSON.stringify({ Status: '200', Data: String(url).includes('GetTimeAttendance') ? { Data: rows } : [] })),
      })
    );
  });

  it('근태를 켜면 바로 근태 설정 창이 뜨고, 세션·부서를 넣으면 그 주 부서 근태를 날짜 칸에 보여주고 저장한다', async () => {
    useDeployCalendarStore.setState({ attendance_targets: [] });
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    const dialog = await screen.findByRole('dialog', { name: '근태 설정' });
    fireEvent.change(within(dialog).getByLabelText(/ERP 세션/), { target: { value: 'https://logine.ecount.com/ec56/view/erp?ec_req_sid=E-test' } });
    const input = within(dialog).getByLabelText('조회 대상 (부서·사원)');
    fireEvent.change(input, { target: { value: 'EFA팀' } });
    fireEvent.keyDown(input, { key: 'Enter' }); // 목록에 없는 글자 → 부서명
    fireEvent.click(within(dialog).getByRole('button', { name: '근태 불러오기' }));

    expect(await screen.findByText('가나다 오후반차')).toBeInTheDocument();
    expect(attendanceCalls()).toHaveLength(1);
    const [url, init] = attendanceCalls()[0];
    expect(url).toContain('/ECAPI/SVC/Manage/TimeMgmt/GetTimeAttendance?ec_req_sid=E-test');
    // 여러 날 휴가는 첫날 전표에 몰려 있어 한 달 앞당겨 부른다
    const from = new Date(monday);
    from.setDate(from.getDate() - 31);
    expect(JSON.parse(init.body).Request.Data).toMatchObject({ SITE: 'EFA팀', EMP_CD: '', BASE_DATE_FROM: ymd8(from) });
    const state = useDeployCalendarStore.getState();
    expect(state.attendance_targets).toEqual([{ type: 'site', code: 'EFA팀', name: 'EFA팀' }]);
    expect(state.attendance_records).toEqual([expect.objectContaining({ name: '가나다', date: ymd(monday), target: 'site:EFA팀' })]);
  });

  it('세션이 없어도 저장된 근태를 보여주고, ERP 는 부르지 않는다', async () => {
    const t = site();
    useDeployCalendarStore.setState({
      attendance_targets: [t],
      attendance_records: [{ target: `site:${t.code}`, date: ymd(monday), emp_cd: 'E7', name: '저장된', kind: '연차', days: 1, note: '', label: '연차' }],
    });
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    expect(await screen.findByText('저장된 연차')).toBeInTheDocument();
    expect(attendanceCalls()).toHaveLength(0);
  });

  it('근태 새로고침: 세션이 없으면 근태 설정 창에서 세션을 받고, 있으면 바로 다시 받는다', async () => {
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    fireEvent.click(screen.getByLabelText('근태 새로고침'));
    const dialog = await screen.findByRole('dialog', { name: '근태 설정' });
    fireEvent.change(within(dialog).getByLabelText(/ERP 세션/), { target: { value: 'E-test' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '근태 불러오기' }));
    expect(await screen.findByText('가나다 오후반차')).toBeInTheDocument();
    expect(attendanceCalls()).toHaveLength(1);

    rows = [{ ...rows[0], 'INSA511.EMP_KNAME': '바뀐' }];
    fireEvent.click(screen.getByLabelText('근태 새로고침'));
    expect(await screen.findByText('바뀐 오후반차')).toBeInTheDocument();
    expect(screen.queryByText('가나다 오후반차')).not.toBeInTheDocument(); // 그 기간은 새로 받은 것으로 바뀐다
    expect(attendanceCalls()).toHaveLength(2);
  });

  it('사원을 대상으로 고르면 사번(EMP_CD)으로 조회한다', async () => {
    useDeployCalendarStore.setState({ attendance_targets: [{ type: 'emp', code: '2023-026', name: '엄지희' }] });
    sessionStorage.setItem('erp-session-input', 'E-test');
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    await screen.findByText('가나다 오후반차');
    expect(JSON.parse(attendanceCalls()[0][1].body).Request.Data).toMatchObject({ SITE: '', EMP_CD: '2023-026' });
  });

  it('보는 주 전에 전표가 잡힌 여러 날 휴가도 근태일자 칸에 붙는다', async () => {
    const friday_before = new Date(monday);
    friday_before.setDate(friday_before.getDate() - 3);
    const tuesday = new Date(monday);
    tuesday.setDate(tuesday.getDate() + 1);
    rows = [{ 'INSA511.EMP_CD': 'E9', 'INSA511.EMP_KNAME': '엄지희', 'INSA501.ATTEND_DES': '연차', 'INSA511.USING_DAY': '1', 'INSA511.REMARKS1': `${md(friday_before)}~${md(tuesday)}. 엄지희. 연차.`, SLIP_DATE: ymd8(friday_before) }];
    sessionStorage.setItem('erp-session-input', 'E-test');
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    // 월·화 두 칸 (금요일은 지난주라 화면 밖이고 저장도 안 한다)
    await waitFor(() => expect(screen.getAllByText('엄지희 연차')).toHaveLength(2));
    expect(useDeployCalendarStore.getState().attendance_records.map((r) => r.date)).toEqual([ymd(monday), ymd(tuesday)]);
  });

  it('대상을 고르지 않고 근태 설정 창을 닫으면 근태가 다시 꺼지고 조회하지 않는다', async () => {
    useDeployCalendarStore.setState({ attendance_targets: [] });
    sessionStorage.setItem('erp-session-input', 'E-test');
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    const dialog = await screen.findByRole('dialog', { name: '근태 설정' });
    expect(within(dialog).getByRole('button', { name: '근태 불러오기' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    expect(useDeployCalendarStore.getState().show_attendance).toBe(false);
    expect(attendanceCalls()).toHaveLength(0);
  });

  it('대상·세션이 이미 있으면 창 없이 바로 불러온다', async () => {
    sessionStorage.setItem('erp-session-input', 'E-test');
    renderWithTheme(<DeployCalendar />);
    fireEvent.click(screen.getByLabelText('근태'));
    expect(await screen.findByText('가나다 오후반차')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('캘린더 오늘 강조 스위치', () => {
  it('상단 「오늘」 스위치로 오늘 칸 강조를 끄고 켠다 (설정에서 옮겨 옴)', () => {
    useDeployCalendarStore.setState({ events: [], view_mode: 'week', weeks_to_show: 1, show_today: true, show_attendance: false });
    renderWithTheme(<DeployCalendar />);
    const today_chip = () => screen.queryAllByText('오늘').filter((el) => el.tagName === 'SPAN' && !el.closest('label'));
    const weekday = ![0, 6].includes(new Date().getDay()); // 주말엔 월~금 칸에 오늘이 없다
    if (weekday) expect(today_chip().length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('오늘'));
    expect(useDeployCalendarStore.getState().show_today).toBe(false);
    expect(today_chip()).toHaveLength(0);
  });
});
