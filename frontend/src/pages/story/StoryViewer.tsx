// src/pages/story/StoryViewer.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Heart, X, Users, MoreHorizontal, Trash2, Send, Share2 } from 'lucide-react';
import { storyApi } from '../../api/story';
import { dmApi } from '../../api/dm';
import { StoryDetailResponse, StoryFeedResponse, StoryViewResponse } from '../../types/story';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { setPendingDmBatch } from '../../services/dmPendingSend';
import { buildStorySharePayload } from '../../util/dmDeepLinks';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';
import DmShareModal from '../../components/dm/DmShareModal';
import { getAlternateAssetUrl, resolveAssetUrl } from '../../util/assetUrl';
import ProfileAvatar from '../../components/common/ProfileAvatar';
import { normalizeStoryExitPath } from '../../util/storyNavigation';

const STORY_DURATION = 5000;
/** 이 길이를 넘으면 말줄임 후 클릭 시 전문 토글 */
const STORY_CAPTION_COLLAPSE_MAX = 40;

function applyStoryAfterLikeToggle(
  story: StoryDetailResponse,
  view: StoryViewResponse,
  me: { userId: number; nickname: string; profileImageUrl: string | null }
): StoryDetailResponse {
  const isLiked = view.isLiked;
  const totalLikeCount = view.totalLikeCount ?? story.totalLikeCount;

  if (!Array.isArray(story.likers)) {
    return { ...story, isLiked, totalLikeCount };
  }

  let likers = [...story.likers];
  if (isLiked && !likers.some((u) => u.userId === me.userId)) {
    likers.push({
      userId: me.userId,
      nickname: me.nickname,
      profileImageUrl: me.profileImageUrl,
      isLiked: true,
      viewedAt: view.viewedAt,
      likedAt: view.likedAt,
    });
  }
  if (!isLiked) {
    likers = likers.filter((u) => u.userId !== me.userId);
  }
  return { ...story, isLiked, totalLikeCount, likers };
}

const StoryViewer: React.FC = () => {
  const { userId: targetUserIdStr } = useParams<{ userId: string }>();
  const targetUserId = Number(targetUserIdStr);
  const navigate = useNavigate();
  const location = useLocation();
  const storyReturnPathRef = useRef<string | undefined>(undefined);
  if (storyReturnPathRef.current === undefined) {
    storyReturnPathRef.current = normalizeStoryExitPath(location.state);
  }
  const exitStoryViewer = useCallback(() => {
    navigate(storyReturnPathRef.current ?? '/');
  }, [navigate]);
  
  const [stories, setStories] = useState<StoryDetailResponse[]>([]);
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // 상태들
  const [showStats, setShowStats] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'views' | 'likes'>('views');
  const [replyText, setReplyText] = useState('');
  const [showDmShare, setShowDmShare] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [showTaggedUsers, setShowTaggedUsers] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const likeInFlightRef = useRef(false);

  const { userId: loggedInUserId, nickname: loggedInNickname, profileImageUrl: myProfileImageUrl } = useAuthStore();
  const setRooms = useDmStore((s) => s.setRooms);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const isImage = (mediaType: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    return imageExtensions.includes(mediaType.toLowerCase());
  };

  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);

  useEffect(() => {
    const initData = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      setCurrentIndex(0); 
      setShowStats(false);
      setShowMenu(false);
      setReplyText('');
      
      try {
        if (feed.length === 0) {
          const feedRes = await storyApi.getFeed();
          if (feedRes.resultCode.startsWith('200')) setFeed(feedRes.data);
        }
        const res = await storyApi.getUserStories(targetUserId);
        if (res.resultCode.startsWith('200') && res.data.length > 0) {
          setStories(res.data);
          const firstStoryId = res.data[0]?.storyId;
          if (firstStoryId) await storyApi.recordViewSafe(firstStoryId, targetUserId);
        } else {
          exitStoryViewer();
        }
      } catch (error) {
        exitStoryViewer();
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [targetUserId, navigate, exitStoryViewer]);

  const currentStoryIdForCaption = stories[currentIndex]?.storyId;
  useEffect(() => {
    setCaptionExpanded(false);
    setShowTaggedUsers(false);
  }, [currentIndex, currentStoryIdForCaption]);

  useEffect(() => {
    if (
      stories.length === 0 ||
      isLoading ||
      showStats ||
      isPaused ||
      showMenu ||
      replyText.length > 0 ||
      showDmShare ||
      showTaggedUsers ||
      captionExpanded
    ) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    const remainingTime = STORY_DURATION * (1 - progress / 100);
    timerRef.current = setTimeout(() => handleNext(), remainingTime);

    const startTime = Date.now() - (STORY_DURATION * (progress / 100));
    progressRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      setProgress(Math.min((elapsedTime / STORY_DURATION) * 100, 100));
    }, 10);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, stories, isLoading, showStats, isPaused, showMenu, replyText, showDmShare, showTaggedUsers, captionExpanded]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      void storyApi.recordViewSafe(stories[currentIndex + 1].storyId, targetUserId);
    } else {
      const feedUserIds = feed.map(u => u.userId);
      let sequence = [...feedUserIds];
      if (loggedInUserId && !feedUserIds.includes(loggedInUserId)) sequence = [loggedInUserId, ...feedUserIds];
      const currentIdx = sequence.indexOf(targetUserId);
      if (currentIdx !== -1 && currentIdx < sequence.length - 1) {
        navigate(`/story/${sequence[currentIdx + 1]}`);
      } else {
        exitStoryViewer();
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      const feedUserIds = feed.map(u => u.userId);
      let sequence = [...feedUserIds];
      if (loggedInUserId && !feedUserIds.includes(loggedInUserId)) sequence = [loggedInUserId, ...feedUserIds];
      const currentIdx = sequence.indexOf(targetUserId);
      if (currentIdx > 0) navigate(`/story/${sequence[currentIdx - 1]}`);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !currentStory) return;

    try {
      const res = await dmApi.create1v1Room(currentStory.userId);
      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
        setPendingDmBatch(res.data.roomId, [
          { type: 'TEXT', content: text, thumbnail: null },
          buildStorySharePayload(currentStory.storyId, currentStory.createdAt, currentStory.userId),
        ]);
        setRooms(res.data.rooms);
        setReplyText('');
        navigate(`/dm/${res.data.roomId}`);
      } else {
        alert(res.msg || '답장을 보낼 수 없습니다.');
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, '답장 전송 실패'));
    }
  };

  const removeStoryFromList = (updated: StoryDetailResponse[]) => {
    if (updated.length === 0) exitStoryViewer();
    else {
      setStories(updated);
      setCurrentIndex((prev) => Math.min(prev, updated.length - 1));
      setProgress(0);
      setShowMenu(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!currentStory || !window.confirm('보관하시겠습니까?')) return;
    try {
      const res = await storyApi.softDelete(currentStory.storyId);
      if (res.resultCode.startsWith('200')) {
        removeStoryFromList(stories.filter((_, idx) => idx !== currentIndex));
      }
    } catch (err) {
      alert('오류 발생');
    }
  };

  const handleHardDelete = async () => {
    if (!currentStory) return;
    if (!window.confirm('영구 삭제하시겠습니까?')) return;
    try {
      const res = await storyApi.hardDelete(currentStory.storyId);
      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
        removeStoryFromList(stories.filter((_, idx) => idx !== currentIndex));
      } else {
        alert(res.msg || '삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('오류 발생');
    }
  };

  const handleToggleLike = useCallback(async () => {
    const story = stories[currentIndex];
    if (!story || likeInFlightRef.current) return;
    if (loggedInUserId == null) {
      alert('로그인이 필요합니다.');
      return;
    }
    likeInFlightRef.current = true;
    setLikeBusy(true);
    try {
      const res = await storyApi.toggleLike(story.storyId);
      if (!isRsDataSuccess(res) || res.data == null) {
        alert(res.msg || '좋아요 처리에 실패했습니다.');
        return;
      }
      const me = {
        userId: loggedInUserId,
        nickname: loggedInNickname?.trim() || `User ${loggedInUserId}`,
        profileImageUrl: myProfileImageUrl ?? null,
      };
      const payload = res.data;
      setStories((prev) =>
        prev.map((s, i) => (i === currentIndex ? applyStoryAfterLikeToggle(s, payload, me) : s))
      );
    } catch (e: unknown) {
      alert(getApiErrorMessage(e, '좋아요 처리에 실패했습니다.'));
    } finally {
      likeInFlightRef.current = false;
      setLikeBusy(false);
    }
  }, [stories, currentIndex, loggedInUserId, loggedInNickname, myProfileImageUrl]);

  const currentStory = stories[currentIndex];
  const isOwner = loggedInUserId === currentStory?.userId;

  if (isLoading || !currentStory) return <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>로딩 중...</div>;

  const authorFeed = feed.find((u) => Number(u.userId) === Number(currentStory.userId));
  const authorNickname =
    currentStory.nickname?.trim() ||
    authorFeed?.nickname?.trim() ||
    (loggedInUserId != null && Number(currentStory.userId) === Number(loggedInUserId)
      ? loggedInNickname?.trim() ?? ''
      : '') ||
    '';
  const authorProfileImageUrl = currentStory.profileImageUrl ?? authorFeed?.profileImageUrl ?? null;
  const authorLabel = authorNickname || (isOwner ? '나' : `User ${currentStory.userId}`);
  const taggedUserIds = currentStory.taggedUserIds ?? [];
  const userMap = new Map<number, { nickname: string; profileImageUrl: string | null }>();
  feed.forEach((u) => userMap.set(u.userId, { nickname: u.nickname, profileImageUrl: u.profileImageUrl }));
  stories.forEach((s) => {
    if (!userMap.has(s.userId)) {
      userMap.set(s.userId, { nickname: s.nickname, profileImageUrl: s.profileImageUrl });
    }
  });
  const taggedUsers = taggedUserIds.map((id) => {
    const resolved = userMap.get(id);
    return {
      userId: id,
      nickname: resolved?.nickname?.trim() || `User ${id}`,
      profileImageUrl: resolved?.profileImageUrl ?? null,
      hasKnownNickname: Boolean(resolved?.nickname?.trim()),
    };
  });

  const goToProfileByNickname = (nickname: string) => {
    const nick = nickname.trim();
    if (!nick) return;
    navigate(`/profile/${encodeURIComponent(nick)}`);
  };

  const storyCaption = currentStory.content?.trim() ?? '';
  const captionNeedsTruncate = storyCaption.length > STORY_CAPTION_COLLAPSE_MAX;

  const captionBlockStyle: React.CSSProperties = {
    flexShrink: 0,
    width: '100%',
    maxWidth: 450,
    margin: '12px 0 0',
    padding: '0 16px',
    boxSizing: 'border-box',
    color: '#fff',
    fontSize: '0.95rem',
    lineHeight: 1.45,
    textAlign: 'left',
    wordBreak: 'break-word',
    maxHeight: 'min(28vh, 220px)',
    overflowY: 'auto',
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#1a1a1a', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 프로그레스 바 */}
      <div style={{ position: 'absolute', top: '15px', width: '95%', maxWidth: '400px', display: 'flex', gap: '4px', zIndex: 2100 }}>
        {stories.map((_, idx) => (
          <div key={idx} style={{ height: '2px', flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%', backgroundColor: '#fff' }} />
          </div>
        ))}
      </div>

      {/* 헤더 */}
      <div style={{ position: 'absolute', top: '30px', width: '95%', maxWidth: '400px', display: 'flex', alignItems: 'center', zIndex: 2100, padding: '0 10px' }}>
        <div
          role={authorNickname ? 'button' : undefined}
          tabIndex={authorNickname ? 0 : undefined}
          onClick={() => goToProfileByNickname(authorNickname)}
          onKeyDown={(e) => {
            if (!authorNickname) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              goToProfileByNickname(authorNickname);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            marginRight: '8px',
            cursor: authorNickname ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#efefef',
              marginRight: '10px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            <ProfileAvatar
              fillContainer
              authorUserId={currentStory.userId}
              profileImageUrl={authorProfileImageUrl}
              nickname={authorLabel}
            />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authorLabel}</span>
        </div>
        {isOwner && (
          <div style={{ position: 'relative', marginLeft: 'auto', marginRight: '10px' }}>
            <button
              type="button"
              aria-expanded={showMenu}
              aria-haspopup="true"
              aria-label="스토리 메뉴"
              onClick={() => {
                setShowMenu((v) => !v);
                setShowStats(false);
              }}
              style={{ background: 'none', border: 'none', color: '#fff', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <MoreHorizontal size={24} />
            </button>
            {showMenu && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  zIndex: 3100,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  width: '180px',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSoftDelete()}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px 20px',
                    border: 'none',
                    background: 'none',
                    color: '#262626',
                    cursor: 'pointer',
                    borderBottom: '1px solid #efefef',
                    textAlign: 'left',
                    font: 'inherit',
                  }}
                >
                  보관하기
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleHardDelete()}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px 20px',
                    border: 'none',
                    background: 'none',
                    color: '#ed4956',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                  }}
                >
                  <Trash2 size={18} /> 영구 삭제
                </button>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => exitStoryViewer()} style={{ marginLeft: isOwner ? '0' : 'auto', background: 'none', border: 'none', color: '#fff' }}>
          <X size={28} />
        </button>
      </div>

      {taggedUsers.length > 0 && (
        <div style={{ position: 'absolute', top: '76px', width: '95%', maxWidth: '400px', zIndex: 2150, padding: '0 10px', boxSizing: 'border-box' }}>
          <button
            type="button"
            aria-expanded={showTaggedUsers}
            aria-label="태그된 유저 목록 토글"
            onClick={() => setShowTaggedUsers((prev) => !prev)}
            style={{
              border: 'none',
              backgroundColor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '999px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            태그 {taggedUsers.length}명 {showTaggedUsers ? '접기' : '보기'}
          </button>

          {showTaggedUsers && (
            <div
              style={{
                marginTop: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                borderRadius: '12px',
                backgroundColor: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(2px)',
                padding: '8px',
              }}
            >
              {taggedUsers.map((user) => (
                <div
                  key={user.userId}
                  role={user.hasKnownNickname ? 'button' : undefined}
                  tabIndex={user.hasKnownNickname ? 0 : undefined}
                  onClick={() => {
                    if (!user.hasKnownNickname) return;
                    goToProfileByNickname(user.nickname);
                  }}
                  onKeyDown={(e) => {
                    if (!user.hasKnownNickname) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToProfileByNickname(user.nickname);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: user.hasKnownNickname ? 'pointer' : 'default',
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#efefef',
                      flexShrink: 0,
                    }}
                  >
                    <ProfileAvatar
                      fillContainer
                      authorUserId={user.userId}
                      profileImageUrl={user.profileImageUrl}
                      nickname={user.nickname}
                    />
                  </div>
                  <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{user.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 미디어 + 문구(본문은 미디어 아래) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 72,
          paddingBottom: 88,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 450,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <div
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            {isImage(currentStory.mediaType) ? (
              <img
                src={getFullUrl(currentStory.mediaUrl)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallbackApplied === '1') return;
                  const fallback = getFallbackUrl(currentStory.mediaUrl);
                  if (fallback) {
                    img.dataset.fallbackApplied = '1';
                    img.src = fallback;
                  }
                }}
              />
            ) : (
              <video
                src={getFullUrl(currentStory.mediaUrl)}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  const video = e.currentTarget;
                  if (video.dataset.fallbackApplied === '1') return;
                  const fallback = getFallbackUrl(currentStory.mediaUrl);
                  if (fallback) {
                    video.dataset.fallbackApplied = '1';
                    video.src = fallback;
                    video.load();
                  }
                }}
              />
            )}
            <div onClick={handlePrev} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%' }} />
            <div onClick={handleNext} style={{ position: 'absolute', right: 0, top: 0, width: '70%', height: '100%' }} />
          </div>
          {storyCaption.length > 0 ? (
            captionNeedsTruncate ? (
              <button
                type="button"
                onClick={() => setCaptionExpanded((v) => !v)}
                aria-expanded={captionExpanded}
                aria-label={captionExpanded ? '문구 접기' : '문구 전체 보기'}
                style={{
                  ...captionBlockStyle,
                  display: 'block',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {captionExpanded
                  ? storyCaption
                  : `${storyCaption.slice(0, STORY_CAPTION_COLLAPSE_MAX)}...`}
              </button>
            ) : (
              <p style={captionBlockStyle}>{storyCaption}</p>
            )
          ) : null}
        </div>
      </div>

      {/* 하단 인터랙션 (답장하기 기능 추가) */}
      <div style={{ position: 'absolute', bottom: '20px', width: '95%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px' }}>
        {isOwner ? (
          <div onClick={() => setShowStats(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}><Users size={20} /> 조회 {(currentStory.viewers ?? []).length}명</div>
        ) : (
          <form onSubmit={handleSendReply} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '25px', padding: '5px 15px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <input 
              type="text" 
              placeholder="답장하기..." 
              value={replyText} 
              onChange={(e) => setReplyText(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', padding: '8px 0', outline: 'none', fontSize: '0.9rem' }}
            />
            {replyText && <button type="submit" style={{ background: 'none', border: 'none', color: '#0095f6', cursor: 'pointer' }}><Send size={20} /></button>}
          </form>
        )}
        <button
          type="button"
          title="공유하기"
          aria-label="공유하기"
          onClick={() => setShowDmShare(true)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
        >
          <Share2 size={24} />
        </button>
        <button
          type="button"
          title={currentStory.isLiked ? '좋아요 취소' : '좋아요'}
          aria-label={currentStory.isLiked ? '좋아요 취소' : '좋아요'}
          onClick={() => void handleToggleLike()}
          disabled={likeBusy}
          style={{
            background: 'none',
            border: 'none',
            color: currentStory.isLiked ? '#ed4956' : '#fff',
            cursor: likeBusy ? 'wait' : 'pointer',
            opacity: likeBusy ? 0.7 : 1,
            padding: '4px',
          }}
        >
          <Heart size={28} fill={currentStory.isLiked ? '#ed4956' : 'none'} />
        </button>
      </div>

      <DmShareModal
        open={showDmShare}
        onClose={() => setShowDmShare(false)}
        payloads={[buildStorySharePayload(currentStory.storyId, currentStory.createdAt, currentStory.userId)]}
      />

      {/* 통계창 시트 (생략) */}
      {showStats && isOwner && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', backgroundColor: '#fff', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', zIndex: 3000, padding: '20px', color: '#000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', fontWeight: 'bold' }}>
              <span onClick={() => setActiveTab('views')} style={{ borderBottom: activeTab === 'views' ? '2px solid #000' : 'none' }}>조회 {(currentStory.viewers ?? []).length}</span>
              <span onClick={() => setActiveTab('likes')} style={{ borderBottom: activeTab === 'likes' ? '2px solid #000' : 'none' }}>좋아요 {(currentStory.likers ?? []).length}</span>
            </div>
            <X onClick={() => setShowStats(false)} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {(activeTab === 'views' ? (currentStory.viewers ?? []) : (currentStory.likers ?? [])).map((user) => (
              <div
                key={user.userId}
                role="button"
                tabIndex={0}
                onClick={() => goToProfileByNickname(user.nickname)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToProfileByNickname(user.nickname);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <ProfileAvatar fillContainer authorUserId={user.userId} profileImageUrl={user.profileImageUrl} nickname={user.nickname} />
                </div>
                <span style={{ fontWeight: '600' }}>{user.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
