import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { userApi, FOLLOW_CHANGED_EVENT } from '../../api/user';
import { isRsDataSuccess } from '../../util/rsData';
import { toggleFollowRelation } from '../../services/followToggle';
import { postApi } from '../../api/post';
import { dmApi } from '../../api/dm';
import { PostLikerResponse } from '../../types/post';
import ProfileAvatar from '../common/ProfileAvatar';
import { useAuthStore } from '../../store/useAuthStore';
import { mergeFollowingHint, useFollowLocalStore } from '../../store/useFollowLocalStore';
import {
  filterMyFollowingsByActiveEdge,
  filterViewerFromOwnersFollowersWhenUnfollowed,
} from '../../services/profileFollowStats';
import type { FollowUserResponse } from '../../types/user';

function mapFollowUsersToRows(list: FollowUserResponse[]) {
  return list.map((followUser) => ({
    id: followUser.userId,
    nickname: followUser.nickname,
    profileImageUrl: followUser.profileImageUrl ?? null,
    isFollowing: mergeFollowingHint(followUser.userId, followUser.isFollowing),
  }));
}

interface UserListModalProps {
  title: string;
  id?: number | null; // 선택적 필드로 변경 및 null 허용
  type: 'followers' | 'followings' | 'likers';
  onClose: () => void;
  /** 프로필 페이지가 이미 가진 목록 — 헤더 숫자·행 수와 맞춘 뒤 서버 재조회로 최신화 */
  seedUsers?: FollowUserResponse[];
  /** 팔로워 모달: 내가 프로필 주인을 팔로우하지 않으면 팔로워 명단에서 본인 행 제거 */
  viewerFollowsProfileOwner?: boolean;
}

const UserListModal: React.FC<UserListModalProps> = ({
  title,
  id,
  type,
  onClose,
  seedUsers,
  viewerFollowsProfileOwner = true,
}) => {
  const navigate = useNavigate();
  const { userId: myUserId } = useAuthStore();
  const [users, setUsers] = useState<Array<{ id: number; nickname: string; profileImageUrl: string | null; isFollowing: boolean }>>(() => {
    if ((type === 'followers' || type === 'followings') && seedUsers != null) {
      let list = seedUsers;
      if (type === 'followings' && id != null) {
        list = filterMyFollowingsByActiveEdge(Number(id), myUserId, seedUsers);
      } else if (type === 'followers' && id != null) {
        list = filterViewerFromOwnersFollowersWhenUnfollowed(
          Number(id),
          myUserId,
          seedUsers,
          viewerFollowsProfileOwner
        );
      }
      return mapFollowUsersToRows(list);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  const fetchUsers = useCallback(async (opts?: { silent?: boolean }) => {
    if (id === undefined || id === null) {
      console.error(`ID가 누락되어 ${title} 목록을 가져올 수 없습니다.`);
      setLoading(false);
      return;
    }

    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      if (type === 'followers') {
        const res = await userApi.getFollowers(id);
        if (!isRsDataSuccess(res)) return;
        let rawUsers = res.data ?? [];
        rawUsers = filterViewerFromOwnersFollowersWhenUnfollowed(
          Number(id),
          myUserId,
          rawUsers,
          viewerFollowsProfileOwner
        );
        setUsers(mapFollowUsersToRows(rawUsers));
      } else if (type === 'followings') {
        const res = await userApi.getFollowings(id);
        if (!isRsDataSuccess(res)) return;
        let rawUsers = res.data ?? [];
        rawUsers = filterMyFollowingsByActiveEdge(Number(id), myUserId, rawUsers);
        setUsers(mapFollowUsersToRows(rawUsers));
      } else {
        const res = await postApi.getLikers(id);
        if (!isRsDataSuccess(res)) return;
        const rawUsers = (res.data?.content ?? []) as PostLikerResponse[];
        setUsers(
          rawUsers.map((u) => ({
            id: u.userId,
            nickname: u.nickname,
            profileImageUrl: null,
            isFollowing: false,
          }))
        );
      }
    } catch (err) {
      console.error(`${title} 로드 실패:`, err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, type, title, myUserId, viewerFollowsProfileOwner]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const followingHints = useFollowLocalStore((s) => s.followingHintByUserId);
  useEffect(() => {
    if (type !== 'followers' && type !== 'followings') return;
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        isFollowing: mergeFollowingHint(u.id, u.isFollowing),
      }))
    );
  }, [followingHints, type]);

  useEffect(() => {
    if (type !== 'followers' && type !== 'followings') return;
    const handleFollowChanged = () => {
      void fetchUsers({ silent: true });
    };
    window.addEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged);
  }, [type, fetchUsers]);

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
    if (processingUserId === userId || myUserId === userId) return;

    const prevFollowing = currentFollowing;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isFollowing: !prevFollowing } : u))
    );
    setProcessingUserId(userId);
    try {
      const r = await toggleFollowRelation(userId, prevFollowing ? 'unfollow' : 'follow', myUserId);
      if (r.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: r.follow.isFollowing } : u))
        );
        void fetchUsers({ silent: true });
      } else if (r.reason === 'busy') {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: prevFollowing } : u))
        );
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: prevFollowing } : u))
        );
        if (r.reason === 'self' || r.reason === 'failed') {
          alert(r.message || '팔로우 처리에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: prevFollowing } : u))
      );
      alert('팔로우 처리에 실패했습니다.');
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
            users.map((user) => {
              const effectiveFollowing = followingHints[user.id] ?? user.isFollowing;
              return (
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
                <ProfileAvatar authorUserId={user.id} profileImageUrl={user.profileImageUrl} nickname={user.nickname} sizePx={44} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.nickname}</span>
                </div>
                {(type === 'followers' || type === 'followings') && myUserId !== user.id && (
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
                      onClick={(e) => handleFollowToggle(user.id, effectiveFollowing, e)}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '4px',
                        background: effectiveFollowing ? '#efefef' : '#0095f6',
                        color: effectiveFollowing ? '#262626' : '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        opacity: processingUserId === user.id ? 0.7 : 1
                      }}
                    >
                      {effectiveFollowing ? '언팔로우' : '팔로우'}
                    </button>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;
