import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { SignupRequest } from '../../types/auth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AuthCard } from '../../components/auth/AuthCard';
import { getApiErrorMessage } from '../../util/apiError';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<SignupRequest>({
    nickname: '', email: '', password: '', birthDate: '', gender: 'MALE', githubUrl: '', resume: 'UNDERGRADUATE'
  });

  const [emailStatus, setEmailStatus] = useState({ type: '', msg: '' });
  const [nicknameStatus, setNicknameStatus] = useState({ type: '', msg: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      if (!value || value.length < 8) {
        setPasswordStatus({ type: 'error', msg: '비밀번호는 8자 이상이어야 합니다.' });
      } else if (value.length > 100) {
        setPasswordStatus({ type: 'error', msg: '비밀번호는 100자 이하여야 합니다.' });
      } else {
        setPasswordStatus({ type: 'success', msg: '' });
      }
    }
  };

  const checkDuplicate = async (type: 'email' | 'nickname') => {
    const value = formData[type];
    if (!value) return;
    try {
      const res = type === 'email' ? await authApi.checkEmail(value) : await authApi.checkNickname(value);
      const status = res.resultCode.includes('-S-') ? { type: 'success', msg: res.msg } : { type: 'error', msg: res.msg };
      type === 'email' ? setEmailStatus(status) : setNicknameStatus(status);
    } catch (error: any) {
      const status = { type: 'error', msg: getApiErrorMessage(error, '이미 사용 중입니다.') };
      type === 'email' ? setEmailStatus(status) : setNicknameStatus(status);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || formData.password.length < 8) {
      setPasswordStatus({ type: 'error', msg: '비밀번호는 8자 이상이어야 합니다.' });
      return;
    }
    try {
      const res = await authApi.signup(formData);
      if (res.resultCode.includes('-S-')) {
        alert(res.msg);
        window.location.href = '/login';
      } else {
        alert(res.msg);
      }
    } catch (error: any) {
      alert(getApiErrorMessage(error, '회원가입에 실패했습니다. 입력값을 확인해주세요.'));
    }
  };

  return (
    <AuthCard footer={<>계정이 있으신가요? <a href="/login">로그인</a></>}>
      <p style={{ color: '#8e8e8e', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '15px' }}>
        친구들의 개발 소식을 확인하려면 가입하세요.
      </p>
      <form onSubmit={handleSubmit} className="auth-form">
        <Input name="email" type="email" placeholder="이메일" value={formData.email} onChange={handleChange} onBlur={() => checkDuplicate('email')} error={emailStatus.type === 'error' ? emailStatus.msg : ''} required />
        <Input
          name="password"
          type="password"
          placeholder="비밀번호"
          value={formData.password}
          onChange={handleChange}
          onBlur={() => {
            const pw = formData.password;
            if (!pw || pw.length < 8) setPasswordStatus({ type: 'error', msg: '비밀번호는 8자 이상이어야 합니다.' });
            else if (pw.length > 100) setPasswordStatus({ type: 'error', msg: '비밀번호는 100자 이하여야 합니다.' });
            else setPasswordStatus({ type: 'success', msg: '' });
          }}
          error={passwordStatus.type === 'error' ? passwordStatus.msg : ''}
          required
          minLength={8}
        />
        <Input name="nickname" placeholder="닉네임" value={formData.nickname} onChange={handleChange} onBlur={() => checkDuplicate('nickname')} error={nicknameStatus.type === 'error' ? nicknameStatus.msg : ''} required />
        
        <div style={{ textAlign: 'left', width: '100%' }}>
          <label style={{ fontSize: '0.75rem', color: '#8e8e8e' }}>생년월일</label>
          <Input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required />
        </div>

        <select name="gender" value={formData.gender} onChange={handleChange} required className="auth-form-select" style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #dbdbdb', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <option value="MALE">남성</option>
          <option value="FEMALE">여성</option>
        </select>

        <Input name="githubUrl" type="url" placeholder="GitHub URL (선택)" value={formData.githubUrl} onChange={handleChange} />

        <select name="resume" value={formData.resume} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #dbdbdb', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <option value="UNDERGRADUATE">학부생</option>
          <option value="JUNIOR">주니어 (1~3년차)</option>
          <option value="INTERMEDIATE">미들급 (3~7년차)</option>
          <option value="SENIOR">시니어 (7년차+)</option>
        </select>

        <Button type="submit" disabled={emailStatus.type === 'error' || nicknameStatus.type === 'error' || passwordStatus.type === 'error'}>가입하기</Button>
      </form>
    </AuthCard>
  );
};

export default SignupPage;
