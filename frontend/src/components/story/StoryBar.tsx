import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react'; 
import { storyApi } from '../../api/story';
import { authApi } from '../../api/auth';
import { StoryFeedResponse, StoryDetailResponse } from '../../types/story';
import { useAuthStore } from '../../store/useAuthStore';
import ProfileAvatar from '../common/ProfileAvatar';
import { syncMyProfileImageFromUserApi } from '../../services/syncMyProfileImage';
import { STORY_FROM_STATE_KEY, STORY_RING_INVALIDATE_EVENT } from '../../util/storyNavigation';
import { filterStoriesNotPastExpiry, isStoryPastExpiry } from '../../util/storyExpiry';
import { isRsDataSuccess } from '../../util/rsData';

const STORY_RING_GRADIENT =
  'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';

function isMyFeedRow(
  item: StoryFeedResponse,
  uid: number | null | undefined,
  nick: string | null | undefined
): boolean {
  if (item.isMe === true) return true;
  if (uid != null && Number(item.userId) === Number(uid)) return true;
  if (nick != null && nick.length > 0 && item.nickname === nick) return true;
  return false;
}

const StoryBar: React.FC = () => {
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);
  const [myStories, setMyStories] = useState<StoryDetailResponse[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const storyFrom = `${location.pathname}${location.search}`;
  const {
    nickname,
    isLoggedIn,
    userId,
    setSessionUserId,
    setSessionNickname,
    profileImageUrl: sessionProfileImageUrl,
  } = useAuthStore();

  /** 만료 시각 경과 후에도 링이 남지 않도록 1초마다 재계산(API는 재호출 안 함) */
  const [, setExpiryTick] = useState(0);
  useEffect(() => {
    if (!isLoggedIn) return;
    const id = window.setInterval(() => setExpiryTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLoggedIn]);

  const loadStoryBar = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      await syncMyProfileImageFromUserApi();

      let currentUserId = userId;
      if (!currentUserId) {
        const meRes = await authApi.me();
        if (isRsDataSuccess(meRes) && meRes.data) {
          currentUserId = meRes.data.id;
          setSessionUserId(currentUserId);
          setSessionNickname(meRes.data.nickname);
        }
      }

      const feedRes = await storyApi.getFeed();
      if (isRsDataSuccess(feedRes)) {
        setFeed(feedRes.data || []);
      }

      if (currentUserId) {
        try {
          const myStoryRes = await storyApi.getUserStories(currentUserId);
          if (isRsDataSuccess(myStoryRes)) {
            setMyStories(filterStoriesNotPastExpiry(myStoryRes.data || []));
          } else {
            setMyStories([]);
          }
        } catch (storyError: unknown) {
          console.warn('내 스토리 로드 실패:', storyError);
          setMyStories([]);
        }
      } else {
        setMyStories([]);
      }
    } catch (error: unknown) {
      console.error('스토리 데이터 로드 중 오류 발생:', error);
    }
  }, [isLoggedIn, userId, setSessionUserId, setSessionNickname]);

  useEffect(() => {
    void loadStoryBar();
  }, [loadStoryBar, location.pathname]);

  useEffect(() => {
    const onInvalidate = () => void loadStoryBar();
    window.addEventListener(STORY_RING_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(STORY_RING_INVALIDATE_EVENT, onInvalidate);
  }, [loadStoryBar]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadStoryBar();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadStoryBar]);

  const nowMs = Date.now();
  const activeMyStories = myStories.filter((s) => !isStoryPastExpiry(s.expiredAt, nowMs));
  const hasActiveMyStory = activeMyStories.length > 0;
  const myFeedRow = feed.find((item) => isMyFeedRow(item, userId, nickname));
  /** 활성 스토리가 있는데 피드 행이 아직 없으면(로딩) 안 읽은 것으로 간주 → 그라데이션 */
  const myStoryRingUnread = hasActiveMyStory && (myFeedRow ? myFeedRow.isUnread : true);

  /** totalStoryCount 0: 서버 기준 활성 스토리 없음(만료 직후 등). 오래된 피드 캐시로 링이 남는 것 방지 */
  const otherUsersFeed = feed
    .filter((item) => !isMyFeedRow(item, userId, nickname))
    .filter((item) => item.totalStoryCount > 0);
  /** 피드 본인 행 → 없으면 세션(로그인/me/내 프로필)에 맞춘 URL — 피드에 내 행이 없어도 포스트와 같은 사진 */
  const myProfileImageUrl =
    sessionProfileImageUrl ??
    feed.find(
      (f) =>
        (userId != null && Number(f.userId) === Number(userId)) ||
        (nickname != null && f.nickname === nickname)
    )?.profileImageUrl ??
    null;

  const handleMyStoryClick = () => {
    if (hasActiveMyStory && userId) {
      navigate(`/story/${userId}`, { state: { [STORY_FROM_STATE_KEY]: storyFrom } });
    } else {
      navigate('/story/create');
    }
  };

  return (
    <div className="story-bar">
      {/* 내 스토리 섹션 */}
      <div className="story-bar-item" onClick={handleMyStoryClick}>
        <div
          className="story-bar-ring-outer"
          style={{
            background: hasActiveMyStory ? (myStoryRingUnread ? STORY_RING_GRADIENT : '#dbdbdb') : '#dbdbdb',
          }}
        >
          <div className="story-bar-ring-inner">
            <ProfileAvatar fillContainer authorUserId={userId ?? undefined} profileImageUrl={myProfileImageUrl} nickname={nickname} />
          </div>
          {!hasActiveMyStory && (
            <div className="story-bar-add-badge">
              <Plus size={14} color="#fff" strokeWidth={3} />
            </div>
          )}
        </div>
        <div className="story-bar-label" style={{ color: '#8e8e8e' }}>
          내 스토리
        </div>
      </div>

      {/* 타인 스토리 섹션 */}
      {otherUsersFeed.map((item) => (
        <div
          key={item.userId}
          className="story-bar-item"
          onClick={() => navigate(`/story/${item.userId}`, { state: { [STORY_FROM_STATE_KEY]: storyFrom } })}
        >
          <div
            className="story-bar-ring-outer"
            style={{
              background: item.isUnread
                ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
                : '#dbdbdb',
            }}
          >
            <div className="story-bar-ring-inner">
              <ProfileAvatar fillContainer profileImageUrl={item.profileImageUrl} nickname={item.nickname} />
            </div>
          </div>
          <div className="story-bar-label" style={{ color: '#262626' }}>
            {item.nickname}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
