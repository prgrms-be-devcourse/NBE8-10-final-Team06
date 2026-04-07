import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, ChevronLeft, ChevronRight, Edit, Trash2, Bookmark, Forward, ExternalLink } from 'lucide-react';
import { PostFeedResponse } from '../../types/post';
import { postApi } from '../../api/post';
import UserListModal from '../profile/UserListModal';
import { getAlternateAssetUrl, isAssetMarkedMissing, markAssetMissing, resolveAssetUrl } from '../../util/assetUrl';
import ProfileAvatar from '../common/ProfileAvatar';
import DmShareModal from '../dm/DmShareModal';
import { buildPostSharePayload } from '../../util/dmDeepLinks';
import { getApiErrorMessage } from '../../util/apiError';
import MarkdownContent from '../common/MarkdownContent';

interface PostCardProps {
  post: PostFeedResponse;
  /** 삭제 직후 피드 state에서 해당 글을 먼저 제거(스토리지 파일 삭제와 재요청 사이 이미지 404 완화) */
  onPostRemoved?: (postId: number) => void;
  onRefresh?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post: initialPost, onPostRemoved, onRefresh }) => {
  // initialPost가 변경될 때 상태 동기화 (피드 리로드 대응)
  const [post, setPost] = useState(initialPost);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMediaUnavailable, setIsMediaUnavailable] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLikers, setShowLikers] = useState(false); // 좋아요 모달 상태
  const [showDmShare, setShowDmShare] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPost(initialPost);
    setCurrentMediaIndex(0);
    setIsMediaUnavailable(false);
    setShowMenu(false);
  }, [initialPost]);

  useEffect(() => {
    setIsMediaUnavailable(false);
  }, [currentMediaIndex]);

  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);
  const currentMedia = post.medias?.[currentMediaIndex];
  const isKnownMissingMedia = currentMedia ? isAssetMarkedMissing(currentMedia.sourceUrl) : false;
  const hasMedia = Boolean(post.medias && post.medias.length > 0);

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
      await postApi.deleteSafe(post.id);
      onPostRemoved?.(post.id);
      onRefresh?.();
      setShowMenu(false);
      return;
    } catch (err) {
      alert(getApiErrorMessage(err, '삭제 실패'));
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  const postMenu = (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <MoreHorizontal
        size={20}
        style={{ cursor: 'pointer' }}
        aria-expanded={showMenu}
        aria-haspopup="true"
        aria-label={post.isMine ? '내 게시글 메뉴' : '게시글 정보'}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu((v) => !v);
        }}
      />
      {showMenu && post.isMine && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: '25px',
            backgroundColor: '#fff',
            border: '1px solid #dbdbdb',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 30,
            width: '132px',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowMenu(false);
              navigate(`/post/${post.id}/edit`);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              background: '#fff',
              textAlign: 'left',
            }}
          >
            <Edit size={14} /> 수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handlePostDelete()}
            disabled={isDeleting}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.85rem',
              cursor: isDeleting ? 'wait' : 'pointer',
              color: '#ed4956',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              borderTop: '1px solid #efefef',
              background: '#fff',
              textAlign: 'left',
            }}
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      )}
      {showMenu && !post.isMine && (
        <div
          role="dialog"
          aria-label="게시글 정보"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: '25px',
            width: 'min(300px, calc(100vw - 32px))',
            maxHeight: 'min(420px, 70vh)',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #dbdbdb',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            zIndex: 30,
            padding: '14px 14px 12px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: '#262626' }}>게시글 정보</div>
          <div style={{ fontSize: '0.82rem', color: '#262626', lineHeight: 1.5 }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#8e8e8e', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>작성자</span>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  navigate(`/profile/${encodeURIComponent(post.nickname)}`);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontWeight: 600,
                  color: '#0095f6',
                }}
              >
                {post.nickname}
              </button>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#8e8e8e', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>작성일</span>
              {new Date(post.createdAt).toLocaleString('ko-KR')}
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span>
                <span style={{ color: '#8e8e8e', fontSize: '0.72rem' }}>좋아요 </span>
                <strong>{post.likeCount ?? 0}</strong>
              </span>
              <span>
                <span style={{ color: '#8e8e8e', fontSize: '0.72rem' }}>댓글 </span>
                <strong>{post.commentCount ?? 0}</strong>
              </span>
              {hasMedia && (
                <span>
                  <span style={{ color: '#8e8e8e', fontSize: '0.72rem' }}>미디어 </span>
                  <strong>{post.medias?.length ?? 0}개</strong>
                </span>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#8e8e8e', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>제목</span>
              <span style={{ fontWeight: 600 }}>{post.title}</span>
            </div>
            {post.techStacks && post.techStacks.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#8e8e8e', display: 'block', fontSize: '0.72rem', marginBottom: '6px' }}>기술 태그</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {post.techStacks.map((tech) => (
                    <span
                      key={tech.id}
                      style={{
                        fontSize: '0.7rem',
                        color: tech.color,
                        backgroundColor: `${tech.color}15`,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${tech.color}40`,
                        fontWeight: 600,
                      }}
                    >
                      #{tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#8e8e8e', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>내용</span>
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.8rem' }}>
                <MarkdownContent content={post.content} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              navigate(`/post/${post.id}`);
            }}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #dbdbdb',
              background: '#fafafa',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#262626',
            }}
          >
            <ExternalLink size={16} />
            게시글 페이지로 이동
          </button>
        </div>
      )}
    </div>
  );

  return (
    <article
      className={hasMedia ? 'post-card-feed' : 'post-card-feed post-card-feed--community'}
      style={{
        backgroundColor: '#fff',
        border: hasMedia ? '1px solid #dbdbdb' : undefined,
        position: 'relative',
      }}
    >
      {hasMedia ? (
        <>
          <div className="post-card-feed-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>
              <ProfileAvatar authorUserId={post.authorId} profileImageUrl={post.profileImageUrl} nickname={post.nickname} sizePx={32} />
              <strong style={{ fontSize: '0.9rem' }}>{post.nickname}</strong>
            </div>
            {postMenu}
          </div>

          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#000', display: 'flex', alignItems: 'center' }}>
            {(isMediaUnavailable || isKnownMissingMedia) ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                삭제된 미디어입니다.
              </div>
            ) : (
              isVideo(post.medias![currentMediaIndex].mediaType) ? (
                <video
                  src={getFullUrl(post.medias![currentMediaIndex].sourceUrl)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  muted
                  playsInline
                  controls
                  onError={(e) => {
                    const video = e.currentTarget;
                    if (video.dataset.fallbackApplied === '1') return;
                    const fallback = getFallbackUrl(post.medias![currentMediaIndex].sourceUrl);
                    if (fallback) {
                      video.dataset.fallbackApplied = '1';
                      video.src = fallback;
                      video.load();
                      return;
                    }
                    markAssetMissing(post.medias![currentMediaIndex].sourceUrl);
                    setIsMediaUnavailable(true);
                  }}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              ) : (
                <img
                  src={getFullUrl(post.medias![currentMediaIndex].sourceUrl)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="content"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied === '1') return;
                    const fallback = getFallbackUrl(post.medias![currentMediaIndex].sourceUrl);
                    if (fallback) {
                      img.dataset.fallbackApplied = '1';
                      img.src = fallback;
                      return;
                    }
                    markAssetMissing(post.medias![currentMediaIndex].sourceUrl);
                    setIsMediaUnavailable(true);
                  }}
                  onClick={() => navigate(`/post/${post.id}`)}
                />
              )
            )}
            {post.medias!.length > 1 && (
              <>
                {currentMediaIndex > 0 && <button onClick={() => setCurrentMediaIndex(i => i - 1)} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}><ChevronLeft size={20} /></button>}
                {currentMediaIndex < post.medias!.length - 1 && <button onClick={() => setCurrentMediaIndex(i => i + 1)} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}><ChevronRight size={20} /></button>}
              </>
            )}
          </div>

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
                title="공유하기"
                aria-label="공유하기"
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
              {post.techStacks && post.techStacks.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                  {post.techStacks.map(tech => (
                    <span
                      key={tech.id}
                      style={{
                        fontSize: '0.7rem',
                        color: tech.color,
                        backgroundColor: `${tech.color}15`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        border: `1px solid ${tech.color}40`,
                        fontWeight: '600',
                      }}
                    >
                      #{tech.name}
                    </span>
                  ))}
                </div>
              )}
              <MarkdownContent content={post.content} />
            </div>
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
        </>
      ) : (
        <div className="post-card-feed-section" style={{ padding: 'clamp(12px, 2vw, 18px)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '10px' }}>
            {postMenu}
          </div>

          <h2
            className="post-card-feed-community-title"
            tabIndex={0}
            onClick={() => navigate(`/post/${post.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/post/${post.id}`);
              }
            }}
          >
            {post.title}
          </h2>

          <div className="post-card-feed-community-meta">
            <ProfileAvatar authorUserId={post.authorId} profileImageUrl={post.profileImageUrl} nickname={post.nickname} sizePx={26} />
            <button
              type="button"
              onClick={() => navigate(`/profile/${post.nickname}`)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
                color: '#475569',
                fontWeight: 600,
              }}
            >
              {post.nickname}
            </button>
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => navigate(`/post/${post.id}`)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              댓글 {post.commentCount ?? 0}
            </button>
          </div>

          {post.techStacks && post.techStacks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {post.techStacks.map(tech => (
                <span
                  key={tech.id}
                  style={{
                    fontSize: '0.72rem',
                    color: tech.color,
                    backgroundColor: `${tech.color}15`,
                    padding: '3px 9px',
                    borderRadius: '10px',
                    border: `1px solid ${tech.color}40`,
                    fontWeight: 600,
                  }}
                >
                  #{tech.name}
                </span>
              ))}
            </div>
          )}

          <MarkdownContent content={post.content} className="post-card-feed-community-excerpt" />

          <div className="post-card-feed-community-footer">
            <div className="post-card-feed-community-stat">
              <Heart
                size={20}
                className="post-card-feed-action-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleLike();
                }}
                style={{ cursor: 'pointer', color: post.isLiked ? '#ed4956' : '#64748b' }}
                fill={post.isLiked ? '#ed4956' : 'none'}
              />
              <button
                type="button"
                onClick={() => setShowLikers(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                좋아요 {post.likeCount ?? 0}
              </button>
            </div>
            <button
              type="button"
              className="post-card-feed-community-stat"
              onClick={() => navigate(`/post/${post.id}`)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
            >
              <MessageCircle size={20} className="post-card-feed-action-icon" style={{ color: '#64748b' }} />
              댓글 {post.commentCount ?? 0}
            </button>
            <button
              type="button"
              title="공유하기"
              aria-label="공유하기"
              onClick={() => setShowDmShare(true)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <Forward size={20} className="post-card-feed-action-icon" style={{ color: '#64748b' }} />
            </button>
            <Bookmark
              size={20}
              className="post-card-feed-action-icon"
              onClick={handleScrap}
              style={{ cursor: 'pointer', marginLeft: 'auto', color: post.isScrapped ? '#ca8a04' : '#64748b' }}
              fill={post.isScrapped ? '#ca8a04' : 'none'}
            />
          </div>

          <button type="button" className="post-card-feed-community-more" onClick={() => navigate(`/post/${post.id}`)}>
            게시글 전체 보기 →
          </button>
        </div>
      )}

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
