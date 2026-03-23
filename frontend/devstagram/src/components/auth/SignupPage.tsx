import React, { useState } from 'react';
import { signup } from '../../api/auth';
import { SignupRequest, Gender, Resume } from '../../types/auth';

export const SignupPage: React.FC = () => {
  const [form, setForm] = useState<SignupRequest>({
    nickname: '',
    email: '',
    password: '',
    birthDate: '',
    gender: 'MALE',
    githubUrl: '',
    resume: 'UNDERGRADUATE'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rsData = await signup(form);
      if (rsData.resultCode.startsWith('200') || rsData.resultCode.startsWith('201')) {
        alert(`가입 성공! (API KEY: ${rsData.data.apiKey ?? '없음'})`);
      } else {
        alert(`가입 실패: ${rsData.msg}`);
      }
    } catch (error) {
      console.error('회원가입 에러:', error);
      alert('서버 통신 중 에러가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h2>회원가입 (Signup)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}><input placeholder="닉네임" value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} required /></div>
        <div style={{ marginBottom: '10px' }}><input type="email" placeholder="이메일" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
        <div style={{ marginBottom: '10px' }}><input type="password" placeholder="비밀번호" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
        <div style={{ marginBottom: '10px' }}><input type="date" placeholder="생년월일" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} required /></div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>성별: </label>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value as Gender})}>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>경력: </label>
          <select value={form.resume} onChange={e => setForm({...form, resume: e.target.value as Resume})}>
            <option value="UNDERGRADUATE">학부생</option>
            <option value="JUNIOR">주니어 (1~3년)</option>
            <option value="INTERMEDIATE">미들 (3~7년)</option>
            <option value="SENIOR">시니어 (7년+)</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}><input placeholder="Github URL (선택)" value={form.githubUrl} onChange={e => setForm({...form, githubUrl: e.target.value})} /></div>
        
        <button type="submit">가입하기</button>
      </form>
    </div>
  );
};
