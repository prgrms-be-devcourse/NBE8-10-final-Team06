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
    if (!isLoggedIn) return;

    const fetchData = async () => {
      try {
        // 1. 전체 스토리 피드 조회
        const feedRes = await storyApi.getFeed();
        if (feedRes.resultCode?.includes('-S-') || feedRes.resultCode?.startsWith('200')) {
          setFeed(feedRes.data);
        }

        // 2. 내 정보 확보
        let currentUserId = userId;
        if (!currentUserId) {
          const meRes = await authApi.me();
          if (meRes.resultCode?.includes('-S-')) {
            currentUserId = meRes.data.id;
            const token = localStorage.getItem('accessToken') || '';
            const apiKey = localStorage.getItem('apiKey');
            setLogin(meRes.data.nickname, token, apiKey, currentUserId);
          }
        }

        // 3. 내 스토리 목록 조회 (일시 중단)
        // [이슈] 백엔드 /api/story/user/{id} 엔드포인트가 현재 서버 설정 문제(-parameters flag)로 고장 상태임.
        // 콘솔 에러 방지를 위해 서버 수정 전까지 호출을 중단함.
        /*
        if (currentUserId) {
          try {
            const myStoryRes = await storyApi.getUserStories(currentUserId);
            if (myStoryRes.resultCode?.includes('-S-')) {
              setMyStories(myStoryRes.data);
            }
          } catch (storyError: any) {
            console.warn('내 스토리 로드 실패 (백엔드 엔드포인트 결함)');
          }
        }
        */
      } catch (error: any) {
        console.error('스토리 데이터 로드 중 오류 발생:', error.message);
      }
    };

    fetchData();
  }, [isLoggedIn]);

  const hasActiveMyStory = myStories.length > 0;
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
      display: 'flex', gap: '15px', overflowX: 'auto', padding: '12px 15px',
      backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb'
    }} className="story-container">
      <style>{`
        .story-container::-webkit-scrollbar { display: none; }
        .story-container { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, width: '74px' }} onClick={handleMyStoryClick}>
        <div style={{ 
          width: '70px', height: '70px', borderRadius: '50%', padding: '2.5px',
          background: hasActiveMyStory 
            ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
            : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', position: 'relative'
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%', border: hasActiveMyStory ? '2px solid #fff' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold',
            color: '#8e8e8e', overflow: 'hidden', backgroundColor: '#efefef'
          }}>
            {nickname ? nickname[0].toUpperCase() : 'U'}
          </div>
          {!hasActiveMyStory && (
            <div style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: '#0095f6', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', zIndex: 2 }}>
              <Plus size={14} color="#fff" strokeWidth={3} />
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#8e8e8e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>내 스토리</div>
      </div>

      {otherUsersFeed.map((item) => (
        <div key={item.userId} style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, width: '74px' }} onClick={() => navigate(`/story/${item.userId}`)}>
          <div style={{ 
            width: '70px', height: '70px', borderRadius: '50%', padding: '2.5px',
            background: item.isUnread ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' : '#dbdbdb',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#8e8e8e', overflow: 'hidden', backgroundColor: '#efefef' }}>
              {item.profileImageUrl ? <img src={item.profileImageUrl} alt={item.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.nickname[0].toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nickname}</div>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
