export const CATEGORY_CODE_MAP: Record<string, string> = {
  '01': '기획',
  '02': '기획테스트',
  '03': '기획검수',
  '04': '상세기획',
  '05': '회의',
  '06': '평가',
  '07': '탐색업무',
  '08': '모니터링',
  '09': '이슈처리',
  '10': '질의응답',
  '11': '문서작업',
  '12': '설계',
  '13': '개발',
  '14': '테스트',
  '15': '스테이지/7단/정상화',
  '16': '테스트케이스',
  '17': '분석',
  '18': '환경세팅',
  '19': '테스트오류수정',
  '20': '센터오류수정',
  '21': '배포',
  '22': '개발자테스트',
  '23': '고객문의분석',
  '24': '교육',
  '25': '디자인 분석/지원',
  '26': '면접',
  '27': '개발지원',
  '28': '센터오류지원',
  '29': '테스트지원',
  '30': '기타보완',
  '31': '테스트 데이터 세팅',
  '32': '테스트/배포 준비',
  '101': '검증',
  '102': '견적일괄구매',
  '103': '긴급대응',
  '104': '보정',
  '105': '서버설치업',
  '106': '투남',
  '107': '요청처리',
  '108': '정기점검',
  '109': '작업',
  '513': '피드백',
  '9999': '기타',
};

export const CATEGORY_NAME_TO_CODE_MAP: Record<string, string> = Object.entries(
  CATEGORY_CODE_MAP
).reduce((acc, [code, name]) => {
  acc[name] = code;
  return acc;
}, {} as Record<string, string>);

export function getCategoryName(code: string): string {
  return CATEGORY_CODE_MAP[code] || '';
}

export function getCategoryCode(name: string): string {
  return CATEGORY_NAME_TO_CODE_MAP[name] || name;
}

export function getAllCategoryCodes(): string[] {
  return Object.keys(CATEGORY_CODE_MAP).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });
}

export function getAllCategoryNames(): string[] {
  return Object.values(CATEGORY_CODE_MAP);
}
