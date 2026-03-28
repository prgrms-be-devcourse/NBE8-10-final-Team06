import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** true면 Authorization·X-API-KEY를 붙이지 않음 (로그인·가입·중복 검사 등 공개 엔드포인트) */
    skipAuth?: boolean;
  }
}
