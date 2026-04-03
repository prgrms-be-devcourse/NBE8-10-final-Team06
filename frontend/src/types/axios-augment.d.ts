import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** true면 인증 관련 헤더를 붙이지 않음 (로그인·가입·중복 검사 등 공개 엔드포인트) */
    skipAuth?: boolean;
    /** 401 후 refresh 성공 시 원 요청 1회 재시도 표시 (내부용) */
    _retryAfterRefresh?: boolean;
  }
}
