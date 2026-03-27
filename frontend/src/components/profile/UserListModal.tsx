import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { userApi, FOLLOW_CHANGED_EVENT } from '../../api/user';
import { postApi } from '../../api/post';
import { dmApi } from '../../api/dm';
import { FollowUserResponse } from '../../types/user';
import { PostLikerResponse } from '../../types/post';
import { applyImageFallback, resolveProfileImageUrl } from '../../util/assetUrl';

interface UserListModalProps {
  title: string;
  id?: number | null; // 선택적 필드로 변경 및 null 허용
  type: 'followers' | 'followings' | 'likers';
  onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ title, id, type, onClose }) => {
  const [users, setUsers] = useState<Array<{ id: number; nickname: string; profileImageUrl: string | null; isFollowing: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    if (id === undefined || id === null) {
      console.error(`ID가 누락되어 ${title} 목록을 가져올 수 없습니다.`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let res;
      if (type === 'followers') res = await userApi.getFollowers(id);
      else if (type === 'followings') res = await userApi.getFollowings(id);
      else res = await postApi.getLikers(id);

      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const rawUsers: Array<FollowUserResponse | PostLikerResponse> =
          type === 'likers'
            ? ((res.data.content ?? []) as PostLikerResponse[])
            : (res.data as FollowUserResponse[]);

        const normalized = rawUsers.map((u) => {
          if (type === 'likers') {
            return {
              id: u.userId,
              nickname: u.nickname,
              profileImageUrl: null,
              isFollowing: false
            };
          }

          const followUser = u as FollowUserResponse;
          return {
            id: followUser.userId,
            nickname: followUser.nickname,
            profileImageUrl: followUser.profileImageUrl ?? null,
            isFollowing: followUser.isFollowing
          };
        });
        setUsers(normalized);
      }
    } catch (err) {
      console.error(`${title} 로드 실패:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [id, type, title]);

  useEffect(() => {
    if (type !== 'followers' && type !== 'followings') return;
    const handleFollowChanged = () => {
      fetchUsers();
    };
    window.addEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
  }, [type, id, title]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDmClick = async (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await dmApi.create1v1Room(userId);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        onClose();
        navigate(`/dm/${res.data.roomId}`);
      } else {
        alert(res.msg || 'DM 방 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('DM 방 생성 실패:', err);
      alert('DM 방 생성에 실패했습니다.');
    }
  };

  const handleFollowToggle = async (userId: number, currentFollowing: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingUserId === userId) return;

    const desiredState = !currentFollowing;
    try {
      setProcessingUserId(userId);
      const statusRes = await userApi.isFollowing(userId);
      const serverFollowing = statusRes.data;

      if (serverFollowing === desiredState) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isFollowing: serverFollowing } : u)));
        return;
      }

      if (desiredState) {
        await userApi.follow(userId);
      } else {
        await userApi.unfollow(userId);
      }

      const syncRes = await userApi.isFollowing(userId);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isFollowing: syncRes.data } : u)));
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
      try {
        const syncRes = await userApi.isFollowing(userId);
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isFollowing: syncRes.data } : u)));
      } catch {
        alert('팔로우 처리에 실패했습니다.');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 2000
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        width: '400px', maxHeight: '400px', backgroundColor: '#fff',
        borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 15px', borderBottom: '1px solid #dbdbdb'
        }}>
          <div style={{ width: '24px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{title}</h3>
          <X size={24} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {!id ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#ed4956' }}>유효하지 않은 요청입니다.</p>
          ) : loading ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>로딩 중...</p>
          ) : users.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>목록이 비어있습니다.</p>
          ) : (
            users.map(user => (
              <div 
                key={user.id} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', 
                  padding: '8px 15px', cursor: 'pointer' 
                }}
                onClick={() => {
                  navigate(`/profile/${user.nickname}`);
                  onClose();
                }}
              >
                <img 
                  src={resolveProfileImageUrl(user.profileImageUrl)} 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} 
                  alt={user.nickname} 
                  onError={(e) => applyImageFallback(e, user.profileImageUrl)}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.nickname}</span>
                </div>
                {(type === 'followers' || type === 'followings') && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleDmClick(user.id, e)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #dbdbdb',
                        borderRadius: '4px',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      DM
                    </button>
                    <button
                      type="button"
                      disabled={processingUserId === user.id}
                      onClick={(e) => handleFollowToggle(user.id, user.isFollowing, e)}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '4px',
                        background: user.isFollowing ? '#efefef' : '#0095f6',
                        color: user.isFollowing ? '#262626' : '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        opacity: processingUserId === user.id ? 0.7 : 1
                      }}
                    >
                      {processingUserId === user.id ? '...' : (user.isFollowing ? '언팔로우' : '팔로우')}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;
