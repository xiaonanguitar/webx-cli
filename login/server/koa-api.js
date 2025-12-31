const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const router = new Router();

const USERS = [{ username: 'admin', password: '123456', token: 'token-admin' }];
const GOODS = [
  { id: 1, name: '苹果', price: 3.5 },
  { id: 2, name: '香蕉', price: 2.2 },
  { id: 3, name: '橙子', price: 4.1 }
];

router.post('/api/login', ctx => {
  const { username, password } = ctx.request.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    ctx.body = { code: 0, token: user.token, username };
  } else {
    ctx.status = 401;
    ctx.body = { code: 1, msg: '用户名或密码错误' };
  }
});

router.get('/api/goods', ctx => {
  const token = ctx.headers['authorization'];
  if (!USERS.find(u => `Bearer ${u.token}` === token)) {
    ctx.status = 401;
    ctx.body = { code: 1, msg: '未登录' };
    return;
  }
  ctx.body = { code: 0, data: GOODS };
});

app.use(bodyParser());
app.use(router.routes());
app.listen(4001, () => {
  console.log('Koa API server running at http://localhost:4001');
});
