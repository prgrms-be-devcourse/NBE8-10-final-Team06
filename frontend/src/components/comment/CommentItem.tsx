import React, { useState } from 'react';
import { Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommentInfoResponse, ReplyInfoResponse } from '../../types/comment';
import { commentApi } from '../../api/comment';

interface CommentItemProps {
  postId: number;
  comment: CommentInfoResponse;
  onDelete: (id: number) => void;
  onReplyAdded: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ postId, comment: initialComment, onDelete, onReplyAdded }) => {
  const [comment, setComment] = useState(initialComment);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ReplyInfoResponse[]>([]);
  const [isReplyInputVisible, setIsReplyInputVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);

  // 백엔드에 likeCount가 없으므로 프론트에서 임시 가상 카운트 관리 (UX용)
  const [virtualLikeCount, setVirtualLikeCount] = useState(0); 

  const toggleLike = async () => {
    try {
      const res = await commentApi.toggleLike(comment.id);
      if (res.resultCode.includes('-S-')) {
        const isNowLiked = !comment.isLiked;
        setComment(prev => ({ ...prev, isLiked: isNowLiked }));
        setVirtualLikeCount(prev => isNowLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (err) { 
      console.error('댓글 좋아요 실패:', err); 
    }
  };

  const loadReplies = async () => {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    try {
      setLoadingReplies(true);
      const res = await commentApi.getReplies(comment.id);
      if (res.resultCode.includes('-S-')) {
        setReplies(res.data.content);
        setShowReplies(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const res = await commentApi.create(postId, {
        content: replyText,
        parentCommentId: comment.id
      });
      if (res.resultCode.includes('-S-')) {
        setReplyText('');
        setIsReplyInputVisible(false);
        onReplyAdded(); 
        loadReplies(); 
      }
    } catch (err) { alert('답글 작성 실패'); }
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <img 
          src={comment.profileImageUrl || '/default-profile.png'} 
          style={{ width: '32px', height: '32px', borderRadius: '50%' }} 
          alt="avatar" 
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem' }}>
            <strong>{comment.nickname}</strong> {comment.content}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#8e8e8e', marginTop: '4px', alignItems: 'center' }}>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            {virtualLikeCount > 0 && <span style={{ fontWeight: 'bold' }}>좋아요 {virtualLikeCount}개</span>}
            <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsReplyInputVisible(!isReplyInputVisible)}>답글 달기</span>
            {comment.isMine && (
              <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={() => onDelete(comment.id)} />
            )}
          </div>
        </div>
        <Heart 
          size={14} 
          style={{ cursor: 'pointer', color: comment.isLiked ? '#ed4956' : '#8e8e8e' }} 
          fill={comment.isLiked ? '#ed4956' : 'none'}
          onClick={toggleLike}
        />
      </div>

      {comment.replyCount > 0 && (
        <div 
          style={{ marginLeft: '44px', marginTop: '8px', color: '#8e8e8e', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={loadReplies}
        >
          <div style={{ width: '24px', height: '1px', backgroundColor: '#dbdbdb' }} />
          {showReplies ? <><ChevronUp size={14} /> 답글 숨기기</> : <><ChevronDown size={14} /> 답글 보기 ({comment.replyCount}개)</>}
        </div>
      )}

      {showReplies && (
        <div style={{ marginLeft: '44px', marginTop: '10px' }}>
          {replies.map(reply => (
            <div key={reply.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
              <img src={reply.profileImageUrl || '/default-profile.png'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="avatar" />
              <div style={{ flex: 1, fontSize: '0.8rem' }}>
                <strong>{reply.nickname}</strong> {reply.content}
                <div style={{ fontSize: '0.7rem', color: '#8e8e8e', marginTop: '2px' }}>
                  {new Date(reply.createdAt).toLocaleDateString()}
                </div>
              </div>
              {/* 대댓글은 백엔드 DTO 부족으로 좋아요 기능 제외 */}
            </div>
          ))}
        </div>
      )}

      {isReplyInputVisible && (
        <form onSubmit={handleReplySubmit} style={{ marginLeft: '44px', marginTop: '10px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder={`${comment.nickname}님에게 답글 남기기...`}
            style={{ flex: 1, border: 'none', borderBottom: '1px solid #efefef', outline: 'none', fontSize: '0.8rem', padding: '4px 0' }}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <button type="submit" style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>게시</button>
        </form>
      )}
    </div>
  );
};

export default CommentItem;
