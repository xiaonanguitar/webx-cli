import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home({ onLogout }) {
  const [goods, setGoods] = useState([]);
  const [error, setError] = useState('');
  const username = localStorage.getItem('username');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGoods = async () => {
      try {
        const res = await axios.get('/api/goods', {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
        });
        setGoods(res.data.data || []);
      } catch (err) {
        setError('查询失败：' + (err.response?.data?.msg || err.message));
      }
    };
    fetchGoods();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout', {}, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>欢迎，{username}！</h2>
        <button onClick={handleLogout}>退出登录</button>
      </div>
      <h3>货物清单</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: 16 }}>
        <thead>
          <tr><th>ID</th><th>名称</th><th>价格</th></tr>
        </thead>
        <tbody>
          {goods.map(g => (
            <tr key={g.id}><td>{g.id}</td><td>{g.name}</td><td>{g.price}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
