// src/types/dm.ts
export type MessageType = 'TALK' | 'ENTER' | 'LEAVE';

export interface DmMessageResponse {
  id: number;
  type: MessageType;
  content: string;
  thumbnail: string | null;
  valid: boolean;
  createdAt: string; // LocalDateTime
  senderId?: number; // 백엔드 DTO에 없으므로 옵셔널 처리 (추후 백엔드 수정 권고)
}

export interface DmRoomParticipantSummary {
  userId: number;
  nickname: string;
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

// 백엔드 DmWebSocketController 내의 각 record 구조와 100% 일치
export type WebSocketEvent = 
  | { type: 'message'; data: DmMessageResponse }
  | { type: 'typing'; roomId: number; userId: number; status: 'start' | 'stop' }
  | { type: 'read'; messageId: number }
  | { type: 'join'; roomId: number; userId: number }
  | { type: 'leave'; roomId: number; userId: number };

export interface DmSendMessageRequest {
  content: string;
}

export interface TypingEventDto {
  userId: number;
  status: 'start' | 'stop';
}
