/**
 * DM 타이핑 — 백엔드 `DmWebSocketController.TYPING_IDLE_MS`(3000ms) 와 맞춤.
 * 클라이언트는 이 간격보다 짧게 `start` 를 재전송해 연속 입력 중 서버가 조기 `stop` 을 브로드캐스트하지 않게 한다.
 */
export const DM_SERVER_TYPING_IDLE_MS = 3000;
/** 마지막 `start` 이후 이만큼 지나면 다시 `start` 로 서버 타이머 리셋 */
export const DM_CLIENT_TYPING_START_REFRESH_MS = 2000;
/** 입력 멈춤 후 로컬에서 `stop` 을 보내는 지연 (서버 자동 stop 보다 약간 빠르게 끊고 싶을 때) */
export const DM_CLIENT_TYPING_STOP_AFTER_IDLE_MS = 2000;
