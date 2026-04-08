import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Image as ImageIcon, PlayCircle, AlertCircle } from 'lucide-react';
import { storyApi } from '../../api/story';
import type { DmMessageResponse } from '../../types/dm';
import { resolveDmAttachment } from '../../util/dmAttachment';
import { applyImageFallback, resolveAssetUrl } from '../../util/assetUrl';
import { getDmPostShareTitle } from '../../util/dmPostShareTitle';
import {
  getDmPostShareThumbnailUrl,
  getDmStoryShareThumbnailUrl,
  isDmSharedStoryActiveOnServer,
} from '../../util/dmShareThumbnails';
import ProfileAvatar from '../common/ProfileAvatar';
import { DM_BUBBLE_MINE, DM_BUBBLE_PEER } from './dmBubbleStyles';
import { STORY_FROM_STATE_KEY } from '../../util/storyNavigation';
import { isDmSharedStoryContentExpired } from '../../util/dmStoryShareExpiry';

const AttachmentCard = ({
  type,
  isValid,
  isMe,
  onClick,
  thumbnailSrc,
  footerText,
}: {
  type: 'post' | 'story';
  isValid: boolean;
  isMe: boolean;
  onClick: () => void;
  thumbnailSrc: string;
  footerText: string;
}) => {
  const isExpired = !isValid;
  const isExpiredStory = isExpired && type === 'story';
  const frameBorder = isMe ? '2px solid #0095f6' : '1px solid #d8d8d8';
  const frameBg = isExpired ? '#f0f0f0' : isMe ? '#f0f8ff' : '#fafafa';
  const showThumb = Boolean(thumbnailSrc) && !isExpired;
  /** 썸네일 없는 정상 게시글 — 흰 카드 + 좌하단 제목만 */
  const postImageless = type === 'post' && !isExpired && !String(thumbnailSrc ?? '').trim();

  if (postImageless) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          width: '240px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: frameBorder,
          backgroundColor: '#ffffff',
          marginTop: '5px',
          position: 'relative',
          cursor: 'pointer',
          boxSizing: 'border-box',
          minHeight: '108px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '12px',
        }}
      >
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
          게시물
        </div>
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#262626',
            textAlign: 'left',
            lineHeight: 1.35,
            paddingTop: '22px',
            wordBreak: 'break-word',
          }}
        >
          {footerText}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isExpired ? undefined : onClick}
      role={isExpired ? undefined : 'button'}
      tabIndex={isExpired ? undefined : 0}
      onKeyDown={
        isExpired
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
      }
      style={{
        width: '240px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: frameBorder,
        cursor: isExpired ? 'default' : 'pointer',
        backgroundColor: frameBg,
        marginTop: '5px',
        opacity: isExpired && !isExpiredStory ? 0.6 : 1,
        position: 'relative',
      }}
    >
      <div
        style={{
          height: isExpiredStory ? '70px' : '140px',
          backgroundColor: '#efefef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isExpired && !isExpiredStory ? 'grayscale(1)' : 'none',
          position: 'relative',
        }}
      >
        {showThumb ? (
          <img
            src={thumbnailSrc}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => applyImageFallback(e, thumbnailSrc)}
          />
        ) : isExpiredStory ? null : type === 'post' ? (
          <ImageIcon size={40} color="#8e8e8e" />
        ) : (
          <PlayCircle size={40} color="#0095f6" />
        )}
        {isExpired && !isExpiredStory && (
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
              padding: '8px',
              textAlign: 'center',
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
        <div
          style={{
            fontSize: isExpiredStory ? '1.05rem' : '0.85rem',
            color: isExpired ? '#8e8e8e' : '#262626',
            fontWeight: '600',
            textAlign: isExpiredStory ? 'left' : undefined,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: isExpiredStory ? 'block' : '-webkit-box',
            WebkitLineClamp: isExpiredStory ? undefined : 2,
            WebkitBoxOrient: isExpiredStory ? undefined : 'vertical',
          }}
        >
          {isExpired ? (type === 'story' ? '만료된 스토리' : '볼 수 없는 콘텐츠입니다') : footerText}
        </div>
      </div>
    </div>
  );
};

export interface DmChatMessageRowProps {
  msg: DmMessageResponse;
  /** true = 본인(오른쪽·파랑), false = 상대(왼쪽·회색) — senderId vs 로그인 user id */
  isMe: boolean;
  showReadStatus: boolean;
  /** 그룹: 상대 메시지 위 발신자 표시명(참고 앱의 senderName 라벨과 동일 역할) */
  senderLabel?: string | null;
  /** 상대 메시지 왼쪽 프로필 — 1:1·그룹 공통 */
  peerProfile?: {
    userId: number;
    nickname: string;
    profileImageUrl: string | null;
  } | null;
}

/**
 * REST·STOMP 공통 한 줄 DM — `isMe` 로 정렬·색 분리, 상대는 아바타·그룹 닉 라벨로 구분 강화.
 */
export const DmChatMessageRow: React.FC<DmChatMessageRowProps> = ({
  msg,
  isMe,
  showReadStatus,
  senderLabel,
  peerProfile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const storyNavState = { state: { [STORY_FROM_STATE_KEY]: `${location.pathname}${location.search}` } };
  const attachmentData = resolveDmAttachment(msg);
  /** 서버 활성 목록에 없으면 false — API 실패 시 null 유지(만료로 오인 방지) */
  const [serverStoryListed, setServerStoryListed] = useState<boolean | null>(null);

  const isValid =
    msg.valid &&
    !(attachmentData?.type === 'story' && isDmSharedStoryContentExpired(msg.content)) &&
    !(attachmentData?.type === 'story' && serverStoryListed === false);

  useEffect(() => {
    setServerStoryListed(null);
    if (attachmentData?.type !== 'story') return;
    const sid = Number(attachmentData.id);
    const authorM = msg.content.match(/(?:^|[?&])u=(\d+)/);
    const authorUserId = authorM ? Number(authorM[1]) : NaN;
    if (!Number.isFinite(sid) || sid <= 0 || !Number.isFinite(authorUserId) || authorUserId <= 0) return;
    let cancelled = false;
    void isDmSharedStoryActiveOnServer(sid, authorUserId).then((active) => {
      if (cancelled || active === null) return;
      setServerStoryListed(active);
    });
    return () => {
      cancelled = true;
    };
  }, [attachmentData?.type, attachmentData?.id, msg.content, msg.id]);

  const [postShareTitle, setPostShareTitle] = useState<string | null>(null);
  const [fetchedShareThumb, setFetchedShareThumb] = useState<string | null>(null);

  const serverThumbRaw =
    msg.thumbnail && String(msg.thumbnail).trim() !== '' ? String(msg.thumbnail).trim() : '';

  useEffect(() => {
    if (attachmentData?.type !== 'post') {
      setPostShareTitle(null);
      return;
    }
    const pid = Number(attachmentData.id);
    if (!Number.isFinite(pid) || pid <= 0) {
      setPostShareTitle(null);
      return;
    }
    let cancelled = false;
    void getDmPostShareTitle(pid).then((t) => {
      if (!cancelled) setPostShareTitle(t);
    });
    return () => {
      cancelled = true;
    };
  }, [attachmentData?.type, attachmentData?.id]);

  useEffect(() => {
    setFetchedShareThumb(null);
    if (!attachmentData || !isValid) return;
    if (serverThumbRaw !== '') return;

    if (attachmentData.type === 'post') {
      const pid = Number(attachmentData.id);
      if (!Number.isFinite(pid) || pid <= 0) return;
      let cancelled = false;
      void getDmPostShareThumbnailUrl(pid).then((url) => {
        if (!cancelled && url) setFetchedShareThumb(url);
      });
      return () => {
        cancelled = true;
      };
    }

    if (attachmentData.type === 'story') {
      const sid = Number(attachmentData.id);
      const authorM = msg.content.match(/(?:^|[?&])u=(\d+)/);
      const authorUserId = authorM ? Number(authorM[1]) : NaN;
      if (!Number.isFinite(sid) || sid <= 0 || !Number.isFinite(authorUserId) || authorUserId <= 0) {
        return;
      }
      let cancelled = false;
      void getDmStoryShareThumbnailUrl(sid, authorUserId).then((url) => {
        if (!cancelled && url) setFetchedShareThumb(url);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [
    attachmentData?.type,
    attachmentData?.id,
    isValid,
    msg.content,
    serverThumbRaw,
  ]);

  const attachmentThumbSrc =
    serverThumbRaw !== ''
      ? resolveAssetUrl(serverThumbRaw)
      : fetchedShareThumb
        ? resolveAssetUrl(fetchedShareThumb)
        : '';

  const attachmentFooterText =
    attachmentData?.type === 'post'
      ? postShareTitle && postShareTitle.trim() !== ''
        ? postShareTitle.trim()
        : '게시물 보기'
      : '스토리 보기';

  const openAttachment = async () => {
    if (!attachmentData) return;
    /** 서버 valid=false(만료·삭제) 또는 클라이언트 24h 만료 추정 시 열기 금지 */
    if (!isValid) return;
    if (attachmentData.type === 'post') {
      navigate(`/post/${attachmentData.id}`);
      return;
    }
    const storyId = Number(attachmentData.id);
    if (!Number.isFinite(storyId)) return;
    const authorFallback = msg.content.match(/(?:^|[?&])u=(\d+)/);
    const authorUserId = authorFallback ? Number(authorFallback[1]) : NaN;
    if (!Number.isFinite(authorUserId) || authorUserId <= 0) {
      alert('스토리 링크에 작성자 정보가 없어 열 수 없습니다.');
      return;
    }
    try {
      const res = await storyApi.recordView(storyId, authorUserId);
      const ok = res.resultCode?.startsWith('200') || res.resultCode?.includes('-S-');
      if (ok && res.data?.userId != null) {
        navigate(`/story/${res.data.userId}`, storyNavState);
        return;
      }
    } catch {
      /* 시청 기록 실패 시 작성자 피드로 진입 */
    }
    navigate(`/story/${authorUserId}`, storyNavState);
  };

  const bubble = isMe ? DM_BUBBLE_MINE : DM_BUBBLE_PEER;
  const showPeerAvatar = !isMe && peerProfile != null;
  const trimmedLabel = senderLabel?.trim() ?? '';
  const showPeerSenderName = !isMe && trimmedLabel.length > 0;

  const imageSrc = msg.type === 'IMAGE' ? resolveAssetUrl((msg.content ?? '').trim()) : '';

  const bubbleBlock =
    msg.type === 'IMAGE' ? (
      <div
        style={{
          maxWidth: '260px',
          borderRadius: '18px',
          overflow: 'hidden',
          border: isMe ? '2px solid #0095f6' : '1px solid #d8d8d8',
          backgroundColor: '#efefef',
          boxShadow: isMe ? '0 1px 3px rgba(0, 149, 246, 0.35)' : '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="전송한 이미지"
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'cover' }}
            onError={(e) => applyImageFallback(e, msg.content)}
          />
        ) : (
          <div style={{ padding: '16px', fontSize: '0.85rem', color: '#8e8e8e' }}>이미지를 불러올 수 없습니다.</div>
        )}
      </div>
    ) : !attachmentData ? (
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
        thumbnailSrc={attachmentThumbSrc}
        footerText={attachmentFooterText}
        onClick={() => {
          void openAttachment();
        }}
      />
    );

  return (
    <div
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
          {showPeerSenderName ? (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#8e8e8e',
                marginBottom: '4px',
                paddingLeft: '2px',
              }}
            >
              {trimmedLabel}
            </span>
          ) : null}
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
                  /* 말풍선 왼쪽(흰 배경)에 붙으므로 흰 글자는 대비가 없음 → 미읽음만 진한 색 */
                  color: showReadStatus ? 'transparent' : '#0095f6',
                  fontWeight: 'bold',
                  minWidth: '0.6rem',
                }}
              >
                1
              </span>
            )}
            {bubbleBlock}
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
    </div>
  );
};
