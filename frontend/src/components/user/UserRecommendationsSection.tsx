import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, FOLLOW_CHANGED_EVENT } from '../../api/user';
import { toggleFollowRelation } from '../../services/followToggle';
import { useAuthStore } from '../../store/useAuthStore';
import { useFollowLocalStore, mergeFollowingHint } from '../../store/useFollowLocalStore';
import type { UserRecommendResponse, FollowResponse } from '../../types/user';
import ProfileAvatar from '../common/ProfileAvatar';

type UserRecommendationsSectionProps = {
  title?: string;
  maxItems?: number;
};

const UserRecommendationsSection: React.FC<UserRecommendationsSectionProps> = ({
  title = '추천',
  maxItems = 5,
}) => {
  const navigate = useNavigate();
  const { userId: myUserId } = useAuthStore();
  const followingHints = useFollowLocalStore((s) => s.followingHintByUserId);

  const [items, setItems] = useState<UserRecommendResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await userApi.getUserRecommendations();
      const raw = Array.isArray(res.data) ? res.data : [];
      const mapped = raw.map((u) => ({
        ...u,
        isFollowing: mergeFollowingHint(u.userId, u.isFollowing),
      }));
      setItems(mapped.slice(0, maxItems));
    } catch (err) {
      setErrorMsg('추천을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // 팔로우 토글 이벤트를 받아 isFollowing 표시를 동기화
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<FollowResponse>).detail;
      if (!detail || typeof detail.isFollowing !== 'boolean') return;
      const tid = Number(detail.toUserId);
      if (!Number.isFinite(tid)) return;
      setItems((prev) => prev.map((u) => (u.userId === tid ? { ...u, isFollowing: detail.isFollowing } : u)));
    };
    window.addEventListener(FOLLOW_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handler);
  }, []);

  const visibleItems = useMemo(() => items, [items]);

  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const handleToggleFollow = async (u: UserRecommendResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    if (myUserId == null) return;
    if (!Number.isFinite(u.userId)) return;
    if (processingUserId === u.userId) return;

    const targetUserId = Number(u.userId);
    const effectiveFollowing = followingHints[targetUserId] ?? u.isFollowing;
    const prevFollowing = effectiveFollowing;

    setProcessingUserId(targetUserId);
    setItems((prev) =>
      prev.map((row) => (row.userId === targetUserId ? { ...row, isFollowing: !prevFollowing } : row))
    );

    try {
      const r = await toggleFollowRelation(targetUserId, prevFollowing ? 'unfollow' : 'follow', myUserId);
      if (r.ok) {
        setItems((prev) => prev.map((row) => (row.userId === targetUserId ? { ...row, isFollowing: r.follow.isFollowing } : row)));
      } else {
        setItems((prev) =>
          prev.map((row) => (row.userId === targetUserId ? { ...row, isFollowing: prevFollowing } : row))
        );
        if (r.reason === 'self' || r.reason === 'failed') {
          alert(r.message || '팔로우 처리에 실패했습니다.');
        }
      }
    } catch {
      setItems((prev) =>
        prev.map((row) => (row.userId === targetUserId ? { ...row, isFollowing: prevFollowing } : row))
      );
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <section
      aria-label={`${title} 유저 추천`}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        border: '1px solid #efefef',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#262626' }}>{title}</h3>
      </div>

      {loading && <p style={{ margin: '10px 0', textAlign: 'center', color: '#8e8e8e' }}>로딩 중...</p>}
      {errorMsg && <p style={{ margin: '10px 0', textAlign: 'center', color: '#ed4956' }}>{errorMsg}</p>}

      {!loading && !errorMsg && visibleItems.length === 0 && (
        <p style={{ margin: '10px 0', textAlign: 'center', color: '#8e8e8e' }}>추천 유저가 없습니다.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visibleItems.map((u) => {
          const effectiveFollowing = followingHints[u.userId] ?? u.isFollowing;
          return (
            <div
              key={u.userId}
              onClick={() => navigate(`/profile/${u.nickname}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 8px',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <ProfileAvatar
                authorUserId={u.userId}
                profileImageUrl={u.profileImageUrl}
                nickname={u.nickname}
                sizePx={44}
                style={{ border: '1px solid #dbdbdb' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.nickname}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => void handleToggleFollow(u, e)}
                disabled={processingUserId === u.userId}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: effectiveFollowing ? '#efefef' : '#0095f6',
                  color: effectiveFollowing ? '#262626' : '#fff',
                  cursor: processingUserId === u.userId ? 'wait' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  minWidth: 86,
                  opacity: processingUserId === u.userId ? 0.7 : 1,
                }}
              >
                {effectiveFollowing ? '언팔로우' : '팔로우'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UserRecommendationsSection;

