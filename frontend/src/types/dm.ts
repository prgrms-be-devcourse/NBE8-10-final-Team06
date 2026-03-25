// src/types/dm.ts

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';

export interface DmMessageResponse {
  id: number;
  type: MessageType;
  content: string;
  thumbnail: string | null;
  valid: boolean;
  createdAt: string;
  userId?: number;
  isRead?: boolean; // 프론트엔드 관리용: 읽음 여부
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
  thumbnail?: string;
}

export interface WebSocketEventPayload<T> {
  type: 'message' | 'typing' | 'read' | 'join' | 'leave';
  data?: T;
  roomId?: number;
  userId?: number;
  status?: 'start' | 'stop';
  messageId?: number; // 읽음 처리 시 전달되는 ID
}
