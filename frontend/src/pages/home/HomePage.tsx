import React, { useEffect, useState, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import { postApi } from '../../api/post';
import { PostFeedResponse } from '../../types/post';
import StoryBar from '../../components/story/StoryBar';
import PostCard from '../../components/post/PostCard';
import { useAuthStore } from '../../store/useAuthStore';
import MainLayout from '../../components/layout/MainLayout';
import { getApiErrorMessage } from '../../util/apiError';
import UserRecommendationsSection from '../../components/user/UserRecommendationsSection';

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<PostFeedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [removedPostIds, setRemovedPostIds] = useState<number[]>([]);
  
  const { isLoggedIn } = useAuthStore();
  const isInitialMount = useRef(true);

  /** force: 삭제 직후 등 isLoading 가드 없이 첫 페이지를 다시 받을 때 사용 */
  const fetchFeed = useCallback(async (pageNumber: number, options?: { force?: boolean }) => {
    // error 는 여기서 막지 않음 — React 배치로 setError(false) 직후 재시도가 막히는 문제 방지
    if (!isLoggedIn) return;
    if (!options?.force && isLoading) return;

    try {
      setIsLoading(true);
      if (pageNumber === 0) setFeedError(null);
      const res = await postApi.getFeed(pageNumber);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const filteredContent = (res.data.content || []).filter((post) => !removedPostIds.includes(post.id));
        if (pageNumber === 0) {
          setPosts(filteredContent);
          setPage(0);
        } else {
          setPosts(prev => [...prev, ...filteredContent]);
        }
        setIsLast(res.data.last);
      } else {
        setFeedError(res.msg || '피드를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('피드 로딩 실패:', err);
      const hint =
        isAxiosError(err) && err.response?.status === 500
          ? '서버 내부 오류입니다. Redis·백엔드 로그를 확인하거나 잠시 후 다시 시도해 주세요.'
          : '';
      setFeedError(
        [getApiErrorMessage(err, '피드를 불러오는 중 오류가 발생했습니다.'), hint].filter(Boolean).join(' ')
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isLoading, removedPostIds]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchFeed(0);
    }
  }, [fetchFeed]);

  return (
    <MainLayout>
      <div className="home-two-column-layout">
        <div className="home-feed-left">
          <div className="home-feed-column" style={{ marginLeft: 0, marginRight: 0 }}>
            {isLoggedIn && <StoryBar />}

            <div style={{ marginTop: '20px' }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostRemoved={(id) => {
                    setRemovedPostIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                    setPosts((prev) => prev.filter((p) => p.id !== id));
                  }}
                  onRefresh={() => {
                    void fetchFeed(0, { force: true });
                  }}
                />
              ))}
            </div>

            {isLoading && <p style={{ textAlign: 'center', padding: '20px' }}>데이터 로드 중...</p>}

            {feedError && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#ed4956' }}>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{feedError}</p>
                <button
                  type="button"
                  onClick={() => { void fetchFeed(0); }}
                  style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  다시 시도
                </button>
              </div>
            )}

            {!isLoading && !feedError && posts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '100px 20px', color: '#8e8e8e' }}>
                <p>표시할 게시물이 없습니다.</p>
              </div>
            )}

            {!isLast && posts.length > 0 && !feedError && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (isLoading) return;
                  setPage((p) => {
                    const next = p + 1;
                    void fetchFeed(next);
                    return next;
                  });
                }}
                style={{
                  width: '100%',
                  padding: '20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#0095f6',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'wait' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                더 보기
              </button>
            )}
          </div>
        </div>

        <div className="home-recommend-right">
          <UserRecommendationsSection title="추천" />
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;
