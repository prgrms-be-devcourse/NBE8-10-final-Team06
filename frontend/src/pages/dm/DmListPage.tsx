// src/pages/dm/DmListPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, MessageSquare } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { useDmStore } from '../../store/useDmStore';
import BottomNav from '../../components/layout/BottomNav';

const DmListPage: React.FC = () => {
  const { rooms, setRooms, markAsRead } = useDmStore();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await dmApi.getRooms();
        if (res.resultCode.startsWith('200')) {
          setRooms(res.data);
        }
      } catch (err) {
        console.error('채팅방 목록 로드 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, [setRooms]);

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #dbdbdb',
        zIndex: 900
      }}>
        <div style={{
          maxWidth: '935px',
          margin: '0 auto',
          height: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={24} color="#262626" />
          </button>
          <strong style={{ fontSize: '1rem', fontWeight: 'bold' }}>메시지</strong>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Edit size={24} color="#262626" />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '935px', margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 60px - 60px)', borderLeft: '1px solid #dbdbdb', borderRight: '1px solid #dbdbdb' }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>로딩 중...</p>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <MessageSquare size={40} color="#262626" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>내 메시지</h3>
            <p style={{ color: '#8e8e8e', fontSize: '0.9rem' }}>친구에게 비밀 메시지를 보내보세요.</p>
          </div>
        ) : (
          <div style={{ padding: '10px 0' }}>
            {rooms.map(room => (
              <div 
                key={room.roomId} 
                onClick={() => {
                  markAsRead(room.roomId); // 1. 즉시 로컬 상태 업데이트 (파란 점 제거)
                  navigate(`/dm/${room.roomId}`); // 2. 페이지 이동
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', cursor: 'pointer' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {room.participants[0]?.profileImageUrl ? (
                    <img src={room.participants[0].profileImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{room.roomName[0].toUpperCase()}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#262626' }}>{room.roomName}</div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: room.unreadCount > 0 ? '#262626' : '#8e8e8e', 
                    fontWeight: room.unreadCount > 0 ? '700' : '400',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px'
                  }}>
                    {room.lastMessage?.content || '대화 내용이 없습니다.'}
                  </div>
                </div>
                {room.unreadCount > 0 && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0095f6' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default DmListPage;
