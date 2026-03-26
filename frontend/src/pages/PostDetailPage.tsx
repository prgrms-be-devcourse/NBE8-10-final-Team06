import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { postApi } from '../api/post';
import { PostDetailResponse } from '../types/post';
import BottomNav from '../components/layout/BottomNav';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const res = await postApi.getDetail(Number(postId));
      if (res.resultCode.includes('-S-')) {
        setPost(res.data);
      }
    } catch (err) {
      console.error('상세 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLike = async () => {
    if (!post) return;
    try {
      await postApi.toggleLike(post.id);
      setPost(prev => prev ? ({
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1
      }) : null);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>;
  if (!post) return <div style={{ padding: '20px', textAlign: 'center' }}>게시물을 찾을 수 없습니다.</div>;

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '60px' }}>
      <main style={{ maxWidth: '935px', margin: '40px auto', display: 'flex', backgroundColor: '#fff', border: '1px solid #dbdbdb', height: '600px' }}>
        
        {/* 왼쪽: 미디어 영역 */}
        <div style={{ flex: 1.5, backgroundColor: '#000', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          {post.medias.length > 0 && (
            <img 
              src={post.medias[currentMediaIndex].sourceUrl} 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              alt="post" 
            />
          )}
          {post.medias.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button onClick={() => setCurrentMediaIndex(i => i - 1)} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><ChevronLeft /></button>
              )}
              {currentMediaIndex < post.medias.length - 1 && (
                <button onClick={() => setCurrentMediaIndex(i => i + 1)} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><ChevronRight /></button>
              )}
            </>
          )}
        </div>

        {/* 오른쪽: 정보 및 댓글 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 유저 헤더 */}
          <div style={{ padding: '15px', borderBottom: '1px solid #efefef', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={post.profileImageUrl || '/default-profile.png'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="avatar" />
            <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>{post.nickname}</strong>
          </div>

          {/* 본문 및 댓글 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            <div style={{ marginBottom: '20px' }}>
              <strong>{post.nickname}</strong> <span style={{ fontWeight: 'bold' }}>{post.title}</span>
              <p style={{ marginTop: '5px', fontSize: '0.9rem' }}>{post.content}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                {post.techStacks.map(t => <span key={t.id} style={{ color: '#00376b', fontSize: '0.8rem' }}>#{t.name}</span>)}
              </div>
            </div>

            {/* 댓글 렌더링 (Slice) */}
            {post.comments.content.map(comment => (
              <div key={comment.id} style={{ marginBottom: '15px', fontSize: '0.85rem' }}>
                <strong>{comment.nickname}</strong> {comment.content}
                <div style={{ fontSize: '0.7rem', color: '#8e8e8e', marginTop: '4px' }}>{new Date(comment.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>

          {/* 하단 액션 및 입력창 */}
          <div style={{ padding: '15px', borderTop: '1px solid #efefef' }}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
              <Heart size={24} onClick={handleLike} style={{ cursor: 'pointer', color: post.isLiked ? 'red' : 'black' }} fill={post.isLiked ? 'red' : 'none'} />
              <MessageCircle size={24} />
              <Bookmark size={24} style={{ marginLeft: 'auto' }} />
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>좋아요 {post.likeCount}개</div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="댓글 달기..." 
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem' }} 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button disabled={!commentText.trim()} style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer', opacity: commentText.trim() ? 1 : 0.5 }}>게시</button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default PostDetailPage;
