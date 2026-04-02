/**
 * SockJS STOMP 엔드포인트 URL.
 * - 프로덕션: 보통 프론트와 동일 오리진 → 상대 경로 `/ws`.
 * - 개발(Vite 3000): 상대 `/ws`만 쓰면 프록시 WebSocket 업그레이드가 불안정해 연결이 닫히는 경우가 있어
 *   기본값으로 백엔드 오리진(`VITE_STOMP_SOCKJS_URL` 또는 `http://localhost:8080/ws`)을 쓴다.
 */
export function resolveSockJsStompUrl(relativePath: string): string {
  const fromEnv = (import.meta.env.VITE_STOMP_SOCKJS_URL as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV && relativePath.startsWith('/')) {
    const apiOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim();
    const origin = apiOrigin?.replace(/\/$/, '') ?? 'http://localhost:8080';
    return `${origin}${relativePath}`;
  }
  return relativePath;
}
