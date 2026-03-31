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
 * localStorage 에 토큰이 없을 때 쿠키(로그인 시 setAuthCookie 로 심어진 값)를 복사합니다.
 * 백엔드는 Authorization 이 없어도 쿠키 accessToken 을 읽지만, 인터셉터는 localStorage 를 쓰므로 맞춰 둡니다.
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
