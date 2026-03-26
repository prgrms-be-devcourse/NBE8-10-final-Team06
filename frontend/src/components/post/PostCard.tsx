import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { PostFeedResponse } from '../../types/post';
import { postApi } from '../../api/post';

interface PostCardProps {
  post: PostFeedResponse;
  onDelete?: (id: number) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost }) => {
  const [post, setPost] = useState(initialPost);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const navigate = useNavigate();

  const handleLike = async () => {
    try {
      const res = await postApi.toggleLike(post.id);
      if (res.resultCode.includes('-S-')) {
        setPost(prev => ({
          ...prev,
          isLiked: !prev.isLiked,
          likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1
        }));
      }
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  const handleScrap = async () => {
    try {
      const res = await postApi.toggleScrap(post.id);
      if (res.resultCode.includes('-S-')) {
        setPost(prev => ({ ...prev, isScrapped: !prev.isScrapped }));
      }
    } catch (err) {
      console.error('스크랩 실패:', err);
    }
  };

  const nextMedia = () => {
    if (currentMediaIndex < post.medias.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  return (
    <article style={{ 
      backgroundColor: '#fff', 
      border: '1px solid #dbdbdb', 
      borderRadius: '8px', 
      marginBottom: '20px',
      maxWidth: '600px',
      width: '100%'
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>
          <img 
            src={post.profileImageUrl || '/default-profile.png'} 
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
            alt="profile" 
          />
          <strong style={{ fontSize: '0.9rem' }}>{post.nickname}</strong>
        </div>
        <MoreHorizontal size={20} style={{ cursor: 'pointer' }} />
      </div>

      {/* 미디어 영역 */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#000', display: 'flex', alignItems: 'center' }}>
        {post.medias.length > 0 && (
          <img 
            src={post.medias[currentMediaIndex].sourceUrl} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            alt="content" 
          />
        )}
        
        {post.medias.length > 1 && (
          <>
            {currentMediaIndex > 0 && (
              <button onClick={prevMedia} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
            )}
            {currentMediaIndex < post.medias.length - 1 && (
              <button onClick={nextMedia} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}>
                <ChevronRight size={20} />
              </button>
            )}
            <div style={{ position: 'absolute', bottom: '15px', width: '100%', display: 'flex', justifyContent: 'center', gap: '5px' }}>
              {post.medias.map((_, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: i === currentMediaIndex ? '#0095f6' : '#a8a8a8' }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 액션 버튼 */}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Heart 
              size={24} 
              onClick={handleLike} 
              style={{ cursor: 'pointer', color: post.isLiked ? '#ed4956' : 'inherit' }} 
              fill={post.isLiked ? '#ed4956' : 'none'} 
            />
            <MessageCircle size={24} style={{ cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}`)} />
          </div>
          <Bookmark 
            size={24} 
            onClick={handleScrap} 
            style={{ cursor: 'pointer', color: post.isScrapped ? '#ffd700' : 'inherit' }} 
            fill={post.isScrapped ? '#ffd700' : 'none'} 
          />
        </div>

        {/* 정보 */}
        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>좋아요 {post.likeCount}개</div>
        
        <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          <span style={{ fontWeight: 'bold', marginRight: '8px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>{post.nickname}</span>
          <strong>{post.title}</strong>
          <p style={{ marginTop: '4px' }}>{post.content}</p>
        </div>

        {/* 기술 스택 태그 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {post.techStacks.map(tech => (
            <span key={tech.id} style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#f0f0f0', color: tech.color || '#666', borderRadius: '4px', fontWeight: '500' }}>
              #{tech.name}
            </span>
          ))}
        </div>

        <div 
          style={{ color: '#8e8e8e', fontSize: '0.85rem', marginTop: '10px', cursor: 'pointer' }} 
          onClick={() => navigate(`/post/${post.id}`)}
        >
          댓글 {post.commentCount}개 모두 보기
        </div>
        
        <div style={{ color: '#8e8e8e', fontSize: '0.7rem', marginTop: '6px', textTransform: 'uppercase' }}>
          {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
