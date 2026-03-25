// src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import { postApi } from '../api/post';
import { PostFeedResponse } from '../types/post';
import StoryBar from '../components/story/StoryBar';
import BottomNav from '../components/layout/BottomNav';

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<PostFeedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const navigate = useNavigate();

  const fetchFeed = async (pageNumber: number) => {
    try {
      const res = await postApi.getFeed(pageNumber);
      if (res.resultCode.includes('-S-')) {
        if (pageNumber === 0) {
          setPosts(res.data.content);
        } else {
          setPosts((prev) => [...prev, ...res.data.content]);
        }
        setIsLast(res.data.last);
      }
    } catch (error) {
      console.error('피드 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(0);
  }, []);

  const handleLike = async (postId: number) => {
    try {
      const res = await postApi.toggleLike(postId);
      if (res.resultCode.includes('-S-')) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likeCount: res.msg.includes('좋아요 성공') ? p.likeCount + 1 : p.likeCount - 1 }
              : p
          )
        );
      }
    } catch (error) {
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ paddingBottom: '60px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      {/* 상단 헤더 - 935px 기준으로 중앙 정렬 */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #dbdbdb',
        zIndex: 900
      }}>
        <div style={{
          maxWidth: '935px',
          margin: '0 auto',
          height: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            letterSpacing: '-0.5px',
            cursor: 'pointer'
          }} onClick={() => navigate('/')}>Devstagram</h2>
          <div style={{ width: '32px' }} /> {/* 밸런스를 위한 빈 공간 */}
        </div>
      </header>

      <main style={{ 
        maxWidth: '935px', 
        margin: '0 auto', 
        display: 'flex', 
        justifyContent: 'center',
        paddingTop: '30px'
      }}>
        {/* 중앙 피드 영역 (600px 고정) */}
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <StoryBar />

          {isLoading && <p style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>로딩 중...</p>}
          
          {!isLoading && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#8e8e8e', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '3px' }}>
              <p>표시할 게시물이 없습니다.</p>
            </div>
          )}

          <div className="feed-list">
            {posts.map((post) => (
              <article key={post.id} style={{ marginBottom: '15px', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '12px' }} />
                  <strong 
                    style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                  >
                    {post.nickname}
                  </strong>
                </div>

                <div 
                  style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  {post.medias.length > 0 ? (
                    <img src={post.medias[0].sourceUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#dbdbdb' }}>No Media</span>
                  )}
                </div>

                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
                    <Heart size={24} onClick={() => handleLike(post.id)} style={{ cursor: 'pointer' }} />
                    <MessageCircle size={24} onClick={() => navigate(`/post/${post.id}`)} style={{ cursor: 'pointer' }} />
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>좋아요 {post.likeCount}개</div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{post.nickname}</span>
                    {post.content}
                  </div>
                  <div style={{ color: '#8e8e8e', fontSize: '0.85rem', marginTop: '8px', cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}`)}>
                    댓글 {post.commentCount}개 모두 보기
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!isLast && posts.length > 0 && (
            <button onClick={() => { setPage(page + 1); fetchFeed(page + 1); }} style={{ width: '100%', padding: '20px', border: 'none', backgroundColor: 'transparent', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer' }}>
              이전 게시물 더 보기
            </button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;
