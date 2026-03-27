import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { userApi, FOLLOW_CHANGED_EVENT } from '../api/user';
import { dmApi } from '../api/dm';
import { UserSearchResponse } from '../types/user';
import { Search, X, History, UserCheck, Clock, UserPlus, UserMinus } from 'lucide-react';
import { searchUtil } from '../util/search';
import { useAuthStore } from '../store/useAuthStore';

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

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const isMe = myNickname === user.nickname;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMe || !user.userId || isProcessing) return;

    const targetId = Number(user.userId);
    const desiredState = !user.isFollowing;

    try {
      setIsProcessing(true);

      // 1) 서버 기준 현재 상태를 먼저 확인해 중복 요청 방지
      const statusRes = await userApi.isFollowing(targetId);
      const serverFollowing = statusRes.data;

      // 2) 이미 원하는 상태면 API 호출 없이 UI만 동기화
      if (serverFollowing === desiredState) {
        setUser(prev => ({ ...prev, isFollowing: serverFollowing }));
        onFollowStateChange(targetId, serverFollowing);
        window.dispatchEvent(new CustomEvent(FOLLOW_CHANGED_EVENT));
        return;
      }

      // 3) 서버 상태와 반대일 때만 토글 API 호출
      const res = desiredState
        ? await userApi.follow(targetId)
        : await userApi.unfollow(targetId);

      if (res.resultCode?.startsWith('200')) {
        setUser(prev => ({ ...prev, isFollowing: res.data.isFollowing }));
        onFollowStateChange(targetId, res.data.isFollowing);
      } else {
        alert(res.msg);
      }
    } catch (err: any) {
      // 4) 실패 시 서버 상태 재조회로 최종 동기화
      try {
        const sync = await userApi.isFollowing(targetId);
        setUser(prev => ({ ...prev, isFollowing: sync.data }));
        onFollowStateChange(targetId, sync.data);
      } catch {
        alert('요청 처리에 실패했습니다.');
      }
      console.error('팔로우 처리 실패:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      onClick={() => onUserClick(user)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
    >
      <img 
        src={user.profileImageUrl || '/default-profile.png'} 
        alt={user.nickname}
        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbdbdb' }}
        onError={(e) => { (e.target as HTMLImageElement).src = '/default-profile.png'; }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
          {user.nickname} {isMe && <span style={{ color: '#8e8e8e', fontWeight: 'normal' }}>(나)</span>}
        </div>
        {user.isFollowing && !isMe && <div style={{ fontSize: '0.75rem', color: '#0095f6' }}>팔로잉 중</div>}
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
              backgroundColor: user.isFollowing ? '#efefef' : '#0095f6',
              color: user.isFollowing ? '#262626' : '#fff',
              fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
              minWidth: '85px', opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? '...' : (user.isFollowing ? '언팔로우' : '팔로우')}
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
  const [followOverrides, setFollowOverrides] = useState<Record<number, boolean>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [filterFollowing, setFilterFollowing] = useState(false);
  
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
        const content = (res.data.content || []).map((u) => ({
          ...u,
          isFollowing: followOverrides[u.userId] ?? u.isFollowing
        }));
        if (pageNumber === 0) {
          setResults(content);
        } else {
          setResults(prev => [...prev, ...content]);
        }
        setIsLast(res.data.last);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [followOverrides]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword) handleSearch(keyword, 0);
    }, 300);
    return () => clearTimeout(timer);
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

  const filteredResults = filterFollowing 
    ? results.filter(u => u.isFollowing) 
    : results;

  const handleFollowStateChange = (userId: number, isFollowing: boolean) => {
    setFollowOverrides(prev => ({ ...prev, [userId]: isFollowing }));
    setResults(prev =>
      prev.map(item =>
        item.userId === userId ? { ...item, isFollowing } : item
      )
    );
  };

  useEffect(() => {
    const handleFollowChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ toUserId?: number; isFollowing?: boolean }>;
      const toUserId = customEvent.detail?.toUserId;
      const isFollowing = customEvent.detail?.isFollowing;
      if (typeof toUserId !== 'number' || typeof isFollowing !== 'boolean') return;
      handleFollowStateChange(toUserId, isFollowing);
    };

    window.addEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged as EventListener);
    return () => window.removeEventListener(FOLLOW_CHANGED_EVENT, handleFollowChanged as EventListener);
  }, []);

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
            {results.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setFilterFollowing(!filterFollowing)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #dbdbdb',
                    fontSize: '0.8rem', cursor: 'pointer',
                    backgroundColor: filterFollowing ? '#0095f6' : '#fff',
                    color: filterFollowing ? '#fff' : '#262626'
                  }}
                >
                  <UserCheck size={14} style={{ marginRight: '5px' }} /> 팔로잉 중
                </button>
              </div>
            )}

            <div className="results-list">
              {filteredResults.map((user) => (
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
