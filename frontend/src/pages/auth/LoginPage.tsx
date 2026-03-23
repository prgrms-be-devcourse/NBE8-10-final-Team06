import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { LoginRequest } from '../../types/auth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AuthCard } from '../../components/auth/AuthCard';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.login(formData);
      if (res.resultCode.includes('-S-')) {
        localStorage.setItem('accessToken', res.data);
        window.location.href = '/';
      } else {
        alert(res.msg);
      }
    } catch (error: any) {
      alert(error.response?.data?.msg || '로그인 오류');
    }
  };

  return (
    <AuthCard footer={<>계정이 없으신가요? <a href="/signup">가입하기</a></>}>
      <form onSubmit={handleSubmit} className="auth-form">
        <Input name="email" type="email" placeholder="이메일" value={formData.email} onChange={handleChange} required />
        <Input name="password" type="password" placeholder="비밀번호" value={formData.password} onChange={handleChange} required />
        <Button type="submit">로그인</Button>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
