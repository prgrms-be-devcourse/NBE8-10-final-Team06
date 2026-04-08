import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, MessageSquare, X, Check } from 'lucide-react';
import { dmApi } from '../../api/dm';
import { userApi } from '../../api/user';
import { useDmStore } from '../../store/useDmStore';
import { useAuthStore } from '../../store/useAuthStore';
import BottomNav from '../../components/layout/BottomNav';
import { UserSearchResponse } from '../../types/user';
import type { DmRoomSummaryResponse } from '../../types/dm';
import ProfileAvatar from '../../components/common/ProfileAvatar';
import { formatDmPeerNickname } from '../../util/dmPeerDisplayName';
import { isDmSharedStoryContentExpired } from '../../util/dmStoryShareExpiry';

function dmMessagePreview(room: DmRoomSummaryResponse): string {
  const msg = room.lastMessage;
  if (!msg) return '대화 내용이 없습니다.';
  if (msg.type === 'POST') return '게시글을 공유했습니다.';
  if (msg.type === 'STORY') {
    if (!msg.valid || isDmSharedStoryContentExpired(msg.content)) return '만료된 스토리입니다.';
    return '스토리를 공유했습니다.';
  }
  if (msg.type === 'IMAGE') return '사진을 공유했습니다.';
  return msg.content;
}

function roomListTitle(room: DmRoomSummaryResponse, myUserId: number | null): string {
  if (room.isGroup) return room.roomName || '그룹 채팅';
  // GET /dm/rooms 요약은 본인을 participants 에서 제외하므로 1:1 에서 단일 요소가 곧 상대
  if (room.participants.length === 1) {
    const p = room.participants[0];
    return p ? formatDmPeerNickname(p.nickname) : room.roomName ?? '채팅';
  }
  const my = myUserId != null ? Number(myUserId) : NaN;
  const other = room.participants.find((p) => Number(p.userId) !== my);
  return other ? formatDmPeerNickname(other.nickname) : room.roomName ?? '채팅';
}

function resolveParticipantDisplayLabel(
  userId: number,
  indexZeroBased: number,
  selectedUserMap: Map<number, UserSearchResponse>,
  searchResults: UserSearchResponse[],
  rooms: DmRoomSummaryResponse[]
): string {
  const user =
    selectedUserMap.get(userId) ||
    searchResults.find((u) => u.userId === userId) ||
    rooms.flatMap((r) => r.participants).find((p) => p.userId === userId);
  const nick = user?.nickname?.trim();
  return nick && nick.length > 0 ? nick : `참여자${indexZeroBased + 1}`;
}

function buildDefaultGroupRoomName(
  selectedUserIds: number[],
  selectedUserMap: Map<number, UserSearchResponse>,
  searchResults: UserSearchResponse[],
  rooms: DmRoomSummaryResponse[]
): string {
  const labels = selectedUserIds.map((id, i) =>
    resolveParticipantDisplayLabel(id, i, selectedUserMap, searchResults, rooms)
  );
  return `${labels.join(', ')} 의 채팅방`;
}

const DmListPage: React.FC = () => {
  const myUserId = useAuthStore((s) => s.userId);
  const { rooms, setRooms, markAsRead } = useDmStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedUserMap, setSelectedUserMap] = useState<Map<number, UserSearchResponse>>(new Map());
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

  useEffect(() => {
    if (searchResults.length === 0) return;
    setSelectedUserMap((prev) => {
      const next = new Map(prev);
      for (const user of searchResults) {
        if (selectedUserIds.includes(user.userId)) {
          next.set(user.userId, user);
        }
      }
      return next;
    });
  }, [searchResults, selectedUserIds]);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSearchKeyword('');
    setSearchResults([]);
    setSelectedUserIds([]);
    setSelectedUserMap(new Map());
    setGroupName('');
  };

  const toggleUserSelection = (userId: number) => {
    const selectedUser = searchResults.find((u) => u.userId === userId);
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    setSelectedUserMap((prev) => {
      const next = new Map(prev);
      if (selectedUser) {
        next.set(userId, selectedUser);
      } else if (next.has(userId) && selectedUserIds.includes(userId)) {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleCreateRoom = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      let res;
      if (selectedUserIds.length === 1) {
        res = await dmApi.create1v1Room(selectedUserIds[0]);
      } else {
        const trimmed = groupName.trim();
        const name =
          trimmed.length > 0
            ? trimmed
            : buildDefaultGroupRoomName(selectedUserIds, selectedUserMap, searchResults, rooms);
        res = await dmApi.createGroupRoom(selectedUserIds, name);
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
        <div className="app-shell" style={{ height: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={24} color="#262626" /></button>
          <strong style={{ fontSize: '1rem', fontWeight: 'bold' }}>메시지</strong>
          <button onClick={() => setShowCreateModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Edit size={24} color="#262626" /></button>
        </div>
      </header>

      {showCreateModal && (
        <div className="dm-create-modal-overlay" onClick={closeCreateModal} role="presentation">
          <div className="dm-create-modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="dm-create-modal-title">
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #dbdbdb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <X size={24} style={{ cursor: 'pointer' }} onClick={closeCreateModal} />
              <strong id="dm-create-modal-title" style={{ fontSize: '1rem' }}>새로운 메시지</strong>
              <button onClick={handleCreateRoom} disabled={selectedUserIds.length === 0} style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer', opacity: selectedUserIds.length > 0 ? 1 : 0.5 }}>다음</button>
            </div>
            {selectedUserIds.length > 1 && (
              <div style={{ padding: '10px 15px', borderBottom: '1px solid #dbdbdb' }}>
                <input
                  placeholder="그룹 이름 (비우면 참여자 기준으로 자동 생성)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            )}
            <div style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #dbdbdb' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>받는 사람:</span>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {selectedUserIds.map((id, idx) => {
                  return (
                    <span key={id} style={{ backgroundColor: '#e0f1ff', color: '#0095f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {resolveParticipantDisplayLabel(id, idx, selectedUserMap, searchResults, rooms)}
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

      <main className="app-shell" style={{ backgroundColor: '#fff', minHeight: 'calc(100vh - 60px - 60px)', borderLeft: '1px solid #dbdbdb', borderRight: '1px solid #dbdbdb' }}>
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
            {rooms.map((room) => {
              const peer =
                !room.isGroup && room.participants.length === 1
                  ? room.participants[0]
                  : !room.isGroup && myUserId != null
                    ? room.participants.find((p) => Number(p.userId) !== Number(myUserId))
                    : room.participants[0];
              return (
                <div key={room.roomId} onClick={() => { markAsRead(room.roomId); navigate(`/dm/${room.roomId}`); }} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', cursor: 'pointer', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {peer ? (
                        <ProfileAvatar
                          fillContainer
                          authorUserId={peer.userId}
                          profileImageUrl={peer.profileImageUrl}
                          nickname={formatDmPeerNickname(peer.nickname)}
                        />
                      ) : (
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{room.roomName ? room.roomName[0].toUpperCase() : '?'}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#262626' }}>{roomListTitle(room, myUserId)}</div>
                      <div style={{ fontSize: '0.85rem', color: room.unreadCount > 0 ? '#262626' : '#8e8e8e', fontWeight: room.unreadCount > 0 ? '700' : '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{dmMessagePreview(room)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {room.unreadCount > 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0095f6' }} />}
                    <button onClick={(e) => handleLeaveRoom(e, room.roomId, room.isGroup)} style={{ color: '#ed4956', background: 'none', border: '1px solid #ed4956', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>나가기</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default DmListPage;
