import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storyApi } from '../../api/story';
import { StoryDetailResponse } from '../../types/story';

const StoryViewer: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryDetailResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
          alert('스토리를 불러올 수 없습니다.');
          navigate('/');
        }
      };
      fetchStories();
    }
  }, [userId, navigate]);

  const currentStory = stories[currentIndex];

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      storyApi.recordView(stories[nextIdx].storyId);
    } else {
      navigate('/');
    }
  };

  if (!currentStory) return <div>로딩 중...</div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'black', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: '20px', width: '90%', display: 'flex', gap: '2px' }}>
        {stories.map((_, idx) => (
          <div key={idx} style={{ height: '2px', flex: 1, backgroundColor: idx <= currentIndex ? 'white' : 'gray' }} />
        ))}
      </div>
      
      <div style={{ position: 'absolute', top: '40px', left: '20px' }}>
        <strong>User: {currentStory.userId}</strong>
      </div>

      <div style={{ width: '100%', maxWidth: '500px', height: '80vh', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 실제 파일 URL은 백엔드 스토리지 서비스 URL을 따라야 함. 현재는 텍스트로 대체 가능성 확인 필요 */}
        <p>{currentStory.content || '스토리 내용 없음'}</p>
        <p style={{ fontSize: '0.8rem' }}>Story ID: {currentStory.storyId}</p>
      </div>

      <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px' }}>
        <button onClick={() => navigate('/')}>닫기</button>
        <button onClick={handleNext}>다음</button>
      </div>
    </div>
  );
};

export default StoryViewer;
