import React, { useState } from 'react';
import { login } from '../../api/auth';

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rsData = await login(form);
      if (rsData.resultCode.startsWith('200')) {
        alert(`로그인 성공: ${rsData.msg}`);
        // TODO: AccessToken 저장 로직 (LocalStorage 등)
        console.log('AccessToken:', rsData.data);
      } else {
        alert(`로그인 실패: ${rsData.msg}`);
      }
    } catch (error) {
      console.error('로그인 에러:', error);
      alert('서버 통신 중 에러가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h2>로그인 (Login)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="이메일" 
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} 
            required 
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} 
            required 
          />
        </div>
        <button type="submit">로그인하기</button>
      </form>
    </div>
  );
};
