/**
 * 근태 설정의 조회 대상 칸: 칠 때마다 ERP 부서·사원 검색 → 드롭다운, 여러 개 고르기
 */
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DeployCalendar from '../../../components/pages/DeployCalendar';
import { useDeployCalendarStore } from '../../../store/useDeployCalendarStore';

const mockSearch = jest.fn();
jest.mock('../../../utils/erpAttendance', () => ({
  ...jest.requireActual('../../../utils/erpAttendance'),
  searchAttendanceTargets: (...args: unknown[]) => mockSearch(...args),
  fetchErpAttendance: jest.fn(() => Promise.resolve([])),
}));

const renderCalendar = () => render(<ThemeProvider theme={createTheme()}><DeployCalendar /></ThemeProvider>);

describe('근태 설정 - 부서·사원 검색 드롭다운', () => {
  beforeEach(() => {
    sessionStorage.setItem('erp-session-input', 'E-test');
    useDeployCalendarStore.setState({ events: [], view_mode: 'week', weeks_to_show: 1, show_attendance: false, attendance_targets: [], attendance_records: [] });
    mockSearch.mockReset();
  });

  it('E 만 쳐도 부서·사원을 목록으로 띄우고, 여러 개 골라 저장한다', async () => {
    mockSearch.mockResolvedValue([
      { type: 'site', code: 'EFA팀', name: 'EFA팀', sub: '개발본부 › FE부문' },
      { type: 'emp', code: '2023-026', name: '엄지희', sub: 'EFA팀 선임' },
    ]);
    renderCalendar();
    fireEvent.click(screen.getByLabelText('근태'));
    const dialog = await screen.findByRole('dialog', { name: '근태 설정' });
    const input = within(dialog).getByLabelText('조회 대상 (부서·사원)');
    fireEvent.change(input, { target: { value: 'E' } });

    expect(await screen.findByText('개발본부 › FE부문', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ sid: 'E-test' }), 'E');
    fireEvent.click(screen.getByText('EFA팀 선임')); // 엄지희
    fireEvent.change(input, { target: { value: 'E' } });
    fireEvent.click(await screen.findByText('개발본부 › FE부문', {}, { timeout: 2000 })); // EFA팀
    fireEvent.click(within(dialog).getByRole('button', { name: '근태 불러오기' }));
    expect(useDeployCalendarStore.getState().attendance_targets.map((t) => `${t.type}:${t.code}`)).toEqual(['emp:2023-026', 'site:EFA팀']);
  });

  it('검색 결과가 하나면 고르지 않아도 그 대상으로 저장한다', async () => {
    mockSearch.mockResolvedValue([{ type: 'site', code: 'EFA팀', name: 'EFA팀', sub: '' }]);
    renderCalendar();
    fireEvent.click(screen.getByLabelText('근태'));
    const dialog = await screen.findByRole('dialog', { name: '근태 설정' });
    fireEvent.change(within(dialog).getByLabelText('조회 대상 (부서·사원)'), { target: { value: 'EFA' } });
    await waitFor(() => expect(within(dialog).getByText(/「EFA팀」 도 함께 저장합니다/)).toBeInTheDocument(), { timeout: 2000 });
    fireEvent.click(within(dialog).getByRole('button', { name: '근태 불러오기' }));
    expect(useDeployCalendarStore.getState().attendance_targets).toEqual([{ type: 'site', code: 'EFA팀', name: 'EFA팀', sub: '' }]);
  });
});
