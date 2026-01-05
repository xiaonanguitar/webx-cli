const express = require('express');
const app = express();
app.use(express.json());

// 简单内存用户
const USERS = [{ username: 'admin', password: '123456', token: 'token-admin' }];
const GOODS = [
  { id: 1, name: '苹果', price: 3.5 },
  { id: 2, name: '香蕉', price: 2.2 },
  { id: 3, name: '橙子', price: 4.1 }
];

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username, password);
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    console.log("Login success:", username);
    res.json({ code: 0, token: user.token, username });
  } else {
    res.status(401).json({ code: 1, msg: '用户名或密码错误' });
  }
});

// 货物查询接口

app.get('/api/goods', (req, res) => {
  const token = req.headers['authorization'];
  if (!USERS.find(u => `Bearer ${u.token}` === token)) {
    return res.status(401).json({ code: 1, msg: '未登录' });
  }
  res.json({ code: 0, data: GOODS });
});

// 新增货物接口
app.post('/api/goods', (req, res) => {
  const token = req.headers['authorization'];
  if (!USERS.find(u => `Bearer ${u.token}` === token)) {
    return res.status(401).json({ code: 1, msg: '未登录' });
  }
  const { id, name, price } = req.body;
  if (!id || !name || price === undefined) {
    return res.status(400).json({ code: 1, msg: '参数不完整' });
  }
  if (GOODS.find(g => g.id == id)) {
    return res.status(400).json({ code: 1, msg: 'ID已存在' });
  }
  GOODS.push({ id, name, price: parseFloat(price) });
  res.json({ code: 0, msg: '添加成功' });
});

// 退出登录接口
app.post('/api/logout', (req, res) => {
  res.json({ code: 0, msg: '已退出登录' });
});

app.listen(4000, () => {
  console.log('Mock API server running at http://localhost:4000');
});
