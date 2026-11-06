import { buildWidgetSnapshot } from '../../utils/widgetSnapshot';

describe('바탕화면 위젯 스냅숏', () => {
  const base = {
    events: [
      { id: '1', date: '2026-11-03', job_code: 'A26_1', job_name: '브라우저 PDF', status: '수시', is_holiday: false },
      { id: '2', date: '2026-11-04', job_code: '', job_name: '창립기념일', status: '', is_holiday: true },
    ],
    job_colors: [{ job_code: 'A26_1', color: '#f8bbd0' }],
    show_today: true,
    show_attendance: true,
    attendance_targets: [{ type: 'site' as const, code: 'EFA팀', name: 'EFA팀' }],
    attendance_records: [
      { target: 'site:EFA팀', date: '2026-11-06', emp_cd: 'E1', name: '이용희', kind: '연차', days: 0.6, note: '', label: '오후반차' },
      { target: 'site:빠진팀', date: '2026-11-06', emp_cd: 'E2', name: '빠진사람', kind: '연차', days: 1, note: '', label: '연차' },
    ],
  };

  it('일정은 「이름 상태」 와 잡 색으로, 휴일은 빨간 글씨 표시로, 근태는 고른 대상만', () => {
    const snap = buildWidgetSnapshot(base, 123);
    expect(snap.events).toEqual([
      { date: '2026-11-03', text: '브라우저 PDF 수시', color: '#f8bbd0' },
      { date: '2026-11-04', text: '창립기념일', holiday: true },
    ]);
    expect(snap.attendance).toEqual([{ date: '2026-11-06', text: '이용희 오후반차' }]);
    expect(snap).toMatchObject({ version: 1, updated_at: 123, show_today: true });
    expect(snap.holidays['2026-09-25']).toBe('추석');
  });

  it('캘린더에서 근태를 꺼 두면 근태는 넘기지 않는다', () => {
    expect(buildWidgetSnapshot({ ...base, show_attendance: false }).attendance).toEqual([]);
  });
});
