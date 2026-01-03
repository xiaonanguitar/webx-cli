import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import Home from './Home';

function AppRoutes() {
  const [isLogin, setIsLogin] = useState(!!localStorage.getItem('token'));
  const navigate = useNavigate();
  useEffect(() => {
    const onStorage = () => setIsLogin(!!localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (isLogin) navigate('/home');
  }, [isLogin, navigate]);
  return (
    <Routes>
      <Route path="/" element={isLogin ? <Navigate to="/home" /> : <Login onLogin={() => setIsLogin(true)} />} />
      <Route path="/login" element={<Login onLogin={() => setIsLogin(true)} />} />
      <Route path="/home" element={isLogin ? <Home onLogout={() => setIsLogin(false)} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
