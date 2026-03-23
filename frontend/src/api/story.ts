import client from './client';
import { RsData } from '../types/common';
import { 
  StoryCreateRequest, StoryCreateResponse, StoryFeedResponse, 
  StoryDetailResponse, StoryViewResponse 
} from '../types/story';

export const storyApi = {
  // 스토리 생성
  createStory: async (data: StoryCreateRequest): Promise<RsData<StoryCreateResponse>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.content) formData.append('content', data.content);
    if (data.tagUserIds) {
      data.tagUserIds.forEach((id) => formData.append('tagUserIds', id.toString()));
    }
    formData.append('mediaType', data.mediaType);
    if (data.thumbnailUrl) formData.append('thumbnailUrl', data.thumbnailUrl);

    const response = await client.post<RsData<StoryCreateResponse>>('/story', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 홈 피드 조회
  getFeed: async (): Promise<RsData<StoryFeedResponse[]>> => {
    const response = await client.get<RsData<StoryFeedResponse[]>>('/story/feed');
    return response.data;
  },

  // 특정 유저 스토리 목록 조회
  getUserStories: async (userId: number): Promise<RsData<StoryDetailResponse[]>> => {
    const response = await client.get<RsData<StoryDetailResponse[]>>(`/story/user/${userId}`);
    return response.data;
  },

  // 스토리 시청 기록 (상세 조회)
  recordView: async (storyId: number): Promise<RsData<StoryDetailResponse>> => {
    const response = await client.post<RsData<StoryDetailResponse>>(`/story/${storyId}/view`);
    return response.data;
  },

  // 스토리 좋아요
  likeStory: async (storyId: number): Promise<RsData<StoryViewResponse>> => {
    const response = await client.post<RsData<StoryViewResponse>>(`/story/${storyId}/like`);
    return response.data;
  }
};
