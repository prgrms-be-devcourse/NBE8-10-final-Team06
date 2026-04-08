import { postApi } from '../api/post';
import { storyApi } from '../api/story';
import type { PostDetailResponse } from '../types/post';
import type { StoryDetailResponse } from '../types/story';
import { isRsSuccess } from './rsData';

/** `''` = 조회했으나 없음(캐시) */
const postThumbCache = new Map<number, string>();
const storyThumbCache = new Map<string, string>();

const AUTHOR_ACTIVE_STORIES_TTL_MS = 30_000;
const authorActiveStoriesCache = new Map<number, { list: StoryDetailResponse[]; fetchedAt: number }>();

/** 작성자 활성 스토리 목록 — DM 카드 여러 개가 같은 작성자를 쓸 때 API 1회로 묶음 */
async function fetchActiveStoriesForAuthor(authorUserId: number): Promise<StoryDetailResponse[] | null> {
  if (!Number.isFinite(authorUserId) || authorUserId <= 0) return null;
  const now = Date.now();
  const hit = authorActiveStoriesCache.get(authorUserId);
  if (hit && now - hit.fetchedAt < AUTHOR_ACTIVE_STORIES_TTL_MS) return hit.list;
  try {
    const res = await storyApi.getUserStories(authorUserId);
    if (!isRsSuccess(res.resultCode) || !Array.isArray(res.data)) return null;
    authorActiveStoriesCache.set(authorUserId, { list: res.data, fetchedAt: now });
    return res.data;
  } catch {
    return null;
  }
}

/**
 * 서버 활성 스토리 목록에 해당 id 가 있는지 확인.
 * `null` = 조회 실패·권한 등으로 판단 불가(만료 UI로 강제하지 않음), `false` = 목록에 없음(만료·삭제 등).
 */
export async function isDmSharedStoryActiveOnServer(
  storyId: number,
  authorUserId: number
): Promise<boolean | null> {
  if (!Number.isFinite(storyId) || storyId <= 0) return null;
  if (!Number.isFinite(authorUserId) || authorUserId <= 0) return null;
  const list = await fetchActiveStoriesForAuthor(authorUserId);
  if (list == null) return null;
  return list.some((s) => Number(s.storyId) === storyId);
}

function pickPostCoverUrl(data: PostDetailResponse & { thumbnailUrl?: string | null }): string | null {
  const explicit = typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl.trim() : '';
  if (explicit) return explicit;
  const medias = data.medias;
  if (!Array.isArray(medias) || medias.length === 0) return null;
  const sorted = [...medias].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const first = sorted[0]?.sourceUrl;
  const u = typeof first === 'string' ? first.trim() : '';
  return u || null;
}

/**
 * DM 공유 카드용 게시글 썸네일 — 서버 `thumbnail` 이 비었을 때 상세·첫 미디어로 보강.
 */
export async function getDmPostShareThumbnailUrl(postId: number): Promise<string | null> {
  if (!Number.isFinite(postId) || postId <= 0) return null;
  if (postThumbCache.has(postId)) {
    const hit = postThumbCache.get(postId)!;
    return hit === '' ? null : hit;
  }
  try {
    const res = await postApi.getDetail(postId);
    if (isRsSuccess(res.resultCode) && res.data) {
      const url = pickPostCoverUrl(res.data);
      if (url) {
        postThumbCache.set(postId, url);
        return url;
      }
    }
  } catch {
    /* 삭제·권한 등 */
  }
  postThumbCache.set(postId, '');
  return null;
}

/**
 * DM 공유 카드용 스토리 미디어 URL — 서버가 STORY 타입에 썸네일을 안 넣는 경우 대비.
 * `u=` 작성자 id 가 없으면 호출하지 않는 것이 좋다.
 */
export async function getDmStoryShareThumbnailUrl(
  storyId: number,
  authorUserId: number
): Promise<string | null> {
  if (!Number.isFinite(storyId) || storyId <= 0) return null;
  if (!Number.isFinite(authorUserId) || authorUserId <= 0) return null;
  const key = `${storyId}:${authorUserId}`;
  if (storyThumbCache.has(key)) {
    const hit = storyThumbCache.get(key)!;
    return hit === '' ? null : hit;
  }
  const list = await fetchActiveStoriesForAuthor(authorUserId);
  if (!list) {
    storyThumbCache.set(key, '');
    return null;
  }
  const story = list.find((s) => Number(s.storyId) === storyId);
  const url = typeof story?.mediaUrl === 'string' ? story.mediaUrl.trim() : '';
  if (url) {
    storyThumbCache.set(key, url);
    return url;
  }
  storyThumbCache.set(key, '');
  return null;
}
