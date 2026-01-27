// 환경변수 접근을 위한 유틸리티
// Jest에서 모킹하기 쉽도록 별도 파일로 분리

// 관리자 비밀번호 가져오기
export const getAdminPassword = (): string => {
  // Vite 환경 (브라우저)
  // @ts-expect-error - import.meta.env is Vite-specific
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PASSWORD) {
    // @ts-expect-error - import.meta.env is Vite-specific
    return import.meta.env.VITE_ADMIN_PASSWORD;
  }
  // 테스트 환경에서는 process.env 사용
  if (typeof process !== 'undefined' && process.env?.VITE_ADMIN_PASSWORD) {
    return process.env.VITE_ADMIN_PASSWORD;
  }
  // 기본값
  return '0000';
};
