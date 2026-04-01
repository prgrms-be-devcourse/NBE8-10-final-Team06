import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react'; 
import { storyApi } from '../../api/story';
import { authApi } from '../../api/auth';
import { StoryFeedResponse, StoryDetailResponse } from '../../types/story';
import { useAuthStore } from '../../store/useAuthStore';
import ProfileAvatar from '../common/ProfileAvatar';
import { syncMyProfileImageFromUserApi } from '../../services/syncMyProfileImage';

const StoryBar: React.FC = () => {
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);
  const [myStories, setMyStories] = useState<StoryDetailResponse[]>([]);
  const navigate = useNavigate();
  const { nickname, isLoggedIn, userId, setLogin, profileImageUrl: sessionProfileImageUrl } = useAuthStore();
  
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      try {
        await syncMyProfileImageFromUserApi();

        // 1. 내 userId 확보 — 피드에서 본인 행 매칭에 필요
        let currentUserId = userId;
        if (!currentUserId) {
          const meRes = await authApi.me();
          if (meRes.resultCode?.includes('-S-') || meRes.resultCode?.startsWith('200')) {
            currentUserId = meRes.data.id;
            const token = localStorage.getItem('accessToken') || '';
            const rawApiKey = localStorage.getItem('apiKey');
            setLogin(
              meRes.data.nickname,
              token,
              rawApiKey === null ? undefined : rawApiKey,
              currentUserId,
              undefined
            );
          }
        }

        // 2. 스토리 피드 — 세션 프로필 URL은 syncMyProfileImage(프로필 API)만 갱신.
        // 피드의 본인 행은 캐시/지연으로 옛 URL일 수 있어 세션을 덮어쓰면 프로필 수정 직후 화면이 되돌아감.
        const feedRes = await storyApi.getFeed();
        if (feedRes.resultCode?.includes('-S-') || feedRes.resultCode?.startsWith('200')) {
          const nextFeed = feedRes.data || [];
          setFeed(nextFeed);
        }

        // 3. 내 스토리 목록
        if (currentUserId) {
          try {
            const myStoryRes = await storyApi.getUserStories(currentUserId);
            if (myStoryRes.resultCode?.includes('-S-')) {
              setMyStories(myStoryRes.data || []);
            }
          } catch (storyError: any) {
            console.warn('내 스토리 로드 실패:', storyError.message);
          }
        }
      } catch (error: any) {
        console.error('스토리 데이터 로드 중 오류 발생:', error.message);
      }
    };

    fetchData();
  }, [isLoggedIn, userId, nickname, setLogin]);

  const hasActiveMyStory = myStories.length > 0;
  // 다른 사용자들의 피드 (내 닉네임 중복 제거)
  const otherUsersFeed = feed.filter(item => item.nickname !== nickname);
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
      navigate(`/story/${userId}`);
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
            background: '#dbdbdb',
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
        <div key={item.userId} className="story-bar-item" onClick={() => navigate(`/story/${item.userId}`)}>
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
