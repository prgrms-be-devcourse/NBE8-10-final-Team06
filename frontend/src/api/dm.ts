import client from './client';
import { RsData } from '../types/common';
import { DmRoomSummaryResponse, DmMessageSliceResponse } from '../types/dm';

export const dmApi = {
  // 1:1 채팅방 생성/재사용 (백엔드 경로: /api/dm/rooms/1v1/{otherUserId})
  create1v1Room: async (otherUserId: number) => {
    const response = await client.post(`/dm/rooms/1v1/${otherUserId}`);
    return response.data;
  },

  // 참여 중인 채팅방 목록 조회 (백엔드 경로: /api/dm/rooms)
  getRooms: async (): Promise<RsData<DmRoomSummaryResponse[]>> => {
    const response = await client.get<RsData<DmRoomSummaryResponse[]>>('/dm/rooms');
    return response.data;
  },

  // 메시지 조회 (백엔드 파라미터: cursor, size)
  getMessages: async (roomId: number, cursor?: number, size: number = 10): Promise<RsData<DmMessageSliceResponse>> => {
    const response = await client.get<RsData<DmMessageSliceResponse>>(`/dm/rooms/${roomId}/messages`, {
      params: { cursor, size }
    });
    return response.data;
  }
};
