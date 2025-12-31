import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [goods, setGoods] = useState([]);
  const [error, setError] = useState('');
  const username = localStorage.getItem('username');

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

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h2>欢迎，{username}！</h2>
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
