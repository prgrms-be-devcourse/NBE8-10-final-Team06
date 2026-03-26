import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Send, Trash2, Edit } from 'lucide-react';
import { postApi } from '../api/post';
import { commentApi } from '../api/comment';
import { PostDetailResponse } from '../types/post';
import CommentItem from '../components/comment/CommentItem';
import UserListModal from '../components/profile/UserListModal';
import MainLayout from '../components/layout/MainLayout';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const res = await postApi.getDetail(Number(postId));
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
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
      const res = await postApi.toggleLike(post.id);
      if (res.resultCode.includes('-S-')) {
        setPost(prev => prev ? ({
          ...prev,
          isLiked: !prev.isLiked,
          likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1
        }) : null);
      }
    } catch (err) { console.error(err); }
  };

  const handleScrap = async () => {
    if (!post) return;
    try {
      const res = await postApi.toggleScrap(post.id);
      if (res.resultCode.includes('-S-')) {
        setPost(prev => prev ? ({ ...prev, isScrapped: !prev.isScrapped }) : null);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return <MainLayout title="Post"><div style={{ textAlign: 'center' }}>로딩 중...</div></MainLayout>;
  if (!post) return <MainLayout title="Error"><div style={{ textAlign: 'center' }}>게시물을 찾을 수 없습니다.</div></MainLayout>;

  return (
    <MainLayout title="Post" maxWidth="935px">
      <div style={{ display: 'flex', backgroundColor: '#fff', border: '1px solid #dbdbdb', minHeight: '600px', marginBottom: '20px' }}>
        {/* 왼쪽: 미디어 */}
        <div style={{ flex: 1.5, backgroundColor: '#000', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          {post.medias && post.medias.length > 0 && (
            <img src={post.medias[currentMediaIndex].sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="post" />
          )}
          {post.medias && post.medias.length > 1 && (
            <>
              {currentMediaIndex > 0 && <button onClick={() => setCurrentMediaIndex(i => i - 1)} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px' }}><ChevronLeft /></button>}
              {currentMediaIndex < post.medias.length - 1 && <button onClick={() => setCurrentMediaIndex(i => i + 1)} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px' }}><ChevronRight /></button>}
            </>
          )}
        </div>

        {/* 오른쪽: 상세 정보 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '350px' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={post.profileImageUrl || '/default-profile.png'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="avatar" />
              <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>{post.nickname}</strong>
            </div>
            {post.isMine && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Edit size={18} style={{ cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}/edit`)} />
                <Trash2 size={18} style={{ cursor: 'pointer', color: '#ed4956' }} onClick={() => {}} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            <div style={{ marginBottom: '20px' }}>
              <strong>{post.nickname}</strong> <span style={{ fontWeight: 'bold' }}>{post.title}</span>
              <p style={{ marginTop: '5px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            </div>
            {post.comments?.content?.map(comment => (
              <CommentItem key={comment.id} postId={post.id} comment={comment} onDelete={() => {}} onReplyAdded={fetchDetail} />
            ))}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid #efefef' }}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
              <Heart size={24} onClick={handleLike} style={{ cursor: 'pointer', color: post.isLiked ? 'red' : 'black' }} fill={post.isLiked ? 'red' : 'none'} />
              <MessageCircle size={24} />
              <Bookmark size={24} onClick={handleScrap} style={{ cursor: 'pointer', marginLeft: 'auto', color: post.isScrapped ? '#ffd700' : 'black' }} fill={post.isScrapped ? '#ffd700' : 'none'} />
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', cursor: 'pointer' }} onClick={() => setShowLikers(true)}>좋아요 {post.likeCount}개</div>
            {/* 댓글 폼 로직 동일 */}
          </div>
        </div>
      </div>

      {showLikers && <UserListModal title="좋아요" id={post.id} type="likers" onClose={() => setShowLikers(false)} />}
    </MainLayout>
  );
};

export default PostDetailPage;
