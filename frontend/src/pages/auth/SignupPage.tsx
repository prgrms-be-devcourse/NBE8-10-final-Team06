import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { SignupRequest } from '../../types/auth';

const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<SignupRequest>({
    nickname: '',
    email: '',
    password: '',
    birthDate: '',
    gender: 'MALE',
    githubUrl: '',
    resume: 'UNDERGRADUATE',
  });

  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | '', msg: string }>({ type: '', msg: '' });
  const [nicknameStatus, setNicknameStatus] = useState<{ type: 'success' | 'error' | '', msg: string }>({ type: '', msg: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 입력 중에는 에러 메시지 초기화
    if (name === 'email') setEmailStatus({ type: '', msg: '' });
    if (name === 'nickname') setNicknameStatus({ type: '', msg: '' });
  };

  const checkEmailDuplicate = async () => {
    if (!formData.email || !formData.email.includes('@')) return;
    try {
      const rsData = await authApi.checkEmail(formData.email);
      if (rsData.resultCode.includes('-S-')) {
        setEmailStatus({ type: 'success', msg: rsData.msg });
      } else {
        setEmailStatus({ type: 'error', msg: rsData.msg });
      }
    } catch (error: any) {
      setEmailStatus({ type: 'error', msg: error.response?.data?.msg || '이미 사용 중인 이메일입니다.' });
    }
  };

  const checkNicknameDuplicate = async () => {
    if (formData.nickname.length < 2) return;
    try {
      const rsData = await authApi.checkNickname(formData.nickname);
      if (rsData.resultCode.includes('-S-')) {
        setNicknameStatus({ type: 'success', msg: rsData.msg });
      } else {
        setNicknameStatus({ type: 'error', msg: rsData.msg });
      }
    } catch (error: any) {
      setNicknameStatus({ type: 'error', msg: error.response?.data?.msg || '이미 사용 중인 닉네임입니다.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus.type === 'error' || nicknameStatus.type === 'error') {
      alert('중복된 정보를 수정해주세요.');
      return;
    }
    try {
      const rsData = await authApi.signup(formData);
      if (rsData.resultCode.includes('-S-')) {
        alert(`${rsData.msg}\n가입 성공! ID: ${rsData.data.id}`);
        window.location.href = '/login';
      } else {
        alert(`가입 실패: ${rsData.msg}`);
      }
    } catch (error: any) {
      alert(error.response?.data?.msg || '회원가입 요청 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <div className="auth-card">
        <h1 className="logo-text">Devstagram</h1>
        <p style={{ color: '#8e8e8e', fontWeight: 'bold', fontSize: '1rem', marginBottom: '20px' }}>
          친구들의 개발 소식을 확인하려면 가입하세요.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ position: 'relative' }}>
            <input name="email" type="email" placeholder="이메일 주소" value={formData.email} onChange={handleChange} onBlur={checkEmailDuplicate} required />
            {emailStatus.msg && (
              <span style={{ fontSize: '0.7rem', color: emailStatus.type === 'success' ? 'green' : 'red', display: 'block', textAlign: 'left', marginTop: '2px' }}>
                {emailStatus.msg}
              </span>
            )}
          </div>
          
          <input name="password" type="password" placeholder="비밀번호" value={formData.password} onChange={handleChange} required minLength={8} />
          
          <div style={{ position: 'relative' }}>
            <input name="nickname" placeholder="사용자 이름(닉네임)" value={formData.nickname} onChange={handleChange} onBlur={checkNicknameDuplicate} required maxLength={50} />
            {nicknameStatus.msg && (
              <span style={{ fontSize: '0.7rem', color: nicknameStatus.type === 'success' ? 'green' : 'red', display: 'block', textAlign: 'left', marginTop: '2px' }}>
                {nicknameStatus.msg}
              </span>
            )}
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.75rem', color: '#8e8e8e', marginLeft: '2px' }}>생년월일</label>
            <input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required style={{ width: '100%' }} />
          </div>

          <select name="gender" value={formData.gender} onChange={handleChange} required>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>

          <input name="githubUrl" type="url" placeholder="GitHub URL (선택)" value={formData.githubUrl} onChange={handleChange} />

          <select name="resume" value={formData.resume} onChange={handleChange} required>
            <option value="UNDERGRADUATE">학부생</option>
            <option value="JUNIOR">주니어 개발자 (1~3년차)</option>
            <option value="INTERMEDIATE">미들급 개발자 (3~7년차)</option>
            <option value="SENIOR">시니어 개발자 (7년차+)</option>
          </select>

          <button type="submit" disabled={emailStatus.type === 'error' || nicknameStatus.type === 'error'}>가입하기</button>
        </form>
      </div>
      <div className="sub-card">
        계정이 있으신가요? <a href="/login">로그인</a>
      </div>
    </div>
  );
};

export default SignupPage;
