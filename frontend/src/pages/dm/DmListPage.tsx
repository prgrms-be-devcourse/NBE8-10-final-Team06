import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dmApi } from '../../api/dm';
import { DmRoomSummaryResponse } from '../../types/dm';

const DmListPage: React.FC = () => {
  const [rooms, setRooms] = useState<DmRoomSummaryResponse[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await dmApi.getRooms();
        if (res.resultCode.includes('-S-')) {
          setRooms(res.data);
        }
      } catch (error) {
        console.error('방 목록 로드 실패');
      }
    };
    fetchRooms();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>채팅</h1>
      <div style={{ borderTop: '1px solid #dbdbdb' }}>
        {rooms.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>참여 중인 대화방이 없습니다.</p>
        ) : (
          rooms.map((room) => (
            <div 
              key={room.roomId} 
              onClick={() => navigate(`/dm/${room.roomId}`)}
              style={{ padding: '15px', borderBottom: '1px solid #dbdbdb', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <strong>{room.roomName || '이름 없는 대화방'}</strong> ({room.participantCount})
                <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#8e8e8e' }}>{room.lastMessage || '새 대화방이 생성되었습니다.'}</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#8e8e8e' }}>
                {room.unreadCount > 0 && <span style={{ backgroundColor: '#0095f6', color: 'white', padding: '2px 6px', borderRadius: '10px', marginRight: '5px' }}>{room.unreadCount}</span>}
                {room.lastMessageAt && new Date(room.lastMessageAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DmListPage;
