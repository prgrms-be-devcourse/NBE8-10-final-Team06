import axios from "axios";

/**
 * Axios / RsData / Spring 검증 오류 등에서 사용자에게 보여줄 문자열을 뽑습니다.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다."
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const msg = (data as { msg?: unknown }).msg;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message.trim();
      const errors = (data as { errors?: unknown }).errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0];
        if (typeof first === "string" && first.trim()) return first.trim();
        if (
          first &&
          typeof first === "object" &&
          "defaultMessage" in first &&
          typeof (first as { defaultMessage: unknown }).defaultMessage === "string"
        ) {
          const dm = (first as { defaultMessage: string }).defaultMessage.trim();
          if (dm) return dm;
        }
      }
    }
    if (error.message && !/^Request failed with status code \d+$/i.test(error.message)) {
      return error.message;
    }
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * HTTP 403 이지만 실제로는 인증·토큰 문제로 세션을 비워야 할 때 true.
 * 일반 권한 부족(리소스 접근 거부)은 false → 전역 로그아웃하지 않음.
 *
 * 백엔드는 가능하면 만료·무효 토큰에 401을 쓰는 것이 권장됩니다.
 */
export function shouldTreat403ResponseAsSessionExpired(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const code = (data as { resultCode?: unknown }).resultCode;
  if (typeof code !== "string") return false;
  const c = code.trim();
  if (!c) return false;
  if (c.startsWith("401")) return true;
  if (/TOKEN|JWT|EXPIRED|UNAUTHORIZED|SESSION|REFRESH/i.test(c)) return true;
  return false;
}
