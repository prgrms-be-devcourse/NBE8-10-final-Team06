import React, { useState } from 'react';
import { login } from '../../api/auth';

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rsData = await login(form);
      if (rsData.resultCode.includes('-S-')) {
        alert(`${rsData.msg}`);
        console.log('AccessToken:', rsData.data);
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
      <h2>로그인</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="email" 
            placeholder="이메일" 
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} 
            style={{ width: '100%', padding: '8px' }}
            required 
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} 
            style={{ width: '100%', padding: '8px' }}
            required 
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#0095f6', color: '#fff', border: 'none' }}>로그인</button>
      </form>
    </div>
  );
};
