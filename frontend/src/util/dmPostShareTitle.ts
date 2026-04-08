import { postApi } from '../api/post';
import { isRsSuccess } from './rsData';

/** 값 `''` 는 조회 실패(삭제 등) 캐시 */
const titleCache = new Map<number, string>();

/**
 * DM 공유 카드용 게시글 제목 — 동일 postId 는 캐시해 중복 요청을 줄인다.
 */
export async function getDmPostShareTitle(postId: number): Promise<string | null> {
  if (!Number.isFinite(postId) || postId <= 0) return null;
  if (titleCache.has(postId)) {
    const hit = titleCache.get(postId)!;
    return hit === '' ? null : hit;
  }
  try {
    const res = await postApi.getDetail(postId);
    if (isRsSuccess(res.resultCode) && res.data?.title != null) {
      const t = String(res.data.title).trim();
      titleCache.set(postId, t);
      return t || null;
    }
  } catch {
    /* 삭제·권한 등 */
  }
  titleCache.set(postId, '');
  return null;
}
