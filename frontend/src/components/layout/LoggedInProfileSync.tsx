import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { syncMyProfileImageFromUserApi } from '../../services/syncMyProfileImage';

/** 로그인 상태에서 내 프로필 이미지 URL을 프로필 API 기준으로 세션에 동기화 */
const LoggedInProfileSync: React.FC = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const nickname = useAuthStore((s) => s.nickname);

  useEffect(() => {
    if (!isLoggedIn || !nickname?.trim()) return;
    void syncMyProfileImageFromUserApi();
  }, [isLoggedIn, nickname]);

  return null;
};

export default LoggedInProfileSync;
