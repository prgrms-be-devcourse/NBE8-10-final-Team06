import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postApi } from '../api/post';
import { PostFeedResponse } from '../types/post';
import StoryBar from '../components/story/StoryBar';
import BottomNav from '../components/layout/BottomNav';
import PostCard from '../components/post/PostCard';
import { useAuthStore } from '../store/useAuthStore';

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<PostFeedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const isInitialMount = useRef(true);

  const fetchFeed = useCallback(async (pageNumber: number) => {
    if (!isLoggedIn || isLoading || error) return;

    try {
      setIsLoading(true);
      const res = await postApi.getFeed(pageNumber);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        if (pageNumber === 0) {
          setPosts(res.data.content || []);
        } else {
          setPosts(prev => [...prev, ...(res.data.content || [])]);
        }
        setIsLast(res.data.last);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('피드 로딩 실패:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isLoading, error]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchFeed(0);
    }
  }, [fetchFeed]);

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <header style={{ position: 'sticky', top: 0, backgroundColor: '#fff', borderBottom: '1px solid #dbdbdb', zIndex: 900 }}>
        <div style={{ maxWidth: '935px', margin: '0 auto', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Devstagram</h2>
        </div>
      </header>

      <main style={{ maxWidth: '935px', margin: '0 auto', display: 'flex', justifyContent: 'center', paddingTop: '30px' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {isLoggedIn && <StoryBar />}

          <div style={{ marginTop: '20px' }}>
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>

          {isLoading && <p style={{ textAlign: 'center', padding: '20px' }}>데이터 로드 중...</p>}
          
          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ed4956' }}>
              <p>피드를 불러오는 중 서버 오류가 발생했습니다.</p>
              <button onClick={() => { setError(false); fetchFeed(0); }} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#0095f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>다시 시도</button>
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#8e8e8e' }}>
              <p>표시할 게시물이 없습니다.</p>
            </div>
          )}

          {!isLast && posts.length > 0 && !error && (
            <button onClick={() => { setPage(p => p + 1); fetchFeed(page + 1); }} style={{ width: '100%', padding: '20px', border: 'none', backgroundColor: 'transparent', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer' }}>더 보기</button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default HomePage;
