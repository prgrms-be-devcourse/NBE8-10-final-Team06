import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyApi } from '../../api/story';
import { StoryFeedResponse } from '../../types/story';

const StoryBar: React.FC = () => {
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await storyApi.getFeed();
        if (res.resultCode.includes('-S-')) {
          setFeed(res.data);
        }
      } catch (error) {
        console.error('스토리 피드 로드 실패');
      }
    };
    fetchFeed();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      gap: '15px', 
      overflowX: 'auto', 
      padding: '12px 15px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #dbdbdb'
    }}>
      <style>{`
        .story-container::-webkit-scrollbar { display: none; }
        .story-container { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div className="story-container" style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
        {feed.map((item) => (
          <div 
            key={item.userId} 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer',
              flexShrink: 0,
              width: '74px'
            }}
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
                  <img 
                    src={item.profileImageUrl} 
                    alt={item.nickname} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
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
            }}>
              {item.nickname}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryBar;
