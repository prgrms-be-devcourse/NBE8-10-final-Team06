// src/pages/story/StoryViewer.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, X, Users, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { storyApi } from '../../api/story';
import { dmApi } from '../../api/dm'; // DM API 추가
import { StoryDetailResponse, StoryFeedResponse } from '../../types/story';
import { useAuthStore } from '../../store/useAuthStore';

const STORY_DURATION = 5000;

const StoryViewer: React.FC = () => {
  const { userId: targetUserIdStr } = useParams<{ userId: string }>();
  const targetUserId = Number(targetUserIdStr);
  const navigate = useNavigate();
  
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
  const [replyText, setReplyText] = useState(''); // 답장 텍스트 추가
  
  const { userId: loggedInUserId } = useAuthStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const isImage = (mediaType: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    return imageExtensions.includes(mediaType.toLowerCase());
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return `http://localhost:8080${url.startsWith('/') ? '' : '/'}${url}`;
  };

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
          storyApi.recordView(res.data[0].storyId);
        } else {
          navigate('/');
        }
      } catch (error) {
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [targetUserId, navigate]);

  useEffect(() => {
    if (stories.length === 0 || isLoading || showStats || isPaused || showMenu || replyText.length > 0) {
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
  }, [currentIndex, stories, isLoading, showStats, isPaused, showMenu, replyText]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      storyApi.recordView(stories[currentIndex + 1].storyId);
    } else {
      const feedUserIds = feed.map(u => u.userId);
      let sequence = [...feedUserIds];
      if (loggedInUserId && !feedUserIds.includes(loggedInUserId)) sequence = [loggedInUserId, ...feedUserIds];
      const currentIdx = sequence.indexOf(targetUserId);
      if (currentIdx !== -1 && currentIdx < sequence.length - 1) {
        navigate(`/story/${sequence[currentIdx + 1]}`);
      } else {
        navigate('/');
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

  // 답장 전송 핸들러
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;

    try {
      const res = await dmApi.create1v1Room(currentStory.userId);
      if (res.resultCode.startsWith('200')) {
        alert(`${currentStory.userId}님께 답장을 보냈습니다 (기능 데모)`);
        setReplyText('');
      }
    } catch (error) {
      alert('답장 전송 실패');
    }
  };

  const handleDelete = async () => {
    if (!currentStory || !window.confirm('삭제하시겠습니까?')) return;
    try {
      const res = await storyApi.softDelete(currentStory.storyId);
      if (res.resultCode.startsWith('200')) {
        const updated = stories.filter((_, idx) => idx !== currentIndex);
        if (updated.length === 0) navigate('/');
        else {
          setStories(updated);
          setCurrentIndex(prev => Math.min(prev, updated.length - 1));
          setProgress(0);
          setShowMenu(false);
        }
      }
    } catch (err) { alert('오류 발생'); }
  };

  const currentStory = stories[currentIndex];
  const isOwner = loggedInUserId === currentStory?.userId;

  if (isLoading || !currentStory) return <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>로딩 중...</div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#1a1a1a', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>{currentStory.userId}</div>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>User {isOwner ? '나' : currentStory.userId}</span>
        {isOwner && <button onClick={() => { setShowMenu(!showMenu); setShowStats(false); }} style={{ marginLeft: 'auto', marginRight: '10px', background: 'none', border: 'none', color: '#fff' }}><MoreHorizontal size={24} /></button>}
        <button onClick={() => navigate('/')} style={{ marginLeft: isOwner ? '0' : 'auto', background: 'none', border: 'none', color: '#fff' }}><X size={28} /></button>
      </div>

      {/* 메뉴/통계창 (생략 로직 동일) */}
      {showMenu && isOwner && (
        <div style={{ position: 'absolute', top: '70px', right: '20px', backgroundColor: '#fff', borderRadius: '12px', zIndex: 3100, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px 20px', border: 'none', background: 'none', color: '#ed4956', fontWeight: 'bold' }}><Trash2 size={18} /> 삭제</button>
        </div>
      )}

      {/* 미디어 영역 */}
      <div 
        onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}
        style={{ width: '100%', maxWidth: '450px', height: '85vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}
      >
        {isImage(currentStory.mediaType) ? <img src={getFullUrl(currentStory.mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <video src={getFullUrl(currentStory.mediaUrl)} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        <div onClick={handlePrev} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%' }} />
        <div onClick={handleNext} style={{ position: 'absolute', right: 0, top: 0, width: '70%', height: '100%' }} />
      </div>

      {/* 하단 인터랙션 (답장하기 기능 추가) */}
      <div style={{ position: 'absolute', bottom: '20px', width: '95%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 10px' }}>
        {isOwner ? (
          <div onClick={() => setShowStats(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}><Users size={20} /> 조회 {currentStory.viewers.length}명</div>
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
        <button onClick={() => storyApi.toggleLike(currentStory.storyId)} style={{ background: 'none', border: 'none', color: currentStory.isLiked ? '#ed4956' : '#fff' }}><Heart size={28} fill={currentStory.isLiked ? '#ed4956' : 'none'} /></button>
      </div>

      {/* 통계창 시트 (생략) */}
      {showStats && isOwner && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', backgroundColor: '#fff', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', zIndex: 3000, padding: '20px', color: '#000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', fontWeight: 'bold' }}>
              <span onClick={() => setActiveTab('views')} style={{ borderBottom: activeTab === 'views' ? '2px solid #000' : 'none' }}>조회 {currentStory.viewers.length}</span>
              <span onClick={() => setActiveTab('likes')} style={{ borderBottom: activeTab === 'likes' ? '2px solid #000' : 'none' }}>좋아요 {currentStory.likers.length}</span>
            </div>
            <X onClick={() => setShowStats(false)} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {(activeTab === 'views' ? currentStory.viewers : currentStory.likers).map(user => (
              <div key={user.userId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.nickname[0]}</div>
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
