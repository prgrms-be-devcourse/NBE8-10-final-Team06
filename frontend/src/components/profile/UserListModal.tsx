import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { userApi } from '../../api/user';
import { FollowUserResponse } from '../../types/user';

interface UserListModalProps {
  title: string;
  userId: number;
  type: 'followers' | 'followings';
  onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ title, userId, type, onClose }) => {
  const [users, setUsers] = useState<FollowUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = type === 'followers' 
          ? await userApi.getFollowers(userId)
          : await userApi.getFollowings(userId);
        
        if (res.resultCode?.includes('-S-') || res.resultCode?.startsWith('200')) {
          setUsers(res.data || []);
        }
      } catch (err) {
        console.error(`${title} 로드 실패:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, type, title]);

  // 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: 2000
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        width: '400px', maxHeight: '400px', backgroundColor: '#fff',
        borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 15px', borderBottom: '1px solid #dbdbdb'
        }}>
          <div style={{ width: '24px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{title}</h3>
          <X size={24} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        {/* 리스트 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>로딩 중...</p>
          ) : users.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#8e8e8e' }}>목록이 비어있습니다.</p>
          ) : (
            users.map(user => (
              <div 
                key={user.id} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', 
                  padding: '8px 15px', cursor: 'pointer' 
                }}
                onClick={() => {
                  navigate(`/profile/${user.nickname}`);
                  onClose();
                }}
              >
                <img 
                  src={user.profileImageUrl || '/default-profile.png'} 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} 
                  alt={user.nickname} 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.nickname}</span>
                  <span style={{ fontSize: '0.8rem', color: '#8e8e8e' }}>{user.email}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;
