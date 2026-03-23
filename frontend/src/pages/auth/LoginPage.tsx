import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { LoginRequest } from '../../types/auth';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rsData = await authApi.login(formData);
      // 백엔드 성공 코드가 "200-S-1" 형식이므로 포함 여부를 확인합니다.
      if (rsData.resultCode.includes('-S-')) {
        // 백엔드 AuthController.login은 data 필드에 accessToken(String)을 직접 담아 보냅니다.
        const accessToken = rsData.data;
        alert(`${rsData.msg}`);
        localStorage.setItem('accessToken', accessToken);
        // nickname 등은 로그인 응답에 없으므로 필요 시 /api/auth/me 등을 통해 가져와야 합니다.
        window.location.href = '/';
      } else {
        alert(`로그인 실패: ${rsData.msg}`);
      }
    } catch (error: any) {
      alert('로그인 요청 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <div className="auth-card">
        <h1 className="logo-text">Devstagram</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            name="email"
            placeholder="이메일"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">로그인</button>
        </form>
      </div>
      <div className="sub-card">
        계정이 없으신가요? <a href="/signup">가입하기</a>
      </div>
    </div>
  );
};

export default LoginPage;
