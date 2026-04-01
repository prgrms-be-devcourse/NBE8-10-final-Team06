import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Bookmark, Forward } from 'lucide-react';
import { PostFeedResponse } from '../../types/post';
import { postApi } from '../../api/post';
import UserListModal from '../profile/UserListModal';
import { getAlternateAssetUrl, isAssetMarkedMissing, markAssetMissing, resolveAssetUrl } from '../../util/assetUrl';
import ProfileAvatar from '../common/ProfileAvatar';
import DmShareModal from '../dm/DmShareModal';
import { buildPostSharePayload } from '../../util/dmDeepLinks';

interface PostCardProps {
  post: PostFeedResponse;
  onRefresh?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onRefresh }) => {
  // initialPost가 변경될 때 상태 동기화 (피드 리로드 대응)
  const [post, setPost] = useState(initialPost);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMediaUnavailable, setIsMediaUnavailable] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLikers, setShowLikers] = useState(false); // 좋아요 모달 상태
  const [showDmShare, setShowDmShare] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setPost(initialPost);
    setCurrentMediaIndex(0);
    setIsMediaUnavailable(false);
  }, [initialPost]);

  useEffect(() => {
    setIsMediaUnavailable(false);
  }, [currentMediaIndex]);

  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);
  const currentMedia = post.medias?.[currentMediaIndex];
  const isKnownMissingMedia = currentMedia ? isAssetMarkedMissing(currentMedia.sourceUrl) : false;

  const isVideo = (mediaType: string) =>
    ['mp4', 'webm', 'mov'].includes(mediaType.toLowerCase());

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
    if (isDeleting || !window.confirm('삭제하시겠습니까?')) return;
    try {
      setIsDeleting(true);
      const res = await postApi.delete(post.id);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        if (onRefresh) onRefresh();
        setShowMenu(false);
        return;
      }
      alert(res.msg || '삭제 실패');
    } catch (err) {
      alert('삭제 실패');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article
      className="post-card-feed"
      style={{ backgroundColor: '#fff', border: '1px solid #dbdbdb', position: 'relative' }}
    >
      {/* 헤더 섹션 */}
      <div className="post-card-feed-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>
          <ProfileAvatar authorUserId={post.authorId} profileImageUrl={post.profileImageUrl} nickname={post.nickname} sizePx={32} />
          
          <strong style={{ fontSize: '0.9rem' }}>{post.nickname}</strong>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          (isMediaUnavailable || isKnownMissingMedia) ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              삭제된 미디어입니다.
            </div>
          ) : (
          isVideo(post.medias[currentMediaIndex].mediaType) ? (
            <video
              src={getFullUrl(post.medias[currentMediaIndex].sourceUrl)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              muted
              playsInline
              controls
              onError={(e) => {
                const video = e.currentTarget;
                if (video.dataset.fallbackApplied === '1') return;
                const fallback = getFallbackUrl(post.medias[currentMediaIndex].sourceUrl);
                if (fallback) {
                  video.dataset.fallbackApplied = '1';
                  video.src = fallback;
                  video.load();
                  return;
                }
                markAssetMissing(post.medias[currentMediaIndex].sourceUrl);
                setIsMediaUnavailable(true);
              }}
              onClick={() => navigate(`/post/${post.id}`)}
            />
          ) : (
            <img
              src={getFullUrl(post.medias[currentMediaIndex].sourceUrl)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt="content"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied === '1') return;
                const fallback = getFallbackUrl(post.medias[currentMediaIndex].sourceUrl);
                if (fallback) {
                  img.dataset.fallbackApplied = '1';
                  img.src = fallback;
                  return;
                }
                markAssetMissing(post.medias[currentMediaIndex].sourceUrl);
                setIsMediaUnavailable(true);
              }}
              onClick={() => navigate(`/post/${post.id}`)}
            />
          )
          )
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
      <div className="post-card-feed-section">
        <div
          className="post-card-feed-actions"
          style={{ display: 'flex', gap: 'clamp(10px, 1.5vw, 14px)', marginBottom: '8px', alignItems: 'center' }}
        >
          <Heart
            className="post-card-feed-action-icon"
            size={24}
            onClick={handleLike}
            style={{ cursor: 'pointer', color: post.isLiked ? '#ed4956' : 'inherit' }}
            fill={post.isLiked ? '#ed4956' : 'none'}
          />
          <MessageCircle
            className="post-card-feed-action-icon"
            size={24}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/post/${post.id}`)}
          />
          <button
            type="button"
            title="DM으로 공유"
            aria-label="DM으로 공유"
            onClick={() => setShowDmShare(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
          >
            <Forward className="post-card-feed-action-icon" size={24} />
          </button>
          <Bookmark
            className="post-card-feed-action-icon"
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
      <DmShareModal open={showDmShare} onClose={() => setShowDmShare(false)} payloads={[buildPostSharePayload(post.id)]} />
    </article>
  );
};

export default PostCard;
