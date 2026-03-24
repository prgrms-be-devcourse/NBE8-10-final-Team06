import client from './client';
import { 
  StoryFeedResponse, 
  StoryDetailResponse, 
  StoryViewResponse,
  StoryCreateRequest,
  StoryCreateResponse
} from '../types/story';
import { RsData } from '../types/common';

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

  // 스토리 단건 조회 및 시청 기록 전송
  recordView: async (storyId: number): Promise<RsData<StoryDetailResponse>> => {
    const res = await client.post<RsData<StoryDetailResponse>>(`/story/${storyId}/view`);
    return res.data;
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
    
    // 백엔드 List<Long> 대응: 같은 키로 여러 번 append
    if (data.taggedUserIds && data.taggedUserIds.length > 0) {
      data.taggedUserIds.forEach(id => formData.append('taggedUserIds', id.toString()));
    }

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
};
