import type { UserProfileResponse } from '../types/user';

/**
 * 프로필 헤더의 게시물 수 표시.
 * 서버 `postCount`가 0으로만 오는 경우(역정규화 미반영·시드 등)에도 `posts` 슬라이스로 보정한다.
 * Slice에는 총개수가 없을 수 있어, 다음 페이지가 있으면 `N+` 형태로 최소값을 표시한다.
 */
export function getProfilePostCountLabel(profile: UserProfileResponse | null | undefined): string {
  if (!profile) return '0';

  const raw = profile.postCount;
  const api =
    typeof raw === 'number' && Number.isFinite(raw) ? raw : Number(raw);
  const safeApi = Number.isFinite(api) && api >= 0 ? api : 0;

  const posts = profile.posts as UserProfileResponse['posts'] & { totalElements?: number };
  if (typeof posts?.totalElements === 'number' && posts.totalElements >= 0) {
    return String(posts.totalElements);
  }

  const len = posts?.content?.length ?? 0;
  const isLast = posts?.last === true;

  if (safeApi > 0) return String(safeApi);
  if (len === 0) return '0';
  if (isLast) return String(len);
  return `${len}+`;
}
