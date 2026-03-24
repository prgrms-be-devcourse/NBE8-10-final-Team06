import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import { storyApi } from '../../api/story';
import { StoryDetailResponse } from '../../types/story';

const STORY_DURATION = 5000; // 5초

const StoryViewer: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryDetailResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      const fetchStories = async () => {
        try {
          const res = await storyApi.getUserStories(Number(userId));
          if (res.resultCode.includes('-S-') && res.data.length > 0) {
            setStories(res.data);
            // 첫 번째 스토리 시청 기록 전송
            storyApi.recordView(res.data[0].storyId);
          } else {
            alert('활성화된 스토리가 없습니다.');
            navigate('/');
          }
        } catch (error) {
          console.error('스토리 로드 실패:', error);
          navigate('/');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStories();
    }
  }, [userId, navigate]);

  // 자동 전환 및 프로그레스 바 타이머 로직
  useEffect(() => {
    if (stories.length === 0 || isLoading) return;

    // 초기화
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    // 5초 후 다음 스토리 이동 타이머
    timerRef.current = setTimeout(() => {
      handleNext();
    }, STORY_DURATION);

    // 프로그레스 바 업데이트 (10ms 단위로 정밀하게)
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = Math.min((elapsedTime / STORY_DURATION) * 100, 100);
      setProgress(currentProgress);
    }, 10);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, stories, isLoading]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      storyApi.recordView(stories[nextIdx].storyId);
    } else {
      navigate('/'); // 모든 스토리 시청 완료 시 홈으로
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleToggleLike = async () => {
    if (!currentStory) return;
    try {
      const res = await storyApi.toggleLike(currentStory.storyId);
      if (res.resultCode.includes('-S-')) {
        setStories(prev => prev.map((s, idx) => 
          idx === currentIndex ? { ...s, isLiked: res.data.isLiked, totalLikeCount: res.data.totalLikeCount } : s
        ));
      }
    } catch (error) {
      console.error('좋아요 처리 실패');
    }
  };

  const currentStory = stories[currentIndex];

  if (isLoading) return <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>로딩 중...</div>;
  if (!currentStory) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#1a1a1a', 
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* 상단 프로그레스 바 */}
      <div style={{ position: 'absolute', top: '15px', width: '95%', maxWidth: '400px', display: 'flex', gap: '4px', zIndex: 2100 }}>
        {stories.map((_, idx) => (
          <div key={idx} style={{ height: '2px', flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%', 
              backgroundColor: '#fff'
            }} />
          </div>
        ))}
      </div>

      {/* 헤더 영역 */}
      <div style={{ position: 'absolute', top: '30px', width: '95%', maxWidth: '400px', display: 'flex', alignItems: 'center', zIndex: 2100, padding: '0 10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {currentStory.userId}
        </div>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          User {currentStory.userId}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginLeft: '10px' }}>
          {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button 
          onClick={() => navigate('/')} 
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={28} />
        </button>
      </div>

      {/* 미디어 영역 */}
      <div style={{ 
        width: '100%', 
        maxWidth: '450px', 
        height: '85vh', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#000'
      }}>
        {currentStory.mediaType === 'IMAGE' ? (
          <img 
            src={currentStory.mediaUrl} 
            alt="스토리" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        ) : (
          <video 
            src={currentStory.mediaUrl} 
            autoPlay 
            muted 
            loop 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        )}

        {/* 좌우 내비게이션 영역 (투명 버튼) */}
        <div 
          onClick={handlePrev} 
          style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', cursor: 'pointer' }} 
        />
        <div 
          onClick={handleNext} 
          style={{ position: 'absolute', right: 0, top: 0, width: '70%', height: '100%', cursor: 'pointer' }} 
        />
      </div>

      {/* 하단 인터랙션 영역 */}
      <div style={{ position: 'absolute', bottom: '20px', width: '95%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '15px', padding: '0 10px' }}>
        <div style={{ flex: 1, height: '44px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', padding: '0 15px', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
          답장하기...
        </div>
        <button 
          onClick={handleToggleLike}
          style={{ background: 'none', border: 'none', color: currentStory.isLiked ? '#ed4956' : '#fff', cursor: 'pointer' }}
        >
          <Heart size={28} fill={currentStory.isLiked ? '#ed4956' : 'none'} />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;
