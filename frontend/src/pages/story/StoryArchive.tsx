// src/pages/story/StoryArchive.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar } from 'lucide-react';
import { storyApi } from '../../api/story';
import { StoryDetailResponse } from '../../types/story';

const StoryArchive: React.FC = () => {
  const [archivedStories, setArchivedStories] = useState<StoryDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const res = await storyApi.getArchive();
        if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
          setArchivedStories(res.data);
        }
      } catch (error) {
        console.error('아카이브 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchive();
  }, []);

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return url;
    return `/uploads/${url}`;
  };

  const getFallbackUrl = (url: string) => {
    if (!url || url.startsWith('http')) return '';
    if (url.startsWith('/uploads/')) return url.replace('/uploads/', '/temp/media/');
    if (url.startsWith('/temp/media/')) return url.replace('/temp/media/', '/uploads/');
    return `/temp/media/${url}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      {/* 헤더 */}
      <header style={{ 
        height: '50px', display: 'flex', alignItems: 'center', 
        padding: '0 15px', borderBottom: '1px solid #efefef',
        position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
          <ChevronLeft size={28} color="#262626" />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1rem', fontWeight: 'bold', marginRight: '38px' }}>
          보관된 스토리
        </h1>
      </header>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>로딩 중...</div>
      ) : (
        <main style={{ padding: '2px' }}>
          {archivedStories.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#8e8e8e' }}>
              <Calendar size={48} style={{ marginBottom: '15px' }} strokeWidth={1} />
              <p>보관된 스토리가 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
              {archivedStories.map((story) => (
                <div 
                  key={story.storyId} 
                  style={{ aspectRatio: '9/16', backgroundColor: '#efefef', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => navigate(`/story/archive/${story.storyId}`)} // 보관함 상세 보기 (추후 구현 가능)
                >
                  {story.mediaType.toLowerCase().includes('mp4') ? (
                    <video
                      src={getFullUrl(story.mediaUrl)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const video = e.currentTarget;
                        if (video.dataset.fallbackApplied === '1') return;
                        const fallback = getFallbackUrl(story.mediaUrl);
                        if (fallback) {
                          video.dataset.fallbackApplied = '1';
                          video.src = fallback;
                          video.load();
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={getFullUrl(story.mediaUrl)}
                      alt="보관된 스토리"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === '1') return;
                        const fallback = getFallbackUrl(story.mediaUrl);
                        if (fallback) {
                          img.dataset.fallbackApplied = '1';
                          img.src = fallback;
                        }
                      }}
                    />
                  )}
                  <div style={{ 
                    position: 'absolute', bottom: '8px', left: '8px', 
                    color: '#fff', fontSize: '0.7rem', fontWeight: 'bold',
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                  }}>
                    {new Date(story.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
};

export default StoryArchive;
