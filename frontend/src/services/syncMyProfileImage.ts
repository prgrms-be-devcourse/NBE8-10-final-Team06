import { userApi } from '../api/user';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileImageCacheStore } from '../store/useProfileImageCacheStore';

let inFlight: Promise<void> | null = null;
let syncGeneration = 0;

function isOk(code: string | undefined) {
  return !!code && (code.startsWith('200') || code.includes('-S-'));
}

export type SyncMyProfileImageOptions = {
  /**
   * true면 진행 중인 동기화를 기다린 뒤 반드시 한 번 더 조회합니다.
   * 프로필 저장 직후 이전 inFlight가 옛 URL로 세션을 덮어쓰는 레이스를 막습니다.
   */
  force?: boolean;
  /** 프로필 이미지 URL 조회에 사용할 닉네임(닉네임 변경 직후 스토어 반영 전에 사용) */
  nicknameOverride?: string;
};

/**
 * 프로필 페이지와 동일한 GET /users/{nickname}/profile 로 내 프로필 이미지 URL을 세션에 맞춤.
 * 스토리 피드·게시물 헤더·스토리바가 서로 다른 필드(me/feed/post)를 쓰는 문제를 줄입니다.
 */
export function syncMyProfileImageFromUserApi(options?: SyncMyProfileImageOptions): Promise<void> {
  const force = options?.force === true;

  if (inFlight && !force) {
    return inFlight;
  }

  const run = (async () => {
    if (force && inFlight) {
      try {
        await inFlight;
      } catch {
        /* 이전 동기화 실패는 무시 */
      }
    }

    const gen = ++syncGeneration;
    const { isLoggedIn, nickname, setSessionProfileImageUrl } = useAuthStore.getState();
    const nick = (options?.nicknameOverride ?? nickname)?.trim();
    if (!isLoggedIn || !nick) return;

    try {
      const res = await userApi.getProfile(nick, 0);
      if (gen !== syncGeneration) return;
      if (!isOk(res.resultCode) || !res.data) return;
      const raw = res.data.profileImageUrl ?? null;
      let next = raw;
      if (force && raw) {
        const sep = raw.includes('?') ? '&' : '?';
        next = `${raw}${sep}v=${Date.now()}`;
      }
      setSessionProfileImageUrl(next);
      const uid = res.data.userId;
      if (uid != null && Number.isFinite(Number(uid))) {
        useProfileImageCacheStore.getState().setAuthoritativeProfileImage(Number(uid), next);
      }
    } catch {
      /* 네트워크 오류는 무시 */
    }
  })();

  inFlight = run.finally(() => {
    if (inFlight === run) inFlight = null;
  });

  return inFlight;
}
