// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { LoginRequest } from '../../types/auth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiErrorMessage } from '../../util/apiError';
import { isRsDataSuccess } from '../../util/rsData';
import { syncMyProfileImageFromUserApi } from '../../services/syncMyProfileImage';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '' });
  const navigate = useNavigate();
  const setLogin = useAuthStore((state) => state.setLogin);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      email: formData.email.trim(),
      password: formData.password,
    };
    try {
      const res = await authApi.login(payload);

      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
        const meRes = await authApi.me();

        if (isRsDataSuccess(meRes) && meRes.data) {
          const { nickname, id, profileImageUrl } = meRes.data;
          setLogin(nickname, id, profileImageUrl ?? null);
          void syncMyProfileImageFromUserApi();
          navigate('/');
        } else {
          alert('사용자 정보를 가져오는 데 실패했습니다.');
        }
      } else {
        alert(res.msg);
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, '로그인 중 오류가 발생했습니다.'));
    }
  };

  return (
    <AuthCard footer={<>계정이 없으신가요? <a href="/signup">가입하기</a></>}>
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          name="email"
          type="email"
          placeholder="이메일"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <Button type="submit">로그인</Button>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
