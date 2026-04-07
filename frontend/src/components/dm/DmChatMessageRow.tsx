import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { storyApi } from '../../api/story';
import { postApi } from '../../api/post';
import type { DmMessageResponse } from '../../types/dm';
import type { PostMediaResponse } from '../../types/post';
import { resolveDmAttachment } from '../../util/dmAttachment';
import { resolveAssetUrl, applyImageFallback } from '../../util/assetUrl';
import ProfileAvatar from '../common/ProfileAvatar';
import { DM_BUBBLE_MINE, DM_BUBBLE_PEER } from './dmBubbleStyles';
import { STORY_FROM_STATE_KEY } from '../../util/storyNavigation';

const checkIsExpired = (content: string, type: string) => {
  if (type !== 'STORY') return false;
  const match = content.match(/v=(\d+)/);
  if (!match) return false;
  const createdTime = parseInt(match[1]);
  const now = Date.now();
  const createdMillis = createdTime < 10000000000 ? createdTime * 1000 : createdTime;
  return now - createdMillis > 24 * 60 * 60 * 1000;
};

const isVideoMediaType = (mt: string) => ['mp4', 'webm', 'mov'].includes(mt);

/** 게시물: 순서상 첫 이미지 우선, 없으면 첫 동영상 */
function pickPostPreviewMedia(medias: PostMediaResponse[]): { sourceUrl: string; isVideo: boolean } | null {
  const sorted = [...medias].sort((a, b) => a.sequence - b.sequence);
  const firstImage = sorted.find((m) => !isVideoMediaType(m.mediaType));
  if (firstImage) return { sourceUrl: firstImage.sourceUrl, isVideo: false };
  const firstVideo = sorted.find((m) => isVideoMediaType(m.mediaType));
  if (firstVideo) return { sourceUrl: firstVideo.sourceUrl, isVideo: true };
  return null;
}

const rsOk = (code: string | undefined) =>
  !!code && (code.startsWith('200') || code.includes('-S-'));

type SharePreview = { href: string; isVideo: boolean };

const shareThumbCache = new Map<string, SharePreview>();

const DmShareAttachmentCard = ({
  msg,
  attachmentType,
  attachmentId,
  isValid,
  isMe,
  onClick,
}: {
  msg: DmMessageResponse;
  attachmentType: 'post' | 'story';
  attachmentId: string;
  isValid: boolean;
  isMe: boolean;
  onClick: () => void;
}) => {
  const isExpired = !isValid;
  const frameBorder = isMe ? '2px solid #0095f6' : '1px solid #d8d8d8';
  const frameBg = isExpired ? '#f0f0f0' : isMe ? '#f0f8ff' : '#fafafa';

  const [preview, setPreview] = useState<SharePreview | null>(() => {
    const t = msg.thumbnail?.trim();
    if (!t) return null;
    const href = resolveAssetUrl(t);
    /* 서버가 넣는 DM 썸네일은 대부분 이미지; 확장자 추론은 생략 */
    return href ? { href, isVideo: false } : null;
  });

  useEffect(() => {
    const t = msg.thumbnail?.trim();
    if (t) {
      const href = resolveAssetUrl(t);
      if (href) setPreview({ href, isVideo: false });
      return;
    }

    if (!isValid) {
      setPreview(null);
      return;
    }

    const cacheKey = `${attachmentType}-${attachmentId}`;
    const cached = shareThumbCache.get(cacheKey);
    if (cached) {
      setPreview(cached);
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (attachmentType === 'post') {
        try {
          const res = await postApi.getDetail(Number(attachmentId));
          if (cancelled || !rsOk(res.resultCode) || !res.data.medias?.length) return;
          const pick = pickPostPreviewMedia(res.data.medias);
          if (!pick) return;
          const href = resolveAssetUrl(pick.sourceUrl);
          if (!href) return;
          const next = { href, isVideo: pick.isVideo };
          shareThumbCache.set(cacheKey, next);
          setPreview(next);
        } catch {
          /* noop */
        }
        return;
      }

      const authorMatch = msg.content.match(/(?:^|[?&])u=(\d+)/);
      const authorId = authorMatch ? Number(authorMatch[1]) : NaN;
      if (!Number.isFinite(authorId)) return;
      try {
        const res = await storyApi.getUserStories(authorId);
        if (cancelled || !rsOk(res.resultCode) || !res.data?.length) return;
        const sid = Number(attachmentId);
        const story = res.data.find((s) => s.storyId === sid);
        if (!story?.mediaUrl) return;
        const href = resolveAssetUrl(story.mediaUrl);
        if (!href) return;
        const next = { href, isVideo: isVideoMediaType(story.mediaType) };
        shareThumbCache.set(cacheKey, next);
        setPreview(next);
      } catch {
        /* noop */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [msg.id, msg.thumbnail, msg.content, attachmentType, attachmentId, isValid]);

  const showThumb = !!preview?.href && !isExpired;
  /** 미디어 없는 게시물: 상단 미디어 영역 없이 본문 행과 동일 배경만 */
  const postTextOnlyUnified = attachmentType === 'post' && !showThumb;

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
      {postTextOnlyUnified ? (
        <div
          style={{
            position: 'relative',
            padding: '22px 12px',
            minHeight: '96px',
            backgroundColor: frameBg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '0.65rem',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              padding: '3px 8px',
              borderRadius: '10px',
              fontWeight: 'bold',
              zIndex: 1,
            }}
          >
            게시물
          </div>
          <div
            style={{
              fontSize: '0.85rem',
              color: isExpired ? '#8e8e8e' : '#262626',
              fontWeight: '600',
              paddingRight: '72px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isExpired ? '볼 수 없는 콘텐츠입니다' : '게시물 보기'}
          </div>
          {isExpired ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                backgroundColor: 'rgba(255,255,255,0.4)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 8px',
              }}
            >
              <AlertCircle size={22} color="#ed4956" />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#ed4956', whiteSpace: 'nowrap' }}>
                만료된 콘텐츠
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div
            style={{
              height: '140px',
              minHeight: '140px',
              backgroundColor: '#0a0a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isExpired ? 'grayscale(1)' : 'none',
              position: 'relative',
            }}
          >
            {showThumb ? (
              preview!.isVideo ? (
                <video
                  src={preview!.href}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <img
                  src={preview!.href}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => applyImageFallback(e, preview!.href)}
                />
              )
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#e8e8e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {attachmentType === 'story' ? <PlayCircle size={40} color="#0095f6" /> : null}
              </div>
            )}
            {showThumb && preview!.isVideo ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.25))',
                }}
              >
                <PlayCircle size={44} color="#fff" strokeWidth={1.5} />
              </div>
            ) : null}
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
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ed4956', whiteSpace: 'nowrap' }}>
                  만료된 콘텐츠
                </span>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                fontSize: '0.65rem',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                padding: '3px 8px',
                borderRadius: '10px',
                fontWeight: 'bold',
              }}
            >
              {attachmentType === 'post' ? '게시물' : '스토리'}
            </div>
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #efefef', backgroundColor: frameBg }}>
            <div style={{ fontSize: '0.85rem', color: isExpired ? '#8e8e8e' : '#262626', fontWeight: '600' }}>
              {isExpired ? '볼 수 없는 콘텐츠입니다' : attachmentType === 'post' ? '게시물 보기' : '스토리 보기'}
            </div>
          </div>
        </>
      )}
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

  const bubbleBlock = !attachmentData ? (
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
    <DmShareAttachmentCard
      msg={msg}
      attachmentType={attachmentData.type as 'post' | 'story'}
      attachmentId={attachmentData.id}
      isValid={isValid}
      isMe={isMe}
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
                  color: showReadStatus ? 'transparent' : 'rgba(255,255,255,0.9)',
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
