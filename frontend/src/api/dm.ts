// src/api/dm.ts
import client from './client';
import { RsData } from '../types/common';
import { 
  DmRoomSummaryResponse, 
  DmMessageSliceResponse,
  DmCreate1v1WithRoomListResponse,
  DmCreateGroupWithRoomListResponse 
} from '../types/dm';

export const dmApi = {
  // 내 채팅방 목록 조회
  getRooms: () => 
    client.get<RsData<DmRoomSummaryResponse[]>>('/dm/rooms').then(res => res.data),

  // 메시지 이력 조회 (Cursor 페이징)
  getMessages: (roomId: number, cursor?: number, size: number = 15) => {
    const params = new URLSearchParams();
    if (cursor !== undefined && cursor !== null) {
      params.append('cursor', String(cursor));
    }
    params.append('size', size.toString());
    
    return client.get<RsData<DmMessageSliceResponse>>(`/dm/rooms/${roomId}/messages?${params.toString()}`)
      .then(res => res.data);
  },

  // 1:1 채팅방 생성
  create1v1Room: (otherUserId: number) => 
    client.post<RsData<DmCreate1v1WithRoomListResponse>>(`/dm/rooms/1v1/${otherUserId}`).then(res => res.data),

  // 그룹 채팅방 생성 (서버는 name 필수 — 호출부에서 비어 있지 않은 문자열 전달)
  createGroupRoom: (userIds: number[], name: string) =>
    client.post<RsData<DmCreateGroupWithRoomListResponse>>('/dm/rooms/group', { userIds, name }).then(res => res.data),

  // 1:1 채팅방 나가기 (방 삭제)
  leave1v1Room: (roomId: number) =>
    client.delete<RsData<string>>(`/dm/rooms/1v1/${roomId}`).then(res => res.data),

  // 그룹 채팅방 나가기
  leaveGroupRoom: (roomId: number) =>
    client.delete<RsData<string>>(`/dm/rooms/group/${roomId}`).then(res => res.data),

  // DM 이미지 전송 (multipart upload → IMAGE 타입 메시지 저장 + WS 브로드캐스트)
  sendImage: (roomId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return client
      .post<RsData<import('../types/dm').DmMessageResponse>>(`/dm/rooms/${roomId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
};
