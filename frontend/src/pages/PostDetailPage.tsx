import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ArrowLeft, MoreHorizontal, Send } from 'lucide-react';
import { postApi } from '../api/post';
import { commentApi } from '../api/comment';
import { PostDetailResponse } from '../types/post';
import { CommentInfoResponse } from '../types/comment';
import BottomNav from '../components/layout/BottomNav';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [comments, setComments] = useState<CommentInfoResponse[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!postId) return;
    try {
      const res = await postApi.getPost(Number(postId));
      if (res.resultCode.includes('-S-')) {
        setPost(res.data);
        setComments(res.data.comments.content);
      }
    } catch (error) {
      console.error('게시물 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [postId]);

  const handlePostLike = async () => {
    if (!post) return;
    try {
      const res = await postApi.toggleLike(post.id);
      if (res.resultCode.includes('-S-')) {
        setPost({
          ...post,
          likeCount: res.msg.includes('성공') ? post.likeCount + 1 : post.likeCount - 1
        });
      }
    } catch (error) {
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !postId) return;

    try {
      const res = await commentApi.createComment(Number(postId), { content: commentContent });
      if (res.resultCode.includes('-S-')) {
        setCommentContent('');
        // 댓글 목록만 새로고침
        const commentRes = await commentApi.getComments(Number(postId));
        if (commentRes.resultCode.includes('-S-')) {
          setComments(commentRes.data.content);
        }
      }
    } catch (error) {
      alert('댓글 작성 실패');
    }
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '50px' }}>게시물을 찾을 수 없습니다.</div>;

  return (
    <div style={{ paddingBottom: '110px', backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* 상단 헤더 */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        borderBottom: '1px solid #dbdbdb',
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
          <ArrowLeft size={24} />
        </button>
        <strong style={{ marginLeft: '20px', fontSize: '1.1rem' }}>게시물</strong>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* 게시물 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '10px' }} />
          <strong style={{ fontSize: '0.9rem' }}>{post.nickname}</strong>
          <MoreHorizontal size={20} style={{ marginLeft: 'auto', color: '#8e8e8e' }} />
        </div>

        {/* 미디어 */}
        <div style={{ width: '100%', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={post.medias[0]?.sourceUrl || 'https://via.placeholder.com/600'} 
            alt={post.title} 
            style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }} 
          />
        </div>

        {/* 본문 및 좋아요 */}
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
            <Heart size={26} onClick={handlePostLike} style={{ cursor: 'pointer', color: '#262626' }} />
            <MessageCircle size={26} style={{ color: '#262626' }} />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>좋아요 {post.likeCount}개</div>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{post.nickname}</span>
            {post.content}
          </div>
          <div style={{ color: '#8e8e8e', fontSize: '0.75rem', marginTop: '8px', textTransform: 'uppercase' }}>
            {new Date(post.createdAt).toLocaleDateString()}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #efefef', margin: '10px 0' }} />

        {/* 댓글 목록 */}
        <div style={{ padding: '0 12px' }}>
          {comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', flex: 1 }}>
                <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{comment.nickname}</span>
                {comment.content}
                <div style={{ display: 'flex', gap: '12px', color: '#8e8e8e', fontSize: '0.75rem', marginTop: '6px' }}>
                  <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                  <span style={{ fontWeight: 'bold', cursor: 'pointer' }}>답글 달기</span>
                </div>
              </div>
              <Heart size={12} style={{ color: '#8e8e8e', marginTop: '5px' }} />
            </div>
          ))}
          {comments.length === 0 && <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '20px' }}>첫 댓글을 남겨보세요.</p>}
        </div>
      </main>

      {/* 하단 댓글 입력창 */}
      <div style={{
        position: 'fixed',
        bottom: '55px',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #dbdbdb',
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#efefef', marginRight: '12px' }} />
        <form onSubmit={handleCommentSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder={`${post.nickname}님에게 댓글 남기기...`}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem' }}
          />
          <button 
            type="submit"
            disabled={!commentContent.trim()}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0095f6', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              opacity: commentContent.trim() ? 1 : 0.4
            }}
          >
            게시
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default PostDetailPage;
