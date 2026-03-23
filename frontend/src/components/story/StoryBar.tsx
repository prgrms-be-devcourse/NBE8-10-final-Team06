import React, { useEffect, useState } from 'react';
import { storyApi } from '../../api/story';
import { StoryFeedResponse } from '../../types/story';

const StoryBar: React.FC = () => {
  const [feed, setFeed] = useState<StoryFeedResponse[]>([]);

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
    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 0', borderBottom: '1px solid #dbdbdb' }}>
      {feed.map((item) => (
        <div 
          key={item.userId} 
          style={{ textAlign: 'center', cursor: 'pointer' }}
          onClick={() => window.location.href = `/story/${item.userId}`}
        >
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            border: `2px solid ${item.isUnread ? '#0095f6' : '#dbdbdb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#efefef',
            fontSize: '0.7rem'
          }}>
            {item.nickname[0]}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>{item.nickname}</div>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
