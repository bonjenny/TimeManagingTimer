import { convertLogsToTimeManagement } from '../../utils/timeManagementConverter';
import { TimerLog } from '../../store/useTimerStore';

const log = (over: Partial<TimerLog> = {}): TimerLog => {
  const start = new Date(2026, 8, 11, 10, 0, 0).getTime();
  return {
    id: 'l1',
    title: '리소스 배포 확인',
    projectCode: 'A26_04719',
    category: '질의응답',
    note: '태원책임님 회신',
    startTime: start,
    endTime: start + 30 * 60 * 1000,
    status: 'COMPLETED',
    pausedDuration: 0,
    ...over,
  };
};

describe('convertLogsToTimeManagement 비고', () => {
  const convert = (logs: TimerLog[], include_title: boolean) =>
    convertLogsToTimeManagement(logs, '2026-09-11', '작업', {}, {}, include_title);

  it('기본은 타이머에 적은 비고만 넣는다', () => {
    expect(convert([log()], false)[0].note).toBe('태원책임님 회신');
    expect(convert([log({ note: '' })], false)[0].note).toBe('');
  });

  it('작업명 포함을 켜면 "작업명 // 비고", 비고가 없으면 작업명만', () => {
    expect(convert([log()], true)[0].note).toBe('리소스 배포 확인 // 태원책임님 회신');
    expect(convert([log({ note: '' })], true)[0].note).toBe('리소스 배포 확인');
  });
});
