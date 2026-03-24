// src/components/story/StoryBar.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react'; 
import { storyApi } from '../../api/story';
import { authApi } from '../../api/auth';
import { StoryFeedResponse, StoryDetailResponse } from '../../types/story';
import { useAuthStore } from '../../store/useAuthStore';

const StoryBar: React.FC = () => {
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);
  const [myStories, setMyStories] = useState<StoryDetailResponse[]>([]);
  const navigate = useNavigate();
  const { nickname, isLoggedIn, userId, setLogin } = useAuthStore();
  
  useEffect(() => {
    const fetchData = async () => {
      // 1. 로그인 상태 확인 (비로그인 상태에서는 실행 안 함)
      if (!isLoggedIn) return;

      try {
        // 2. 전체 스토리 피드 조회
        const feedRes = await storyApi.getFeed();
        if (feedRes.resultCode.startsWith('200') || feedRes.resultCode.includes('-S-')) {
          setFeed(feedRes.data);
        }

        // 3. 내 정보(userId) 확인 및 누락 시 조회
        let currentUserId = userId;
        if (!currentUserId) {
          try {
            const meRes = await authApi.me();
            if (meRes.resultCode.startsWith('200') || meRes.resultCode.includes('-S-')) {
              currentUserId = meRes.data.id;
              // 스토어 업데이트 (기존 토큰/키 유지하며 ID만 보강)
              const token = localStorage.getItem('accessToken') || '';
              const apiKey = localStorage.getItem('apiKey');
              setLogin(meRes.data.nickname, token, apiKey, currentUserId);
            }
          } catch (meError: any) {
            console.error('내 정보 조회 실패 (인증 확인 필요):', meError.response?.data || meError.message);
          }
        }

        // 4. 내 스토리 목록 조회 (ID가 확보된 경우만)
        if (currentUserId) {
          const myStoryRes = await storyApi.getUserStories(currentUserId);
          if (myStoryRes.resultCode.startsWith('200') || myStoryRes.resultCode.includes('-S-')) {
            setMyStories(myStoryRes.data);
          }
        }
      } catch (error: any) {
        // 상세 에러 로깅 (401 에러 원인 분석용)
        const errorDetail = error.response?.data || error.message;
        console.error('스토리 데이터 로드 중 오류 발생:', errorDetail);
        
        if (error.response?.status === 401) {
          console.warn('인증 세션이 만료되었거나 토큰이 유효하지 않습니다.');
        }
      }
    };

    fetchData();
  }, [isLoggedIn]); // 의존성을 최소화하여 무한 루프 방지

  // 내 스토리 활성화 여부
  const hasActiveMyStory = myStories.length > 0;
  // 다른 사용자들의 피드 (내 닉네임 중복 제거)
  const otherUsersFeed = feed.filter(item => item.nickname !== nickname);

  const handleMyStoryClick = () => {
    if (hasActiveMyStory && userId) {
      navigate(`/story/${userId}`);
    } else {
      navigate('/story/create');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '15px', 
      overflowX: 'auto', 
      padding: '12px 15px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #dbdbdb'
    }} className="story-container">
      <style>{`
        .story-container::-webkit-scrollbar { display: none; }
        .story-container { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* 1. 내 프로필 (항상 첫 번째 고정) */}
      <div 
        style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, width: '74px' }}
        onClick={handleMyStoryClick}
      >
        <div style={{ 
          width: '70px', 
          height: '70px', 
          borderRadius: '50%', 
          padding: '2.5px',
          background: hasActiveMyStory 
            ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
            : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: hasActiveMyStory ? '2px solid #fff' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#8e8e8e',
            overflow: 'hidden',
            backgroundColor: '#efefef'
          }}>
            {nickname ? nickname[0].toUpperCase() : 'U'}
          </div>

          {!hasActiveMyStory && (
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              backgroundColor: '#0095f6',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
              zIndex: 2
            }}>
              <Plus size={14} color="#fff" strokeWidth={3} />
            </div>
          )}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          marginTop: '6px', 
          color: hasActiveMyStory ? '#262626' : '#8e8e8e',
          fontWeight: hasActiveMyStory ? '600' : '400',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>내 스토리</div>
      </div>

      {/* 2. 다른 사용자들의 스토리 */}
      {otherUsersFeed.map((item) => (
        <div 
          key={item.userId} 
          style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, width: '74px' }}
          onClick={() => navigate(`/story/${item.userId}`)}
        >
          <div style={{ 
            width: '70px', 
            height: '70px', 
            borderRadius: '50%', 
            padding: '2.5px',
            background: item.isUnread 
              ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
              : '#dbdbdb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#8e8e8e',
              overflow: 'hidden',
              backgroundColor: '#efefef'
            }}>
              {item.profileImageUrl ? (
                <img src={item.profileImageUrl} alt={item.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                item.nickname[0].toUpperCase()
              )}
            </div>
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            marginTop: '6px', 
            color: '#262626',
            overflow: 'hidden',
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap'
          }}>{item.nickname}</div>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
