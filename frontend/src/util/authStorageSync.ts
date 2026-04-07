import { getCookie } from './cookies';

function tokenLooksUsable(t: string | null | undefined): t is string {
  return (
    typeof t === 'string' &&
    t.trim() !== '' &&
    t !== 'null' &&
    t !== 'undefined'
  );
}

/**
 * 쿠키(로그인/갱신 시 서버가 심는 값)를 localStorage 에 항상 동기화합니다.
 *
 * ❌ 이전 동작: localStorage 가 비어있을 때만 복사
 * → access token 이 갱신돼도 localStorage 에 만료된 토큰이 남아 STOMP 인증 실패
 *
 * ✅ 수정 동작: 쿠키에 유효한 값이 있으면 항상 localStorage 를 덮어씀
 * → token refresh 후 쿠키가 갱신되면 즉시 localStorage 에 반영
 * → STOMP SEND 헤더도 최신 토큰을 사용해 인증 성공
 */
export function syncAuthTokensFromCookies(): void {
  const accessFromCookie = getCookie('accessToken');
  if (tokenLooksUsable(accessFromCookie)) {
    localStorage.setItem('accessToken', accessFromCookie!);
  }

  const apiKeyFromCookie = getCookie('apiKey');
  if (tokenLooksUsable(apiKeyFromCookie)) {
    localStorage.setItem('apiKey', apiKeyFromCookie!);
  }
}
