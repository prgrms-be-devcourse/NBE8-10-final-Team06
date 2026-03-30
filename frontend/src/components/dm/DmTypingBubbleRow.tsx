import React from 'react';
import { DM_BUBBLE_MINE, DM_BUBBLE_PEER } from './dmBubbleStyles';

type Props = {
  text: string;
  /** 메시지 행과 동일 — 렌더 직전 `computeDmMessageIsMe({ senderId }, myUserIdNum, ctx)` 결과 */
  isMe: boolean;
};

/**
 * 입력 중 표시 — `DmChatMessageRow` 텍스트 말풍선과 동일한 정렬·색(isMe).
 */
export const DmTypingBubbleRow: React.FC<Props> = ({ text, isMe }) => {
  const bubble = isMe ? DM_BUBBLE_MINE : DM_BUBBLE_PEER;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isMe ? '내가 입력 중' : '상대방 입력 중'}
      style={{
        display: 'flex',
        width: '100%',
        flexShrink: 0,
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMe ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            flexDirection: isMe ? 'row' : 'row-reverse',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '22px',
              fontSize: '0.95rem',
              wordBreak: 'break-word',
              fontStyle: 'italic',
              opacity: isMe ? 0.95 : 0.92,
              ...bubble,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
};
