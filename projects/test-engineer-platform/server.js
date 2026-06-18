import bcrypt from 'bcryptjs';
import express from 'express';
import session from 'express-session';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addPointTransaction,
  createUser,
  findUserByInviteCode,
  findUserByUsername,
  getDatabaseSnapshot,
  getPublicUser,
  initializeDatabase,
  listPointTransactions,
  listResources,
  listUsers,
  updateUser,
  validateResourceAccess
} from './src/store.js';
import { calculateByType, getOpenSourceProjects } from './src/calculators.js';
import { analyzeEngineerQuery } from './src/agent.js';
import { getKnowledgeSummary, listKnowledgeResources } from './src/knowledge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const app = express();

await initializeDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: 'test_engineer_sid',
    secret: process.env.SESSION_SECRET || 'local-dev-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/vendor/lucide', express.static(path.join(__dirname, 'node_modules', 'lucide-static')));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  next();
}

async function requireAdmin(req, res, next) {
  const db = await getDatabaseSnapshot();
  const user = db.users.find((item) => item.id === req.session.userId);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}

function normalizeString(value) {
  return String(value || '').trim();
}

function readUserPayload(body) {
  return {
    username: normalizeString(body.username),
    password: String(body.password || ''),
    name: normalizeString(body.name),
    company: normalizeString(body.company),
    licenseNo: normalizeString(body.licenseNo),
    phone: normalizeString(body.phone),
    inviteCode: normalizeString(body.inviteCode).toUpperCase()
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/session', async (req, res) => {
  if (!req.session.userId) {
    res.json({ user: null });
    return;
  }
  const db = await getDatabaseSnapshot();
  const user = db.users.find((item) => item.id === req.session.userId);
  res.json({ user: user ? getPublicUser(user) : null });
});

app.post('/api/register', async (req, res) => {
  const payload = readUserPayload(req.body);
  if (!payload.username || !payload.password || !payload.name) {
    res.status(400).json({ error: '用户名、密码和姓名必填' });
    return;
  }
  if (payload.password.length < 6) {
    res.status(400).json({ error: '密码至少 6 位' });
    return;
  }

  const existingUser = await findUserByUsername(payload.username);
  if (existingUser) {
    res.status(409).json({ error: '用户名已存在' });
    return;
  }

  const referrer = payload.inviteCode ? await findUserByInviteCode(payload.inviteCode) : null;
  if (payload.inviteCode && !referrer) {
    res.status(400).json({ error: '推广码无效' });
    return;
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await createUser({
    username: payload.username,
    passwordHash,
    name: payload.name,
    company: payload.company,
    licenseNo: payload.licenseNo,
    phone: payload.phone,
    referredBy: referrer?.id || null
  });

  if (referrer) {
    await addPointTransaction({
      userId: referrer.id,
      amount: 10,
      type: 'promotion',
      note: `推广注册：${user.name}`
    });
    await addPointTransaction({
      userId: user.id,
      amount: 3,
      type: 'welcome',
      note: `使用 ${referrer.name} 的推广码注册`
    });
  }

  req.session.userId = user.id;
  res.status(201).json({ user: getPublicUser(await findUserByUsername(payload.username)) });
});

app.post('/api/login', async (req, res) => {
  const username = normalizeString(req.body.username);
  const password = String(req.body.password || '');
  const user = await findUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  req.session.userId = user.id;
  res.json({ user: getPublicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('test_engineer_sid');
    res.json({ ok: true });
  });
});

app.get('/api/resources', requireAuth, async (req, res) => {
  const keyword = normalizeString(req.query.keyword).toLowerCase();
  const category = normalizeString(req.query.category);
  const resources = await listResources({ keyword, category });
  res.json({ resources });
});

app.get('/api/resources/:id/download', requireAuth, async (req, res) => {
  const result = await validateResourceAccess(req.session.userId, req.params.id);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  if (result.resource.cost > 0) {
    await addPointTransaction({
      userId: req.session.userId,
      amount: -result.resource.cost,
      type: 'download',
      resourceId: result.resource.id,
      note: `下载资源：${result.resource.name}`
    });
  }

  const absolutePath = path.join(__dirname, 'public', result.resource.path);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.resource.name)}`);
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  createReadStream(absolutePath).pipe(res);
});

app.get('/api/knowledge/summary', requireAuth, async (req, res) => {
  res.json({ summary: await getKnowledgeSummary() });
});

app.get('/api/knowledge/resources', requireAuth, async (req, res) => {
  const keyword = normalizeString(req.query.keyword);
  const category = normalizeString(req.query.category);
  const priority = normalizeString(req.query.priority);
  const extension = normalizeString(req.query.extension);
  const limit = Number(req.query.limit || 200);
  const result = await listKnowledgeResources({ keyword, category, priority, extension, limit });
  res.json(result);
});

app.get('/api/open-source/projects', requireAuth, async (req, res) => {
  res.json({ projects: await getOpenSourceProjects() });
});

app.post('/api/calculations/:type', requireAuth, (req, res) => {
  try {
    const result = calculateByType(req.params.type, req.body || {});
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/agent/engineer', requireAuth, async (req, res) => {
  const message = normalizeString(req.body.message);
  if (!message) {
    res.status(400).json({ error: '请输入要处理的试验工程问题' });
    return;
  }
  const result = await analyzeEngineerQuery(message);
  res.json({ result });
});

app.get('/api/points', requireAuth, async (req, res) => {
  const db = await getDatabaseSnapshot();
  const user = db.users.find((item) => item.id === req.session.userId);
  const transactions = await listPointTransactions(req.session.userId);
  res.json({ balance: user?.points || 0, transactions });
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await listUsers();
  res.json({ users });
});

app.post('/api/admin/points', requireAuth, requireAdmin, async (req, res) => {
  const userId = normalizeString(req.body.userId);
  const amount = Number(req.body.amount);
  const note = normalizeString(req.body.note) || '管理员调整';
  if (!userId || !Number.isInteger(amount) || amount === 0) {
    res.status(400).json({ error: '请选择用户并填写非零整数积分' });
    return;
  }
  const user = await updateUser(userId, (draft) => {
    draft.updatedAt = new Date().toISOString();
  });
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  await addPointTransaction({ userId, amount, type: 'admin', note });
  res.json({ ok: true });
});

app.use(async (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const html = await fs.readFile(indexPath, 'utf8');
  res.type('html').send(html);
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(PORT, () => {
    console.log(`试验工程师资源系统已启动: http://localhost:${PORT}`);
  });
}

export default app;
