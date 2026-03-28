import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { userApi } from '../../api/user';
import { dmApi } from '../../api/dm';
import { useAuthStore } from '../../store/useAuthStore';
import { useDmStore } from '../../store/useDmStore';
import { UserSearchResponse } from '../../types/user';
import type { DmSendMessageRequest } from '../../types/dm';
import { setPendingDmBatch } from '../../services/dmPendingSend';
import { getApiErrorMessage } from '../../util/apiError';
import ProfileAvatar from '../common/ProfileAvatar';

export type DmShareModalProps = {
  open: boolean;
  onClose: () => void;
  /** WebSocket join 이후 순서대로 전송할 DM 메시지 페이로드 */
  payloads: DmSendMessageRequest[];
};

const DmShareModal: React.FC<DmShareModalProps> = ({ open, onClose, payloads }) => {
  const navigate = useNavigate();
  const myUserId = useAuthStore((s) => s.userId);
  const setRooms = useDmStore((s) => s.setRooms);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setResults([]);
      setSubmittingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = keyword.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await userApi.searchUsers(q);
        if (res.resultCode?.startsWith('200') || res.resultCode?.includes('-S-')) {
          setResults(res.data.content);
        }
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [keyword, open]);

  const handlePick = useCallback(
    async (user: UserSearchResponse) => {
      if (myUserId != null && user.userId === myUserId) {
        alert('자기 자신에게는 보낼 수 없습니다.');
        return;
      }
      if (!payloads.length) {
        alert('보낼 내용이 없습니다.');
        return;
      }
      setSubmittingId(user.userId);
      try {
        const res = await dmApi.create1v1Room(user.userId);
        if (res.resultCode?.startsWith('200') || res.resultCode?.includes('-S-')) {
          setPendingDmBatch(res.data.roomId, payloads);
          setRooms(res.data.rooms);
          onClose();
          navigate(`/dm/${res.data.roomId}`);
        } else {
          alert(res.msg || '채팅방을 열 수 없습니다.');
        }
      } catch (e: unknown) {
        alert(getApiErrorMessage(e, '채팅방을 열 수 없습니다.'));
      } finally {
        setSubmittingId(null);
      }
    },
    [payloads, myUserId, navigate, onClose, setRooms]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #efefef' }}>
          <strong style={{ fontSize: '1rem' }}>DM으로 공유</strong>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #efefef' }}>
          <input
            type="search"
            placeholder="닉네임 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #dbdbdb', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: '200px' }}>
          {results
            .filter((u) => myUserId == null || u.userId !== myUserId)
            .map((u) => (
              <button
                key={u.userId}
                type="button"
                disabled={submittingId != null}
                onClick={() => void handlePick(u)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid #fafafa',
                  background: '#fff',
                  cursor: submittingId != null ? 'wait' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <ProfileAvatar authorUserId={u.userId} profileImageUrl={u.profileImageUrl} nickname={u.nickname} sizePx={40} />
                <span style={{ fontWeight: 600 }}>{u.nickname}</span>
                {submittingId === u.userId && <Loader2 className="animate-spin" size={18} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          {keyword.trim() && results.filter((u) => myUserId == null || u.userId !== myUserId).length === 0 && (
            <p style={{ padding: '24px', textAlign: 'center', color: '#8e8e8e', fontSize: '0.9rem' }}>검색 결과가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DmShareModal;
