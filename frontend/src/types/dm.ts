// src/types/dm.ts

export type MessageType = 'TEXT' | 'POST' | 'STORY' | 'IMAGE' | 'SYSTEM';

export interface DmMessageResponse {
  id: number;
  type: MessageType;
  content: string;
  thumbnail: string | null;
  valid: boolean;
  createdAt: string;
  senderId: number; // 백엔드 기준: senderId
}

export interface DmRoomParticipantSummary {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface DmRoomSummaryResponse {
  roomId: number;
  roomName: string;
  isGroup: boolean;
  lastMessage: DmMessageResponse | null;
  joinedAt: string;
  participants: DmRoomParticipantSummary[];
  unreadCount: number;
}

export interface DmMessageSliceResponse {
  messages: DmMessageResponse[];
  nextCursor: number | null;
  hasNext: boolean;
}

export interface DmSendMessageRequest {
  type: MessageType;
  content: string;
  thumbnail?: string | null;
}

export interface DmCreate1v1WithRoomListResponse {
  roomId: number;
  rooms: DmRoomSummaryResponse[];
}

export interface DmCreateGroupWithRoomListResponse {
  roomId: number;
  rooms: DmRoomSummaryResponse[];
}

export interface WebSocketEventPayload<T> {
  type: 'message' | 'typing' | 'read' | 'join' | 'leave';
  /** `message` 는 서버가 항상 채움. `typing`/`read` 는 백엔드가 평면 필드만 보낼 수 있어 선택적 */
  data?: T;
}

export interface TypingWsPayload {
  roomId: number;
  userId: number;
  status: 'start' | 'stop';
}

export interface ReadWsPayload {
  messageId: number;
}

export interface JoinLeaveWsPayload {
  roomId: number;
  userId: number;
}
