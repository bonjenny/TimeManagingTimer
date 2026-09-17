import { NEW_PROJECT_OPTION, filterProjectCodeOptions } from '../../../components/common/projectOptions';

const projects = [
  { code: 'A26_001', name: '로그인 개선' },
  { code: 'A26_002', name: '배포 자동화' },
];
const codes = projects.map((p) => p.code);

describe('filterProjectCodeOptions', () => {
  it('코드와 이름 어느 쪽으로도 찾는다', () => {
    // 치는 중에는 등록 줄이 맨 위에 같이 뜬다
    expect(filterProjectCodeOptions(codes, '002', projects).filter((o) => !o.startsWith(NEW_PROJECT_OPTION)))
      .toEqual(['A26_002']);
    expect(filterProjectCodeOptions(codes, '로그인', projects).filter((o) => !o.startsWith(NEW_PROJECT_OPTION)))
      .toEqual(['A26_001']);
  });

  it('목록에 없는 코드를 치면 등록 줄을 맨 위에 붙인다', () => {
    expect(filterProjectCodeOptions(codes, 'A26_999', projects)[0]).toBe(`${NEW_PROJECT_OPTION}A26_999`);
  });

  it('이미 있는 코드나 이름이면 등록 줄을 붙이지 않는다', () => {
    expect(filterProjectCodeOptions(codes, 'A26_001', projects)).toEqual(['A26_001']);
    // 진행 중 카드는 칸에 이름을 보여주므로 이름이 그대로 들어온다
    expect(filterProjectCodeOptions(codes, '로그인 개선', projects)).toEqual(['A26_001']);
  });

  it('빈 입력이면 전체 목록', () => {
    expect(filterProjectCodeOptions(codes, '', projects)).toEqual(codes);
  });
});
