import { syncAuthTokensFromCookies } from './authStorageSync';

/** accessToken JWT 페이로드 디코드(검증 없음). sub 는 백엔드 JwtProvider 가 user id 문자열로 둠. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** accessToken 의 sub 를 본인 user id 로 — useStomp 와 동일하게 쿠키→localStorage 동기화 후 읽음 */
export function readJwtSubAsUserId(): number | null {
  if (typeof localStorage === 'undefined') return null;
  syncAuthTokensFromCookies();
  const raw = localStorage.getItem('accessToken');
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const payload = decodeJwtPayload(raw.trim());
  if (!payload || payload.sub == null) return null;
  const n = Number(payload.sub);
  return Number.isFinite(n) && n > 0 ? n : null;
}
