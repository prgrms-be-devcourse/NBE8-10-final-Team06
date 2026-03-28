import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, MessageSquare, X, Check } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { userApi } from '../../api/user';
import { useDmStore } from '../../store/useDmStore';
import BottomNav from '../../components/layout/BottomNav';
import { UserSearchResponse } from '../../types/user';
import ProfileAvatar from '../../components/common/ProfileAvatar';

const DmListPage: React.FC = () => {
  const { rooms, setRooms, markAsRead } = useDmStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  
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

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await userApi.searchUsers(searchKeyword);
        if (res.resultCode.startsWith('200')) {
          setSearchResults(res.data.content);
        }
      } catch (err) { console.error(err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSearchKeyword('');
    setSearchResults([]);
    setSelectedUserIds([]);
    setGroupName('');
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateRoom = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      let res;
      if (selectedUserIds.length === 1) {
        res = await dmApi.create1v1Room(selectedUserIds[0]);
      } else {
        res = await dmApi.createGroupRoom(selectedUserIds, groupName.trim() || undefined);
      }
      if (res.resultCode.startsWith('200')) {
        closeCreateModal();
        navigate(`/dm/${res.data.roomId}`);
      }
    } catch (err) {
      alert('채팅방 생성에 실패했습니다.');
    }
  };

  const handleLeaveRoom = async (e: React.MouseEvent, roomId: number, isGroup: boolean) => {
    e.stopPropagation();
    if (!window.confirm('정말 이 채팅방을 나가시겠습니까?')) return;
    try {
      const res = isGroup ? await dmApi.leaveGroupRoom(roomId) : await dmApi.leave1v1Room(roomId);
      if (res.resultCode.startsWith('200')) {
        setRooms(rooms.filter(r => r.roomId !== roomId));
      }
    } catch (err) {
      alert('방 나가기 실패');
    }
  };

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', zIndex: 900 }}>
        <div style={{ maxWidth: '935px', margin: '0 auto', height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={24} color="#262626" /></button>
          <strong style={{ fontSize: '1rem', fontWeight: 'bold' }}>메시지</strong>
          <button onClick={() => setShowCreateModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Edit size={24} color="#262626" /></button>
        </div>
      </header>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '400px', height: '500px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #dbdbdb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <X size={24} style={{ cursor: 'pointer' }} onClick={closeCreateModal} />
              <strong style={{ fontSize: '1rem' }}>새로운 메시지</strong>
              <button onClick={handleCreateRoom} disabled={selectedUserIds.length === 0} style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer', opacity: selectedUserIds.length > 0 ? 1 : 0.5 }}>다음</button>
            </div>
            {selectedUserIds.length > 1 && (
              <div style={{ padding: '10px 15px', borderBottom: '1px solid #dbdbdb' }}>
                <input placeholder="그룹 이름 (선택 사항)" value={groupName} onChange={(e) => setGroupName(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem' }} />
              </div>
            )}
            <div style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #dbdbdb' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>받는 사람:</span>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {selectedUserIds.map(id => {
                  const user = searchResults.find(u => u.userId === id) || rooms.flatMap(r => r.participants).find(p => p.userId === id);
                  return (
                    <span key={id} style={{ backgroundColor: '#e0f1ff', color: '#0095f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {user?.nickname || id}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleUserSelection(id)} />
                    </span>
                  );
                })}
                <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="검색..." style={{ border: 'none', outline: 'none', fontSize: '0.9rem', minWidth: '50px', flex: 1 }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.map(user => (
                <div key={user.userId} onClick={() => toggleUserSelection(user.userId)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', cursor: 'pointer' }}>
                  <ProfileAvatar authorUserId={user.userId} profileImageUrl={user.profileImageUrl} nickname={user.nickname} sizePx={44} />
                  <div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.nickname}</div></div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: selectedUserIds.includes(user.userId) ? '#0095f6' : 'transparent' }}>
                    {selectedUserIds.includes(user.userId) && <Check size={16} color="#fff" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <div key={room.roomId} onClick={() => { markAsRead(room.roomId); navigate(`/dm/${room.roomId}`); }} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', cursor: 'pointer', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {room.participants[0] ? (
                      <ProfileAvatar
                        fillContainer
                        authorUserId={room.participants[0].userId}
                        profileImageUrl={room.participants[0].profileImageUrl}
                        nickname={room.participants[0].nickname}
                      />
                    ) : (
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{room.roomName ? room.roomName[0].toUpperCase() : '?'}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#262626' }}>{room.roomName}</div>
                    <div style={{ fontSize: '0.85rem', color: room.unreadCount > 0 ? '#262626' : '#8e8e8e', fontWeight: room.unreadCount > 0 ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{room.lastMessage?.content || '대화 내용이 없습니다.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {room.unreadCount > 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0095f6' }} />}
                  <button onClick={(e) => handleLeaveRoom(e, room.roomId, room.isGroup)} style={{ color: '#ed4956', background: 'none', border: '1px solid #ed4956', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>나가기</button>
                </div>
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
