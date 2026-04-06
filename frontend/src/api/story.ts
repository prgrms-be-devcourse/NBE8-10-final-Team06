// src/api/story.ts
import client from './client';
import { 
  StoryFeedResponse, 
  StoryDetailResponse, 
  StoryViewResponse,
  StoryCreateRequest,
  StoryCreateResponse
} from '../types/story';
import { RsData } from '../types/common';
import { appendOptionalFormField } from '../util/formDataParts';

export const storyApi = {
  // 스토리 피드(홈 바) 조회
  getFeed: async (): Promise<RsData<StoryFeedResponse[]>> => {
    const res = await client.get<RsData<StoryFeedResponse[]>>('/story/feed');
    return res.data;
  },

  // 특정 유저의 활성화된 스토리 목록 조회
  getUserStories: async (targetUserId: number): Promise<RsData<StoryDetailResponse[]>> => {
    const res = await client.get<RsData<StoryDetailResponse[]>>(`/story/user/${targetUserId}`);
    return res.data;
  },

  /**
   * 스토리 단건 시청 기록 — 백엔드 필수 쿼리 `targetUserId`(스토리 작성자 user id).
   * 하드삭제된 스토리 등 분기 시 서버가 targetUserId로 탈퇴/삭제 응답을 구분함.
   */
  recordView: async (storyId: number, targetUserId: number): Promise<RsData<StoryDetailResponse>> => {
    const res = await client.post<RsData<StoryDetailResponse>>(`/story/${storyId}/view`, null, {
      params: { targetUserId },
    });
    return res.data;
  },

  /** 시청 기록 전송(베스트 에포트). 실패해도 예외 없음 — 뷰어 재생 흐름용. */
  recordViewSafe: async (storyId: number, targetUserId: number): Promise<void> => {
    try {
      await client.post<RsData<StoryDetailResponse>>(`/story/${storyId}/view`, null, {
        params: { targetUserId },
      });
    } catch {
      /* 백엔드 5xx 등 */
    }
  },

  // 스토리 좋아요 토글
  toggleLike: async (storyId: number): Promise<RsData<StoryViewResponse>> => {
    const res = await client.post<RsData<StoryViewResponse>>(`/story/${storyId}/like`);
    return res.data;
  },

  // 스토리 생성 (Multipart)
  createStory: async (data: StoryCreateRequest): Promise<RsData<StoryCreateResponse>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.content) formData.append('content', data.content);
    formData.append('mediaType', data.mediaType);
    
    if (data.tagUserIds && data.tagUserIds.length > 0) {
      data.tagUserIds.forEach((id) => formData.append('tagUserIds', id.toString()));
    }
    appendOptionalFormField(formData, 'thumbnailUrl', data.thumbnailUrl);

    const res = await client.post<RsData<StoryCreateResponse>>('/story', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // 내 아카이브(만료된 스토리) 조회
  getArchive: async (): Promise<RsData<StoryDetailResponse[]>> => {
    const res = await client.get<RsData<StoryDetailResponse[]>>('/story/archive');
    return res.data;
  },

  // 스토리 소프트 삭제 (PATCH /api/story/{storyId}/soft-delete)
  softDelete: async (storyId: number): Promise<RsData<void>> => {
    const res = await client.patch<RsData<void>>(`/story/${storyId}/soft-delete`);
    return res.data;
  },

  /**
   * 스토리 영구 삭제 — 본인만 가능. 미디어가 http(s) 외부 URL이면 스토리지만 제거하고 파일 삭제는 건너뜀(백엔드).
   */
  hardDelete: async (storyId: number): Promise<RsData<void>> => {
    const res = await client.delete<RsData<void>>(`/story/${storyId}/hard-delete`);
    return res.data;
  },
};
