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
 * localStorage 에 토큰이 없을 때 쿠키에서 accessToken 을 복사합니다.
 * HTTP 는 `CustomAuthenticationFilter` 가 쿠키를 읽고, STOMP 는 CONNECT/SEND 의 Bearer 헤더가 필요해
 * `useStomp` 가 같은 문자열을 쓸 수 있도록 맞춥니다.
 */
export function syncAuthTokensFromCookies(): void {
  if (!tokenLooksUsable(localStorage.getItem('accessToken'))) {
    const fromCookie = getCookie('accessToken');
    if (tokenLooksUsable(fromCookie)) {
      localStorage.setItem('accessToken', fromCookie);
    }
  }

  const lsKey = localStorage.getItem('apiKey');
  if (!tokenLooksUsable(lsKey)) {
    const fromCookie = getCookie('apiKey');
    if (tokenLooksUsable(fromCookie)) {
      localStorage.setItem('apiKey', fromCookie);
    }
  }
}
