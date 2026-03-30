import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, PlayCircle, AlertCircle } from 'lucide-react';
import { storyApi } from '../../api/story';
import type { DmMessageResponse } from '../../types/dm';
import { resolveDmAttachment } from '../../util/dmAttachment';
import { DM_BUBBLE_MINE, DM_BUBBLE_PEER } from './dmBubbleStyles';

const checkIsExpired = (content: string, type: string) => {
  if (type !== 'STORY') return false;
  const match = content.match(/v=(\d+)/);
  if (!match) return false;
  const createdTime = parseInt(match[1]);
  const now = Date.now();
  const createdMillis = createdTime < 10000000000 ? createdTime * 1000 : createdTime;
  return now - createdMillis > 24 * 60 * 60 * 1000;
};

const AttachmentCard = ({
  type,
  isValid,
  isMe,
  onClick,
}: {
  type: 'post' | 'story';
  isValid: boolean;
  isMe: boolean;
  onClick: () => void;
}) => {
  const isExpired = !isValid;
  const frameBorder = isMe ? '2px solid #0095f6' : '1px solid #d8d8d8';
  const frameBg = isExpired ? '#f0f0f0' : isMe ? '#f0f8ff' : '#fafafa';
  return (
    <div
      onClick={isExpired ? undefined : onClick}
      style={{
        width: '240px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: frameBorder,
        cursor: isExpired ? 'default' : 'pointer',
        backgroundColor: frameBg,
        marginTop: '5px',
        opacity: isExpired ? 0.6 : 1,
        position: 'relative',
      }}
    >
      <div
        style={{
          height: '140px',
          backgroundColor: '#efefef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isExpired ? 'grayscale(1)' : 'none',
        }}
      >
        {type === 'post' ? <ImageIcon size={40} color="#8e8e8e" /> : <PlayCircle size={40} color="#0095f6" />}
        {isExpired && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={32} color="#ed4956" />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ed4956' }}>만료된 콘텐츠</span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            fontSize: '0.7rem',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
          }}
        >
          {type === 'post' ? '게시물' : '스토리'}
        </div>
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #efefef' }}>
        <div style={{ fontSize: '0.85rem', color: isExpired ? '#8e8e8e' : '#262626', fontWeight: '600' }}>
          {isExpired ? '볼 수 없는 콘텐츠입니다' : type === 'post' ? '게시물 보기' : '스토리 보기'}
        </div>
      </div>
    </div>
  );
};

export interface DmChatMessageRowProps {
  msg: DmMessageResponse;
  /** true = 본인 메시지(오른쪽·파랑), false = 상대(왼쪽·회색) — senderId vs 로그인 user id */
  isMe: boolean;
  showReadStatus: boolean;
}

/**
 * 한 줄 DM 메시지: 정렬·말풍선 색은 isMe 에만 의존 (REST/WebSocket 공통 DmMessageResponse).
 */
export const DmChatMessageRow: React.FC<DmChatMessageRowProps> = ({ msg, isMe, showReadStatus }) => {
  const navigate = useNavigate();
  const attachmentData = resolveDmAttachment(msg);
  const isValid =
    msg.valid &&
    !checkIsExpired(
      msg.content,
      attachmentData?.type === 'story' ? 'STORY' : attachmentData?.type === 'post' ? 'POST' : ''
    );

  const openAttachment = async () => {
    if (!attachmentData) return;
    if (attachmentData.type === 'post') {
      navigate(`/post/${attachmentData.id}`);
      return;
    }
    const storyId = Number(attachmentData.id);
    if (!Number.isFinite(storyId)) return;
    const authorFallback = msg.content.match(/(?:^|[?&])u=(\d+)/);
    const fallbackUserId = authorFallback ? Number(authorFallback[1]) : NaN;
    try {
      const res = await storyApi.recordView(storyId);
      const ok = res.resultCode?.startsWith('200') || res.resultCode?.includes('-S-');
      if (ok && res.data?.userId != null) {
        navigate(`/story/${res.data.userId}`);
        return;
      }
    } catch {
      /* 시청 기록 API 실패 시 공유 링크의 작성자 id로 스토리 피드 진입 */
    }
    if (Number.isFinite(fallbackUserId) && fallbackUserId > 0) {
      navigate(`/story/${fallbackUserId}`);
      return;
    }
    alert('스토리를 열 수 없습니다.');
  };

  const bubble = isMe ? DM_BUBBLE_MINE : DM_BUBBLE_PEER;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
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
          {isMe && (
            <span
              style={{
                fontSize: '0.7rem',
                color: showReadStatus ? 'transparent' : 'rgba(255,255,255,0.9)',
                fontWeight: 'bold',
                minWidth: '0.6rem',
              }}
            >
              1
            </span>
          )}
          {!attachmentData ? (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '22px',
                fontSize: '0.95rem',
                wordBreak: 'break-word',
                ...bubble,
              }}
            >
              {msg.content}
            </div>
          ) : (
            <AttachmentCard
              type={attachmentData.type as 'post' | 'story'}
              isValid={isValid}
              isMe={isMe}
              onClick={() => {
                void openAttachment();
              }}
            />
          )}
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            color: '#8e8e8e',
            marginTop: '4px',
            padding: '0 4px',
            alignSelf: isMe ? 'flex-end' : 'flex-start',
          }}
        >
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
