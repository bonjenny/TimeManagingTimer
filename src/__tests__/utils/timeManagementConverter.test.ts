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
  const convert = (logs: TimerLog[], fill_title: boolean) =>
    convertLogsToTimeManagement(logs, '2026-09-11', '작업', {}, {}, fill_title);

  it('타이머에 적은 비고를 넣고, 같은 업무의 비고 여러 건은 줄바꿈으로 이어 붙인다', () => {
    const logs = [log(), log({ id: 'l2', note: '리소스 재배포 확인' }), log({ id: 'l3', note: '태원책임님 회신' })];
    const joined = ['태원책임님 회신', '리소스 재배포 확인'].join('\n');
    expect(convert(logs, false)[0].note).toBe(joined);
    expect(convert(logs, true)[0].note).toBe(joined); // 옵션과 무관
  });

  it('비고가 없는 업무는 기본이 빈칸, 옵션을 켜면 작업명', () => {
    expect(convert([log({ note: '' })], false)[0].note).toBe('');
    expect(convert([log({ note: '' })], true)[0].note).toBe('리소스 배포 확인');
  });
});
