import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** true면 인증 관련 헤더를 붙이지 않음 (로그인·가입·중복 검사 등 공개 엔드포인트) */
    skipAuth?: boolean;
    /** 401 후 refresh 성공 시 원 요청 1회 재시도 표시 (내부용) */
    _retryAfterRefresh?: boolean;
    /**
     * true면 403 응답을 세션 만료로 보지 않음 (앱 시작 시 /auth/me 로 비로그인 여부만 확인할 때).
     * 백엔드는 익명 접근에 403을 주므로 부트스트랩과 전역 로그아웃 처리를 분리한다.
     */
    skip403SessionHandling?: boolean;
  }
}
