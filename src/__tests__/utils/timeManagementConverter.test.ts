import { convertLogsToTimeManagement, parsePastedRows } from '../../utils/timeManagementConverter';
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

describe('parsePastedRows (웹자료 올리기)', () => {
  const projects = [{ code: 'A26_00413', name: '테스트 프로젝트' }];
  const parse = (text: string) => parsePastedRows(text, '2026-10-27', projects, '작업', ['작업', '개발']);

  it('엑셀 Export 머리줄·합계줄을 알아보고, 줄바꿈 든 비고("...")를 한 칸으로 읽는다', () => {
    const text = [
      '작업\t업무형\t거래형(일정명)\t카테고리 코드\t카테고리명\t시간(분)\t종료예정일\t비고',
      'A26_00413\t개발\t조사\t17\t분석\t60\t2026.11.3\t"첫 줄\n둘째 줄"',
      '\t\t\t\t합계\t60\t\t',
    ].join('\r\n');
    const rows = parse(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ project_name: 'A26_00413', work_type: '개발', category_code: '17', time_minutes: 60, end_date: '2026-11-03', note: '첫 줄\n둘째 줄', date: '2026-10-27' });
  });

  it('머리줄이 없으면 표 열 순서. 모르는 업무형은 기본값, 카테고리는 이름만 있어도 코드로', () => {
    const [row] = parse('없는작업\t뭐지\t회의\t\t분석\t30');
    expect(row).toMatchObject({ project_name: '없는작업', work_type: '작업', category_code: '17', end_date: '2026-10-27' });
  });

  it('카테고리가 없으면 기타(9999)', () => {
    expect(parse('-\t작업\t잡일')[0]).toMatchObject({ project_name: '', category_code: '9999', category_name: '기타' });
  });
});
