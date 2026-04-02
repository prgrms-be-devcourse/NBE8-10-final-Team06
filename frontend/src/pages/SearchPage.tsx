import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { userApi, FOLLOW_CHANGED_EVENT } from '../api/user';
import { toggleFollowRelation } from '../services/followToggle';
import { dmApi } from '../api/dm';
import { UserSearchResponse, FollowResponse } from '../types/user';
import { Search, X, History, Clock } from 'lucide-react';
import { searchUtil } from '../util/search';
import { useAuthStore } from '../store/useAuthStore';
import { mergeFollowingHint, useFollowLocalStore } from '../store/useFollowLocalStore';
import ProfileAvatar from '../components/common/ProfileAvatar';

// --- 서브 컴포넌트: 검색 결과 아이템 ---
const SearchResultItem: React.FC<{ 
  user: UserSearchResponse; 
  myNickname: string | null;
  onUserClick: (user: UserSearchResponse) => void;
  onMessageClick: (user: UserSearchResponse) => void;
  onFollowStateChange: (userId: number, isFollowing: boolean) => void;
}> = ({ user: initialUser, myNickname, onUserClick, onMessageClick, onFollowStateChange }) => {
  const [user, setUser] = useState(initialUser);
  const [isProcessing, setIsProcessing] = useState(false);
  const uid = Number(initialUser.userId);
  const hinted = useFollowLocalStore((s) =>
    Number.isFinite(uid) ? s.followingHintByUserId[uid] : undefined
  );
  const following = hinted !== undefined ? hinted : user.isFollowing;

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const isMe = myNickname === user.nickname;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMe || isProcessing) return;

    const { userId: myUserId } = useAuthStore.getState();
    const prevFollowing = following;
    setUser((prev) => ({ ...prev, isFollowing: !prevFollowing }));
    setIsProcessing(true);
    try {
      const r = await toggleFollowRelation(user.userId, prevFollowing ? 'unfollow' : 'follow', myUserId);
      if (r.ok) {
        setUser((prev) => ({ ...prev, isFollowing: r.follow.isFollowing }));
        onFollowStateChange(user.userId, r.follow.isFollowing);
      } else if (r.reason === 'busy') {
        setUser((prev) => ({ ...prev, isFollowing: prevFollowing }));
      } else {
        setUser((prev) => ({ ...prev, isFollowing: prevFollowing }));
        if (r.reason === 'self' || r.reason === 'failed') {
          alert(r.message || '팔로우 처리에 실패했습니다.');
        }
      }
    } catch (err) {
      console.error('팔로우 처리 실패:', err);
      setUser((prev) => ({ ...prev, isFollowing: prevFollowing }));
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      onClick={() => onUserClick(user)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
    >
      <ProfileAvatar
        authorUserId={user.userId}
        profileImageUrl={user.profileImageUrl}
        nickname={user.nickname}
        sizePx={44}
        style={{ border: '1px solid #dbdbdb' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
          {user.nickname} {isMe && <span style={{ color: '#8e8e8e', fontWeight: 'normal' }}>(나)</span>}
        </div>
        {following && !isMe && <div style={{ fontSize: '0.75rem', color: '#0095f6' }}>팔로잉 중</div>}
      </div>
      
      {!isMe && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessageClick(user);
            }}
            style={{
              padding: '6px 10px', borderRadius: '4px', border: '1px solid #dbdbdb',
              backgroundColor: '#fff', color: '#262626', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
            }}
          >
            DM
          </button>
          <button 
            onClick={handleFollowToggle}
            disabled={isProcessing}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: 'none',
              backgroundColor: following ? '#efefef' : '#0095f6',
              color: following ? '#262626' : '#fff',
              fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
              minWidth: '85px', opacity: isProcessing ? 0.7 : 1
            }}
          >
            {following ? '언팔로우' : '팔로우'}
          </button>
        </div>
      )}
    </div>
  );
};

// --- 메인 페이지 컴포넌트 ---
const SearchPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  
  const navigate = useNavigate();
  const { nickname: myNickname } = useAuthStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(searchUtil.getRecentSearches());
    searchInputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async (searchKeyword: string, pageNumber: number = 0) => {
    if (!searchKeyword.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await userApi.searchUsers(searchKeyword, pageNumber);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const content = res.data.content || [];
        const merged = content.map((item: UserSearchResponse) => ({
          ...item,
          isFollowing: mergeFollowingHint(item.userId, item.isFollowing),
        }));
        if (pageNumber === 0) {
          setResults(merged);
        } else {
          setResults((prev) => [...prev, ...merged]);
        }
        setIsLast(res.data.last);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword) handleSearch(keyword, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, handleSearch]);

  useEffect(() => {
    const onFollowChanged = (event: Event) => {
      const detail = (event as CustomEvent<FollowResponse>).detail;
      if (detail && detail.toUserId != null && typeof detail.isFollowing === 'boolean') {
        const tid = Number(detail.toUserId);
        setResults((prev) =>
          prev.map((item) =>
            Number(item.userId) === tid ? { ...item, isFollowing: detail.isFollowing } : item
          )
        );
      }
      const k = keyword.trim();
      if (k) void handleSearch(k, 0);
    };
    window.addEventListener(FOLLOW_CHANGED_EVENT, onFollowChanged);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, onFollowChanged);
  }, [keyword, handleSearch]);

  const loadMore = () => {
    if (!isLast && !isLoading) {
      handleSearch(keyword, page + 1);
    }
  };

  const handleUserClick = (user: UserSearchResponse) => {
    searchUtil.addRecentSearch(user.nickname);
    navigate(`/profile/${user.nickname}`);
  };

  const handleMessageClick = async (user: UserSearchResponse) => {
    try {
      const res = await dmApi.create1v1Room(user.userId);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        navigate(`/dm/${res.data.roomId}`);
      } else {
        alert(res.msg || 'DM 방 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('DM 방 생성 실패:', err);
      alert('DM 방 생성에 실패했습니다.');
    }
  };

  const handleFollowStateChange = (userId: number, isFollowing: boolean) => {
    setResults(prev =>
      prev.map(item =>
        item.userId === userId ? { ...item, isFollowing } : item
      )
    );
  };

  return (
    <MainLayout title="검색" maxWidth="600px">
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8e8e8e' }}>
          <Search size={18} />
        </div>
        <input 
          ref={searchInputRef}
          type="text" 
          placeholder="계정 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            width: '100%', padding: '12px 40px', backgroundColor: '#efefef',
            border: 'none', borderRadius: '8px', outline: 'none', fontSize: '1rem'
          }}
        />
        {keyword && (
          <button 
            onClick={() => { setKeyword(''); setResults([]); }}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#8e8e8e', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="content-area">
        {keyword.trim() ? (
          <>
            <div className="results-list">
              {results.map((user) => (
                <SearchResultItem 
                  key={user.userId} 
                  user={user} 
                  myNickname={myNickname}
                  onUserClick={handleUserClick}
                  onMessageClick={handleMessageClick}
                  onFollowStateChange={handleFollowStateChange}
                />
              ))}
              
              {isLoading && <p style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>검색 중...</p>}
              
              {!isLoading && results.length > 0 && !isLast && (
                <button 
                  onClick={loadMore}
                  style={{ width: '100%', padding: '15px', border: 'none', background: 'none', color: '#0095f6', fontWeight: '600', cursor: 'pointer' }}
                >
                  결과 더 보기
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="recent-searches">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>최근 검색 항목</h3>
              {recentSearches.length > 0 && (
                <button 
                  onClick={() => { searchUtil.clearRecentSearches(); setRecentSearches([]); }}
                  style={{ border: 'none', background: 'none', color: '#0095f6', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  모두 지우기
                </button>
              )}
            </div>
            {recentSearches.map((kw) => (
              <div key={kw} onClick={() => setKeyword(kw)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 0', cursor: 'pointer' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e8e' }}><Clock size={20} /></div>
                <div style={{ flex: 1, fontWeight: '500' }}>{kw}</div>
                <X size={18} color="#8e8e8e" onClick={(e) => { e.stopPropagation(); searchUtil.removeRecentSearch(kw); setRecentSearches(searchUtil.getRecentSearches()); }} style={{ cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SearchPage;
