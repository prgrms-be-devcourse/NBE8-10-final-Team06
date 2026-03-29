import React, { useState } from 'react';
import { Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommentInfoResponse, ReplyInfoResponse } from '../../types/comment';
import { commentApi } from '../../api/comment';
import ProfileAvatar from '../common/ProfileAvatar';

interface CommentItemProps {
  postId: number;
  comment: CommentInfoResponse;
  onDelete: () => void;
  onReplyAdded: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ postId, comment: initialComment, onDelete, onReplyAdded }) => {
  const [comment, setComment] = useState(initialComment);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editText, setEditText] = useState(initialComment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ReplyInfoResponse[]>([]);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [isReplyInputVisible, setIsReplyInputVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);

  const toggleLike = async () => {
    try {
      const res = await commentApi.toggleLike(comment.id);
      if (res.resultCode.includes('-S-')) {
        const isNowLiked = !comment.isLiked;
        setComment(prev => ({ 
          ...prev, 
          isLiked: isNowLiked,
          likeCount: isNowLiked ? prev.likeCount + 1 : Math.max(0, prev.likeCount - 1)
        }));
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

  const handleReplyLike = async (replyId: number) => {
    try {
      const res = await commentApi.toggleLike(replyId);
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        setReplies(prev =>
          prev.map(reply =>
            reply.id === replyId
              ? {
                  ...reply,
                  isLiked: !reply.isLiked,
                  likeCount: !reply.isLiked ? reply.likeCount + 1 : Math.max(0, reply.likeCount - 1)
                }
              : reply
          )
        );
      }
    } catch (err) {
      console.error('답글 좋아요 실패:', err);
    }
  };

  const handleReplyDelete = async (replyId: number) => {
    if (!window.confirm('답글을 삭제하시겠습니까?')) return;
    try {
      const res = await commentApi.delete(replyId);
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        setReplies(prev => prev.filter(reply => reply.id !== replyId));
        onReplyAdded();
      } else {
        alert(res.msg || '답글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('답글 삭제 실패:', err);
      alert('답글 삭제에 실패했습니다.');
    }
  };

  const startReplyEdit = (reply: ReplyInfoResponse) => {
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.content);
  };

  const cancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const saveReplyEdit = async (replyId: number) => {
    const next = editingReplyText.trim();
    if (!next) {
      alert('답글 내용을 입력해주세요.');
      return;
    }
    try {
      const res = await commentApi.update(replyId, { content: next });
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        setReplies(prev =>
          prev.map(reply => (reply.id === replyId ? { ...reply, content: next } : reply))
        );
        cancelReplyEdit();
      } else {
        alert(res.msg || '답글 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('답글 수정 실패:', err);
      alert('답글 수정에 실패했습니다.');
    }
  };

  const handleCommentDelete = async () => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      const res = await commentApi.delete(comment.id);
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        onDelete();
      } else {
        alert(res.msg || '댓글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleCommentUpdate = async () => {
    const next = editText.trim();
    if (!next) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    try {
      const res = await commentApi.update(comment.id, { content: next });
      if (res.resultCode.includes('-S-') || res.resultCode.startsWith('200')) {
        setComment(prev => ({ ...prev, content: next }));
        setIsEditMode(false);
      } else {
        alert(res.msg || '댓글 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <ProfileAvatar
          authorUserId={comment.userId}
          profileImageUrl={comment.profileImageUrl}
          nickname={comment.nickname}
          sizePx={32}
        />
        <div style={{ flex: 1 }}>
          {isEditMode ? (
            <div style={{ marginBottom: '6px' }}>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', border: '1px solid #dbdbdb', borderRadius: '4px', padding: '6px', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={handleCommentUpdate} style={{ border: 'none', background: '#0095f6', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>저장</button>
                <button type="button" onClick={() => { setIsEditMode(false); setEditText(comment.content); }} style={{ border: '1px solid #dbdbdb', background: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem' }}>
              <strong>{comment.nickname}</strong> {comment.content}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#8e8e8e', marginTop: '4px', alignItems: 'center' }}>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
            {comment.likeCount > 0 && <span style={{ fontWeight: 'bold' }}>좋아요 {comment.likeCount}개</span>}
            <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsReplyInputVisible(!isReplyInputVisible)}>답글 달기</span>
            {comment.isMine && (
              <>
                <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setIsEditMode(true)}>수정</span>
                <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={handleCommentDelete} />
              </>
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
        <ProfileAvatar
          authorUserId={reply.userId}
          profileImageUrl={reply.profileImageUrl}
          nickname={reply.nickname}
          sizePx={24}
        />
        <div style={{ flex: 1, fontSize: '0.8rem' }}>
          {editingReplyId === reply.id ? (
            <div style={{ marginBottom: '6px' }}>
              <input
                type="text"
                value={editingReplyText}
                onChange={(e) => setEditingReplyText(e.target.value)}
                style={{ width: '100%', border: '1px solid #dbdbdb', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => saveReplyEdit(reply.id)} style={{ border: 'none', background: '#0095f6', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>저장</button>
                <button type="button" onClick={cancelReplyEdit} style={{ border: '1px solid #dbdbdb', background: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
              </div>
            </div>
          ) : (
            <>
              <strong>{reply.nickname}</strong> {reply.content}
            </>
          )}
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: '#8e8e8e', marginTop: '2px', alignItems: 'center' }}>
            <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
            {reply.likeCount > 0 && <span style={{ fontWeight: 'bold' }}>좋아요 {reply.likeCount}개</span>}
            {reply.isMine && (
              <>
                <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => startReplyEdit(reply)}>수정</span>
                <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleReplyDelete(reply.id)}>삭제</span>
              </>
            )}
          </div>
        </div>
        <Heart 
          size={12} 
          style={{ cursor: 'pointer', color: reply.isLiked ? '#ed4956' : '#8e8e8e', marginTop: '4px' }} 
          fill={reply.isLiked ? '#ed4956' : 'none'}
          onClick={() => handleReplyLike(reply.id)}
        />
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
