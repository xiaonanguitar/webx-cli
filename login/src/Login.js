import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      if (onLogin) onLogin();
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.response?.data?.msg || '登录失败');
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>登录</h2>
      <form onSubmit={handleLogin}>
        <div>
          <input placeholder="用户名" name="username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <div>
          <input type="password" name="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
        </div>
        <button type="submit" style={{ width: '100%' }}>登录</button>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  );
}
