import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users } from 'lucide-react';
import type { DmRoomSummaryResponse, DmRoomParticipantSummary } from '../../types/dm';
import ProfileAvatar from '../common/ProfileAvatar';
import { useAuthStore } from '../../store/useAuthStore';

export type DmRoomInfoModalProps = {
  open: boolean;
  onClose: () => void;
  room: DmRoomSummaryResponse | null;
};

function formatJoinedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function sortParticipants(list: DmRoomParticipantSummary[], myUserId: number | null) {
  return [...list].sort((a, b) => {
    if (myUserId != null && a.userId === myUserId && b.userId !== myUserId) return 1;
    if (myUserId != null && b.userId === myUserId && a.userId !== myUserId) return -1;
    return a.nickname.localeCompare(b.nickname, 'ko');
  });
}

const DmRoomInfoModal: React.FC<DmRoomInfoModalProps> = ({ open, onClose, room }) => {
  const navigate = useNavigate();
  const myUserId = useAuthStore((s) => s.userId);

  if (!open) return null;

  const sortedParticipants = room ? sortParticipants(room.participants, myUserId ?? null) : [];
  const participants1v1Others = room && !room.isGroup
    ? sortedParticipants.filter((p) => myUserId == null || p.userId !== myUserId)
    : [];

  const goProfile = (nickname: string) => {
    onClose();
    navigate(`/profile/${encodeURIComponent(nickname)}`);
  };

  const participantRow = (p: DmRoomParticipantSummary) => {
    const isMe = myUserId != null && p.userId === myUserId;
    return (
      <button
        key={p.userId}
        type="button"
        onClick={() => !isMe && goProfile(p.nickname)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          border: 'none',
          borderBottom: '1px solid #fafafa',
          background: '#fff',
          cursor: isMe ? 'default' : 'pointer',
          textAlign: 'left',
        }}
      >
        <ProfileAvatar authorUserId={p.userId} profileImageUrl={p.profileImageUrl} nickname={p.nickname} sizePx={44} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#262626' }}>{p.nickname}</span>
          {isMe && <span style={{ fontSize: '0.75rem', color: '#8e8e8e' }}>나</span>}
        </div>
      </button>
    );
  };

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
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #efefef', flexShrink: 0 }}>
          <strong style={{ fontSize: '1rem' }}>채팅방 정보</strong>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!room ? (
            <p style={{ padding: '24px 16px', textAlign: 'center', color: '#8e8e8e', fontSize: '0.9rem' }}>
              방 정보를 불러올 수 없습니다. DM 목록으로 돌아갔다가 다시 들어와 주세요.
            </p>
          ) : (
            <>
              <div style={{ padding: '16px', borderBottom: '1px solid #efefef' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#262626', marginBottom: '12px' }}>{room.roomName || '채팅방'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#262626' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8e8e8e' }}>
                    <Users size={16} />
                    <span>{room.isGroup ? '그룹 채팅' : '1:1 채팅'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#8e8e8e' }}>참여 인원</span> {room.participants.length}명
                  </div>
                  <div>
                    <span style={{ color: '#8e8e8e' }}>내 참여 시각</span> {formatJoinedAt(room.joinedAt)}
                  </div>
                </div>
              </div>

              {room.isGroup ? (
                <div>
                  <div style={{ padding: '10px 16px 6px', fontSize: '0.8rem', fontWeight: 700, color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    참여자
                  </div>
                  {sortedParticipants.map(participantRow)}
                </div>
              ) : (
                <div>
                  <div style={{ padding: '10px 16px 6px', fontSize: '0.8rem', fontWeight: 700, color: '#8e8e8e', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    대화 상대
                  </div>
                  {participants1v1Others.length > 0 ? (
                    participants1v1Others.map(participantRow)
                  ) : room.participants.length === 0 ? (
                    <p style={{ padding: '16px', color: '#8e8e8e', fontSize: '0.85rem' }}>참여자 정보가 없습니다.</p>
                  ) : (
                    <p style={{ padding: '16px', color: '#8e8e8e', fontSize: '0.85rem' }}>상대 정보를 표시할 수 없습니다.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DmRoomInfoModal;
