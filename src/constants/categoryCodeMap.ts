// ECOUNT ERP "일정관리-카테고리조회" 목록 그대로 (2026-09-14 기준). 코드가 ERP 카테고리 코드와 1:1.
export const CATEGORY_CODE_MAP: Record<string, string> = {
  '05': '회의',
  '06': '평가',
  '07': '팀장업무',
  '08': '모니터링',
  '09': '이슈처리',
  '10': '질의응답',
  '11': '문서작업',
  '12': '설계',
  '13': '개발',
  '14': '테스트',
  '15': '스테이지/7번/정상화',
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
  '31': '테스트 데이터 세팅',
  '32': '테스트/배포 준비',
  '101': '검증',
  '102': '견적및구매',
  '103': '긴급대응',
  '104': '보정',
  '105': '서버실작업',
  '106': '튜닝',
  '107': '요청처리',
  '108': '정기점검',
  '109': '작업',
  '110': '이관',
  '513': '피드백',
  '901': '니즈분석',
  '902': '데이터분석',
  '903': 'as-is 분석',
  '904': '이슈발생여부 검토',
  '905': '결정사항 적용',
  '906': '방향기획',
  '907': '상세기획',
  '908': '문서정리',
  '931': '개발이슈반영 기획변경',
  '932': '요청내용 추가정리',
  '933': '기획질문답변',
  '934': '기획테스트',
  '935': '기획검수',
  '936': '기획보완',
  '951': '일정관리',
  '952': '개인담당업무',
  '999': '감사',
  '9999': '기타',
};

// 예전 앱 목록에 있던 이름 → ERP 코드. 이미 기록된 로그/행이 계속 올바른 코드로 변환되도록 유지.
const LEGACY_NAME_TO_CODE: Record<string, string> = {
  탐색업무: '07',
  '스테이지/7단/정상화': '15',
  견적일괄구매: '102',
  서버설치업: '105',
  투남: '106',
};

export const CATEGORY_NAME_TO_CODE_MAP: Record<string, string> = Object.entries(
  CATEGORY_CODE_MAP
).reduce((acc, [code, name]) => {
  acc[name] = code;
  return acc;
}, { ...LEGACY_NAME_TO_CODE } as Record<string, string>);

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
