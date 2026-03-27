import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Bookmark } from 'lucide-react';
import { PostFeedResponse } from '../../types/post';
import { postApi } from '../../api/post';
import UserListModal from '../profile/UserListModal';

interface PostCardProps {
  post: PostFeedResponse;
  onRefresh?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onRefresh }) => {
  // initialPost가 변경될 때 상태 동기화 (피드 리로드 대응)
  const [post, setPost] = useState(initialPost);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showLikers, setShowLikers] = useState(false); // 좋아요 모달 상태
  const navigate = useNavigate();

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleLike = async () => {
    try {
      const res = await postApi.toggleLike(post.id);
      if (res.resultCode.includes('-S-')) {
        const isNowLiked = !post.isLiked;
        setPost(prev => ({
          ...prev,
          isLiked: isNowLiked,
          likeCount: isNowLiked ? prev.likeCount + 1 : Math.max(0, prev.likeCount - 1)
        }));
      }
    } catch (err) { console.error(err); }
  };

  const handleScrap = async () => {
    try {
      const res = await postApi.toggleScrap(post.id);
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        setPost(prev => ({ ...prev, isScrapped: !prev.isScrapped }));
      }
    } catch (err) {
      console.error('스크랩 처리 실패:', err);
    }
  };

  const handlePostDelete = async () => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await postApi.delete(post.id);
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err) { alert('삭제 실패'); }
  };

  return (
    <article style={{ backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '8px', marginBottom: '20px', width: '100%', position: 'relative' }}>
      {/* 헤더 섹션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>
          <img src={post.profileImageUrl || '/default-profile.png'} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="profile" />
          <strong style={{ fontSize: '0.9rem' }}>{post.nickname}</strong>
        </div>
        <div style={{ position: 'relative' }}>
          <MoreHorizontal size={20} style={{ cursor: 'pointer' }} onClick={() => setShowMenu(!showMenu)} />
          {showMenu && post.isMine && (
            <div style={{ position: 'absolute', right: 0, top: '25px', backgroundColor: '#fff', border: '1px solid #dbdbdb', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 5, width: '100px' }}>
              <div style={{ padding: '10px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate(`/post/${post.id}/edit`)}>
                <Edit size={14} /> 수정
              </div>
              <div style={{ padding: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#ed4956', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #efefef' }} onClick={handlePostDelete}>
                <Trash2 size={14} /> 삭제
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 미디어 슬라이더 */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#000', display: 'flex', alignItems: 'center' }}>
        {post.medias && post.medias.length > 0 ? (
          <img 
            src={post.medias[currentMediaIndex].sourceUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            alt="content" 
            onClick={() => navigate(`/post/${post.id}`)} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>이미지가 없습니다.</div>
        )}
        
        {post.medias && post.medias.length > 1 && (
          <>
            {currentMediaIndex > 0 && <button onClick={() => setCurrentMediaIndex(i => i - 1)} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}><ChevronLeft size={20} /></button>}
            {currentMediaIndex < post.medias.length - 1 && <button onClick={() => setCurrentMediaIndex(i => i + 1)} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}><ChevronRight size={20} /></button>}
          </>
        )}
      </div>

      {/* 액션 버튼 및 본문 */}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
          <Heart size={24} onClick={handleLike} style={{ cursor: 'pointer', color: post.isLiked ? '#ed4956' : 'inherit' }} fill={post.isLiked ? '#ed4956' : 'none'} />
          <MessageCircle size={24} style={{ cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}`)} />
          <Bookmark
            size={24}
            onClick={handleScrap}
            style={{ cursor: 'pointer', marginLeft: 'auto', color: post.isScrapped ? '#ffd700' : 'inherit' }}
            fill={post.isScrapped ? '#ffd700' : 'none'}
          />
        </div>
        
        <div 
          style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', cursor: 'pointer' }}
          onClick={() => setShowLikers(true)}
        >
          좋아요 {post.likeCount || 0}개
        </div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{post.nickname}</span>
          <span style={{ fontWeight: 'bold', display: 'block', margin: '4px 0' }}>{post.title}</span>
          
          {/* 기술 스택 태그 추가 */}
          {post.techStacks && post.techStacks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
              {post.techStacks.map(tech => (
                <span 
                  key={tech.id} 
                  style={{ 
                    fontSize: '0.7rem', 
                    color: tech.color, 
                    backgroundColor: `${tech.color}15`, // 배경은 옅게
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    border: `1px solid ${tech.color}40`,
                    fontWeight: '600'
                  }}
                >
                  #{tech.name}
                </span>
              ))}
            </div>
          )}
          
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{post.content}</p>
        </div>

        {/* 댓글 개수 표시 */}
        <div 
          style={{ color: '#8e8e8e', fontSize: '0.85rem', marginTop: '12px', cursor: 'pointer' }} 
          onClick={() => navigate(`/post/${post.id}`)}
        >
          {post.commentCount > 0 
            ? `댓글 ${post.commentCount}개 모두 보기` 
            : '댓글 작성하기...'}
        </div>
        
        <div style={{ color: '#8e8e8e', fontSize: '0.7rem', marginTop: '8px' }}>
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* 좋아요 모달 */}
      {showLikers && (
        <UserListModal 
          title="좋아요" 
          id={post.id} 
          type="likers" 
          onClose={() => setShowLikers(false)} 
        />
      )}
    </article>
  );
};

export default PostCard;
