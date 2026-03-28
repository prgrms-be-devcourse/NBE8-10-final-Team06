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
      // 1. 로그인 요청 (토큰 문자열을 반환함) — skipAuth로 만료 토큰·API Key 미전송
      const res = await authApi.login(payload);
      
      if (res.resultCode.startsWith('200') || res.resultCode.includes('-S-')) {
        const accessToken = res.data;
        
        // 2. 임시 토큰 저장 (me API 호출을 위해 필요)
        localStorage.setItem('accessToken', accessToken);
        
        // 3. 내 정보 상세 조회 (닉네임, ID 확보)
        const meRes = await authApi.me();
        
        if (meRes.resultCode.startsWith('200')) {
          const { nickname, id, apiKey, profileImageUrl } = meRes.data;

          // 4. 정식 로그인 처리 (스토어 및 로컬스토리지 전체 업데이트)
          // me() 는 apiKey 를 null 로만 줌 — setLogin 에 null 을 넘겨도 더 이상 apiKey 저장소를 지우지 않음
          setLogin(nickname, accessToken, apiKey ?? undefined, id, profileImageUrl ?? null);
          void syncMyProfileImageFromUserApi();
          navigate('/');
        } else {
          alert('사용자 정보를 가져오는 데 실패했습니다.');
          localStorage.removeItem('accessToken');
        }
      } else {
        alert(res.msg);
      }
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, '로그인 중 오류가 발생했습니다.'));
      localStorage.removeItem('accessToken');
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
