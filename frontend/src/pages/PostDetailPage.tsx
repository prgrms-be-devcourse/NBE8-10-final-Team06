import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Trash2, Edit, Forward } from 'lucide-react';
import { postApi } from '../api/post';
import { commentApi } from '../api/comment';
import { PostDetailResponse } from '../types/post';
import { CommentInfoResponse } from '../types/comment';
import CommentItem from '../components/comment/CommentItem';
import UserListModal from '../components/profile/UserListModal';
import MainLayout from '../components/layout/MainLayout';
import { getAlternateAssetUrl, isAssetMarkedMissing, markAssetMissing, resolveAssetUrl } from '../util/assetUrl';
import ProfileAvatar from '../components/common/ProfileAvatar';
import { getApiErrorMessage } from '../util/apiError';
import DmShareModal from '../components/dm/DmShareModal';
import { buildPostSharePayload } from '../util/dmDeepLinks';
import { isRsDataSuccess } from '../util/rsData';

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMediaUnavailable, setIsMediaUnavailable] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [showDmShare, setShowDmShare] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [comments, setComments] = useState<CommentInfoResponse[]>([]);
  const [commentsLast, setCommentsLast] = useState(true);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [nextCommentPage, setNextCommentPage] = useState(1);

  const getFullUrl = (url: string) => resolveAssetUrl(url);
  const getFallbackUrl = (url: string) => getAlternateAssetUrl(url);
  const currentMedia = post?.medias?.[currentMediaIndex];
  const isKnownMissingMedia = currentMedia ? isAssetMarkedMissing(currentMedia.sourceUrl) : false;

  const isVideo = (mediaType: string) =>
    ['mp4', 'webm', 'mov'].includes(mediaType.toLowerCase());

  const fetchDetail = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await postApi.getDetail(Number(postId));
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        const data = res.data;
        setPost(data);
        const slice = data.comments;
        setComments(slice?.content ?? []);
        setCommentsLast(slice?.last ?? true);
        setNextCommentPage(1);
      } else {
        setErrorMsg(res.msg);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.msg || '게시물을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    setIsMediaUnavailable(false);
  }, [currentMediaIndex, post?.id]);

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await postApi.toggleLike(post.id);
      if (res.resultCode.includes('-S-')) {
        const isNowLiked = !post.isLiked;
        setPost(prev => prev ? ({
          ...prev,
          isLiked: isNowLiked,
          likeCount: isNowLiked ? prev.likeCount + 1 : Math.max(0, prev.likeCount - 1)
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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment || !post) return;

    try {
      setIsSubmittingComment(true);
      const res = await commentApi.create(post.id, { content: commentText });
      if (res.resultCode.includes('-S-')) {
        setCommentText('');
        fetchDetail(); // 댓글 목록 갱신
      }
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '댓글 작성 실패'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePostDelete = async () => {
    if (!post || isDeletingPost || !window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      setIsDeletingPost(true);
      const res = await postApi.delete(post.id);
      if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
        navigate('/', { replace: true });
        return;
      }
      alert(res.msg || '삭제 실패');
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, '삭제 실패'));
    } finally {
      setIsDeletingPost(false);
    }
  };

  const loadMoreComments = useCallback(async () => {
    if (!postId || commentsLoadingMore || commentsLast) return;
    setCommentsLoadingMore(true);
    try {
      const res = await commentApi.getComments(Number(postId), nextCommentPage);
      if (isRsDataSuccess(res) && res.data) {
        setComments((prev) => [...prev, ...(res.data.content ?? [])]);
        setCommentsLast(res.data.last);
        setNextCommentPage((p) => p + 1);
      }
    } catch (err) {
      console.error('댓글 추가 로드 실패:', err);
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [postId, commentsLoadingMore, commentsLast, nextCommentPage]);

  if (loading) return <MainLayout title="Post"><div style={{ textAlign: 'center', padding: '100px' }}>로딩 중...</div></MainLayout>;
  if (errorMsg || !post) return <MainLayout title="Error"><div style={{ textAlign: 'center', padding: '100px', color: '#8e8e8e' }}>{errorMsg || '게시물을 찾을 수 없습니다.'}</div></MainLayout>;

  const hasMedia = Boolean(post.medias && post.medias.length > 0);

  const renderCommentForm = (variant: 'media' | 'community') => (
    <form
      onSubmit={handleCommentSubmit}
      style={{
        display: 'flex',
        gap: '10px',
        paddingTop: variant === 'media' ? '10px' : 0,
        borderTop: variant === 'media' ? '1px solid #efefef' : undefined,
      }}
    >
      <input
        type="text"
        placeholder={variant === 'community' ? '댓글을 입력하세요…' : '댓글 달기...'}
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem', background: 'transparent' }}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
      />
      <button
        type="submit"
        disabled={!commentText.trim() || isSubmittingComment}
        style={{
          background: 'none',
          border: 'none',
          color: variant === 'community' ? '#4f46e5' : '#0095f6',
          fontWeight: 'bold',
          cursor: 'pointer',
          opacity: commentText.trim() ? 1 : 0.5,
        }}
      >
        {variant === 'community' ? '등록' : '게시'}
      </button>
    </form>
  );

  return (
    <MainLayout title="Post">
      {hasMedia ? (
        <div style={{ display: 'flex', backgroundColor: '#fff', border: '1px solid #dbdbdb', minHeight: '600px', marginBottom: '20px' }}>
          <div
            style={{
              flex: 1.5,
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {(isMediaUnavailable || isKnownMissingMedia) ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                삭제된 미디어입니다.
              </div>
            ) : (
              isVideo(post.medias[currentMediaIndex].mediaType) ? (
                <video
                  src={getFullUrl(post.medias[currentMediaIndex].sourceUrl)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  controls
                  playsInline
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
                />
              ) : (
                <img
                  src={getFullUrl(post.medias[currentMediaIndex].sourceUrl)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="post"
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
                />
              )
            )}
            {post.medias.length > 1 && (
              <>
                {currentMediaIndex > 0 && <button onClick={() => setCurrentMediaIndex(i => i - 1)} style={{ position: 'absolute', left: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px' }}><ChevronLeft /></button>}
                {currentMediaIndex < post.medias.length - 1 && <button onClick={() => setCurrentMediaIndex(i => i + 1)} style={{ position: 'absolute', right: '10px', background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px' }}><ChevronRight /></button>}
              </>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '350px' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #efefef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ProfileAvatar authorUserId={post.authorId} profileImageUrl={post.profileImageUrl} nickname={post.nickname} sizePx={32} />
                <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.nickname}`)}>{post.nickname}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {post.isMine && (
                  <>
                    <Edit size={18} style={{ cursor: 'pointer' }} onClick={() => navigate(`/post/${post.id}/edit`)} />
                    <Trash2 size={18} style={{ cursor: isDeletingPost ? 'not-allowed' : 'pointer', color: '#ed4956', opacity: isDeletingPost ? 0.5 : 1 }} onClick={handlePostDelete} />
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong>{post.nickname}</strong> <span style={{ fontWeight: 'bold' }}>{post.title}</span>
                <p style={{ marginTop: '5px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{post.content}</p>
              </div>
              {comments.map((comment) => (
                <CommentItem key={comment.id} postId={post.id} comment={comment} onDelete={fetchDetail} onReplyAdded={fetchDetail} />
              ))}
              {!commentsLast && (
                <button
                  type="button"
                  onClick={() => void loadMoreComments()}
                  disabled={commentsLoadingMore}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    border: '1px solid #dbdbdb',
                    borderRadius: '4px',
                    background: '#fafafa',
                    color: '#0095f6',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: commentsLoadingMore ? 'wait' : 'pointer',
                  }}
                >
                  {commentsLoadingMore ? '불러오는 중…' : '댓글 더 보기'}
                </button>
              )}
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #efefef' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', alignItems: 'center' }}>
                <Heart size={24} onClick={handleLike} style={{ cursor: 'pointer', color: post.isLiked ? 'red' : 'black' }} fill={post.isLiked ? 'red' : 'none'} />
                <MessageCircle size={24} />
                <button type="button" title="DM으로 공유" aria-label="DM으로 공유" onClick={() => setShowDmShare(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  <Forward size={24} />
                </button>
                <Bookmark size={24} onClick={handleScrap} style={{ cursor: 'pointer', marginLeft: 'auto', color: post.isScrapped ? '#ffd700' : 'black' }} fill={post.isScrapped ? '#ffd700' : 'none'} />
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', cursor: 'pointer' }} onClick={() => setShowLikers(true)}>좋아요 {post.likeCount}개</div>
              {renderCommentForm('media')}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="post-card-feed--community"
          style={{
            maxWidth: 760,
            margin: '0 auto 24px',
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: 10,
            overflow: 'hidden',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '22px 26px 20px',
              background: 'linear-gradient(180deg, #f1f5f9 0%, #fff 64px)',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            {post.isMine && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', marginBottom: 14 }}>
                <Edit size={18} style={{ cursor: 'pointer', color: '#475569' }} onClick={() => navigate(`/post/${post.id}/edit`)} />
                <Trash2 size={18} style={{ cursor: isDeletingPost ? 'not-allowed' : 'pointer', color: '#ed4956', opacity: isDeletingPost ? 0.5 : 1 }} onClick={handlePostDelete} />
              </div>
            )}
            <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)', fontWeight: 800, lineHeight: 1.3, color: '#0f172a' }}>
              {post.title}
            </h1>
            <div className="post-card-feed-community-meta" style={{ marginBottom: 16 }}>
              <ProfileAvatar authorUserId={post.authorId} profileImageUrl={post.profileImageUrl} nickname={post.nickname} sizePx={28} />
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
              <span>댓글 {post.commentCount}</span>
            </div>
            {post.techStacks && post.techStacks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                {post.techStacks.map((tech) => (
                  <span
                    key={tech.id}
                    style={{
                      fontSize: '0.75rem',
                      color: tech.color,
                      backgroundColor: `${tech.color}15`,
                      padding: '3px 10px',
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
            <div style={{ fontSize: '1rem', lineHeight: 1.75, color: '#334155', whiteSpace: 'pre-wrap' }}>{post.content}</div>
            <div className="post-card-feed-community-footer" style={{ marginTop: 22 }}>
              <div className="post-card-feed-community-stat">
                <Heart
                  size={22}
                  onClick={handleLike}
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
                  좋아요 {post.likeCount}
                </button>
              </div>
              <span className="post-card-feed-community-stat" style={{ cursor: 'default' }}>
                <MessageCircle size={22} style={{ color: '#64748b' }} />
                댓글 {post.commentCount}
              </span>
              <button type="button" title="DM으로 공유" aria-label="DM으로 공유" onClick={() => setShowDmShare(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <Forward size={22} style={{ color: '#64748b' }} />
              </button>
              <Bookmark
                size={22}
                onClick={handleScrap}
                style={{ cursor: 'pointer', marginLeft: 'auto', color: post.isScrapped ? '#ca8a04' : '#64748b' }}
                fill={post.isScrapped ? '#ca8a04' : 'none'}
              />
            </div>
          </div>

          <div id="post-comments" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 26px 8px' }}>
              <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                댓글 {post.commentCount}개
              </h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 26px 20px', WebkitOverflowScrolling: 'touch' }}>
              {comments.map((comment) => (
                <CommentItem key={comment.id} postId={post.id} comment={comment} onDelete={fetchDetail} onReplyAdded={fetchDetail} />
              ))}
              {!commentsLast && (
                <button
                  type="button"
                  onClick={() => void loadMoreComments()}
                  disabled={commentsLoadingMore}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#4f46e5',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: commentsLoadingMore ? 'wait' : 'pointer',
                  }}
                >
                  {commentsLoadingMore ? '불러오는 중…' : '댓글 더 보기'}
                </button>
              )}
            </div>
            <div style={{ padding: '14px 26px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {renderCommentForm('community')}
            </div>
          </div>
        </div>
      )}

      {showLikers && <UserListModal title="좋아요" id={post.id} type="likers" onClose={() => setShowLikers(false)} />}
      <DmShareModal open={showDmShare} onClose={() => setShowDmShare(false)} payloads={[buildPostSharePayload(post.id)]} />
    </MainLayout>
  );
};

export default PostDetailPage;
