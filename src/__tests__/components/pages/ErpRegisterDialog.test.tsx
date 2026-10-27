import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErpRegisterDialog from '../../../components/pages/ErpRegisterDialog';
import type { TimeManagementRow } from '../../../store/useTimeManagementStore';
import * as erp from '../../../utils/erpTimelog';

const row = (date: string): TimeManagementRow => ({
  id: date, checked: false, project_name: 'A26_04719', work_type: '작업', schedule_name: '일정',
  category_code: '10', category_name: '질의응답', time_minutes: 10, note: '', date,
});

describe('ErpRegisterDialog', () => {
  beforeEach(() => {
    sessionStorage.setItem('erp-session-input', 'https://logine.ecount.com/ec56/view/erp?ec_req_sid=E-TEST');
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(erp, 'postErpTimelog').mockResolvedValue({ ok: true, status: 200, message: '저장 완료: 시간 로그 1번' } as erp.ErpPostResult);
  });
  afterEach(() => jest.restoreAllMocks());

  it('저장한 날은 다시 못 누르고, 다른 날짜로 바꾸면 새로고침 없이 다시 저장할 수 있다', async () => {
    const { rerender } = render(<ErpRegisterDialog open onClose={() => {}} rows={[row('2026-10-22')]} date="2026-10-22" />);
    const save = () => screen.getByRole('button', { name: /ERP에 저장/ });
    fireEvent.click(save());
    await waitFor(() => expect(save()).toBeDisabled());

    rerender(<ErpRegisterDialog open onClose={() => {}} rows={[row('2026-10-23')]} date="2026-10-23" />);
    await waitFor(() => expect(save()).not.toBeDisabled());
  });
});
