import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Home({ onLogout }) {
  const [goods, setGoods] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', price: '' });
  const [formError, setFormError] = useState('');
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

  // 弹窗表单提交
  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAddClick = () => {
    setForm({ id: '', name: '', price: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!form.id || !form.name || !form.price) {
      setFormError('请填写所有字段');
      return;
    }
    try {
      await axios.post('/api/goods', {
        id: form.id,
        name: form.name,
        price: form.price
      }, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setShowModal(false);
      // 刷新货物清单
      const res = await axios.get('/api/goods', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setGoods(res.data.data || []);
    } catch (err) {
      setFormError('添加失败：' + (err.response?.data?.msg || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>欢迎，{username}！</h2>
        <button onClick={handleLogout}>退出登录</button>
      </div>
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>货物清单</span>
        <button onClick={handleAddClick}>新增</button>
      </h3>
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

      {/* 新增货物弹窗 */}
      {showModal && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <form onSubmit={handleFormSubmit} style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h4>新增货物</h4>
            <div style={{ marginBottom: 12 }}>
              <label>货物ID：<input name="id" value={form.id} onChange={handleFormChange} /></label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>名称：<input name="name" value={form.name} onChange={handleFormChange} /></label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>价格：<input name="price" value={form.price} onChange={handleFormChange} type="number" step="0.01" /></label>
            </div>
            {formError && <div style={{ color: 'red', marginBottom: 8 }}>{formError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={handleModalClose}>取消</button>
              <button type="submit">提交</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
