import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { userApi } from '../api/user';
import { UserSearchResponse } from '../types/user';
import { Search, X, History, UserCheck, Clock, UserPlus, UserMinus } from 'lucide-react';
import { searchUtil } from '../util/search';
import { useAuthStore } from '../store/useAuthStore';

// --- 서브 컴포넌트: 검색 결과 아이템 ---
const SearchResultItem: React.FC<{ 
  user: UserSearchResponse; 
  myNickname: string | null;
  onUserClick: (user: UserSearchResponse) => void;
}> = ({ user: initialUser, myNickname, onUserClick }) => {
  // 프롭스가 변경될 때 상태를 동기화하기 위해 useEffect 사용
  const [user, setUser] = useState(initialUser);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const isMe = myNickname === user.nickname;

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing || isMe) return;

    try {
      setIsProcessing(true);
      // 현재 상태에 따라 API 결정
      const apiCall = user.isFollowing ? userApi.unfollow : userApi.follow;
      const res = await apiCall(user.userId);
      
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        // 성공 시 로컬 상태 즉시 반전
        setUser(prev => ({ ...prev, isFollowing: !prev.isFollowing }));
      } else {
        alert(res.msg || '처리에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('팔로우/언팔로우 실패:', err);
      const errorMsg = err.response?.data?.msg || '잘못된 요청입니다. (백엔드 파라미터 매핑 이슈 가능성)';
      alert(errorMsg);
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
        if (pageNumber === 0) {
          setResults(res.data.content || []);
        } else {
          setResults(prev => [...prev, ...(res.data.content || [])]);
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

  const loadMore = () => {
    if (!isLast && !isLoading) {
      handleSearch(keyword, page + 1);
    }
  };

  const handleUserClick = (user: UserSearchResponse) => {
    searchUtil.addRecentSearch(user.nickname);
    navigate(`/profile/${user.nickname}`);
  };

  const filteredResults = filterFollowing 
    ? results.filter(u => u.isFollowing) 
    : results;

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
