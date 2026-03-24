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
      {/* 상단 헤더 */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #dbdbdb',
        padding: '10px 20px',
        zIndex: 900,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          letterSpacing: '-0.5px'
        }}>Devstagram</h2>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* 스토리 영역 (내부 여백 및 테두리는 StoryBar에서 관리) */}
        <StoryBar />

        {/* 피드 영역 */}
        {isLoading && <p style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>로딩 중...</p>}
        
        {!isLoading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#8e8e8e' }}>
            <p>표시할 게시물이 없습니다.</p>
          </div>
        )}

        <div className="feed-list" style={{ marginTop: '0' }}>
          {posts.map((post) => (
            <article key={post.id} style={{ marginBottom: '15px', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '3px' }}>
              {/* 유저 정보 */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '10px' }} />
                <strong 
                  style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${post.authorId}`)}
                >
                  {post.nickname}
                </strong>
              </div>

              {/* 이미지 */}
              <div 
                style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => navigate(`/post/${post.id}`)}
              >
                {post.medias.length > 0 ? (
                  <img 
                    src={post.medias[0].sourceUrl} 
                    alt={post.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/600?text=No+Image'; }}
                  />
                ) : (
                  <span style={{ color: '#dbdbdb' }}>No Media</span>
                )}
              </div>

              {/* 버튼 및 텍스트 영역 */}
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
                  <button 
                    onClick={() => handleLike(post.id)} 
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#262626' }}
                  >
                    <Heart size={24} />
                  </button>
                  <button 
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#262626' }}
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    <MessageCircle size={24} />
                  </button>
                </div>

                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', color: '#262626' }}>좋아요 {post.likeCount}개</div>
                
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4', color: '#262626' }}>
                  <span 
                    style={{ fontWeight: 'bold', marginRight: '8px', cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                  >
                    {post.nickname}
                  </span>
                  {post.content}
                </div>

                <div 
                  style={{ color: '#8e8e8e', fontSize: '0.85rem', marginTop: '8px', cursor: 'pointer' }}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  댓글 {post.commentCount}개 모두 보기
                </div>

                <div style={{ color: '#8e8e8e', fontSize: '0.75rem', marginTop: '10px', textTransform: 'uppercase' }}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* 무한 스크롤 더 보기 */}
        {!isLast && posts.length > 0 && (
          <button 
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchFeed(nextPage);
            }} 
            style={{ 
              width: '100%', 
              padding: '20px', 
              border: 'none', 
              backgroundColor: 'transparent', 
              color: '#0095f6', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            이전 게시물 더 보기
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HomePage;
