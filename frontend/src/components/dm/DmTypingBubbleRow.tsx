import React from 'react';
import ProfileAvatar from '../common/ProfileAvatar';
import { DM_BUBBLE_MINE, DM_BUBBLE_PEER } from './dmBubbleStyles';

type Props = {
  text: string;
  /** `computeDmMessageIsMe` 결과와 동일 */
  isMe: boolean;
  /** 상대 입력 중일 때 메시지 행과 맞춘 왼쪽 아바타 */
  peerProfile?: {
    userId: number;
    nickname: string;
    profileImageUrl: string | null;
  } | null;
};

/**
 * 입력 중 표시 — `DmChatMessageRow` 와 동일한 정렬·색·(상대 시) 아바타 열.
 */
export const DmTypingBubbleRow: React.FC<Props> = ({ text, isMe, peerProfile }) => {
  const bubble = isMe ? DM_BUBBLE_MINE : DM_BUBBLE_PEER;
  const showPeerAvatar = !isMe && peerProfile != null;
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
          maxWidth: '78%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: showPeerAvatar ? '10px' : 0,
        }}
      >
        {showPeerAvatar ? (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: '#efefef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ProfileAvatar
              fillContainer
              authorUserId={peerProfile.userId}
              profileImageUrl={peerProfile.profileImageUrl}
              nickname={peerProfile.nickname}
            />
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minWidth: 0,
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
    </div>
  );
};
