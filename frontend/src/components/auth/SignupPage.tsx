import React, { useState } from 'react';
import { signup, checkEmail, checkNickname } from '../../api/auth';
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

  const handleCheckEmail = async () => {
    if (!form.email) return alert('이메일을 입력하세요.');
    const rsData = await checkEmail(form.email);
    alert(rsData.msg);
  };

  const handleCheckNickname = async () => {
    if (!form.nickname) return alert('닉네임을 입력하세요.');
    const rsData = await checkNickname(form.nickname);
    alert(rsData.msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rsData = await signup(form);
      if (rsData.resultCode.includes('-S-')) {
        alert(`${rsData.msg} 가입을 축하합니다!`);
      } else {
        alert(`실패: ${rsData.msg}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('서버와 통신에 실패했습니다.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        {/* 닉네임: max 50 */}
        <div style={{ marginBottom: '10px', display: 'flex' }}>
          <input 
            placeholder="닉네임 (최대 50자)" 
            maxLength={50}
            value={form.nickname} 
            onChange={e => setForm({...form, nickname: e.target.value})} 
            style={{ flex: 1, padding: '8px' }} 
            required 
          />
          <button type="button" onClick={handleCheckNickname}>중복확인</button>
        </div>

        {/* 이메일: max 50 */}
        <div style={{ marginBottom: '10px', display: 'flex' }}>
          <input 
            type="email" 
            placeholder="이메일 (최대 50자)" 
            maxLength={50}
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
            style={{ flex: 1, padding: '8px' }} 
            required 
          />
          <button type="button" onClick={handleCheckEmail}>중복확인</button>
        </div>

        {/* 비밀번호: min 8, max 100 */}
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="password" 
            placeholder="비밀번호 (8~100자)" 
            minLength={8}
            maxLength={100}
            value={form.password} 
            onChange={e => setForm({...form, password: e.target.value})} 
            style={{ width: '100%', padding: '8px' }} 
            required 
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>생년월일</label>
          <input 
            type="date" 
            value={form.birthDate} 
            onChange={e => setForm({...form, birthDate: e.target.value})} 
            style={{ width: '100%', padding: '8px' }} 
            required 
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>성별: </label>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value as Gender})} style={{ width: '100%', padding: '8px' }}>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>경력 구분: </label>
          <select value={form.resume} onChange={e => setForm({...form, resume: e.target.value as Resume})} style={{ width: '100%', padding: '8px' }}>
            <option value="UNDERGRADUATE">학부생</option>
            <option value="JUNIOR">주니어 (1~3년)</option>
            <option value="INTERMEDIATE">미들 (3~7년)</option>
            <option value="SENIOR">시니어 (7년+)</option>
          </select>
        </div>

        {/* 깃허브 URL: max 200 */}
        <div style={{ marginBottom: '20px' }}>
          <input 
            placeholder="Github URL (최대 200자, 선택)" 
            maxLength={200}
            value={form.githubUrl} 
            onChange={e => setForm({...form, githubUrl: e.target.value})} 
            style={{ width: '100%', padding: '8px' }} 
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#0095f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          가입하기
        </button>
      </form>
    </div>
  );
};
