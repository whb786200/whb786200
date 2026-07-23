import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const RESOURCE_INDEX_PATH = path.join(DATA_DIR, 'resources.json');

let writeQueue = Promise.resolve();

export async function initializeDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(ROOT_DIR, 'public', 'resources'), { recursive: true });

  try {
    await fs.access(RESOURCE_INDEX_PATH);
  } catch {
    await fs.writeFile(RESOURCE_INDEX_PATH, JSON.stringify([], null, 2), 'utf8');
  }

  try {
    await fs.access(DB_PATH);
  } catch {
    const now = new Date().toISOString();
    const admin = {
      id: crypto.randomUUID(),
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: '系统管理员',
      company: '试验工程师平台',
      licenseNo: '',
      phone: '',
      role: 'admin',
      points: 100,
      inviteCode: 'ADMIN001',
      referredBy: null,
      createdAt: now,
      updatedAt: now
    };
    const seed = {
      users: [admin],
      pointTransactions: [
        {
          id: crypto.randomUUID(),
          userId: admin.id,
          amount: 100,
          type: 'seed',
          resourceId: null,
          note: '初始化管理员积分',
          createdAt: now
        }
      ]
    };
    await writeJson(DB_PATH, seed);
  }
}

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function mutateDatabase(mutator) {
  writeQueue = writeQueue.then(async () => {
    const db = await readJson(DB_PATH, { users: [], pointTransactions: [] });
    const result = await mutator(db);
    await writeJson(DB_PATH, db);
    return result;
  });
  return writeQueue;
}

function createInviteCode(name) {
  const source = `${name}-${crypto.randomUUID()}`;
  return crypto.createHash('sha1').update(source).digest('hex').slice(0, 8).toUpperCase();
}

export async function getDatabaseSnapshot() {
  return readJson(DB_PATH, { users: [], pointTransactions: [] });
}

export function getPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    company: user.company,
    licenseNo: user.licenseNo,
    phone: user.phone,
    role: user.role,
    points: user.points,
    inviteCode: user.inviteCode,
    referredBy: user.referredBy,
    createdAt: user.createdAt
  };
}

export async function findUserByUsername(username) {
  const db = await getDatabaseSnapshot();
  return db.users.find((user) => user.username.toLowerCase() === String(username || '').toLowerCase()) || null;
}

export async function findUserByInviteCode(inviteCode) {
  const db = await getDatabaseSnapshot();
  return db.users.find((user) => user.inviteCode === String(inviteCode || '').toUpperCase()) || null;
}

export async function createUser(input) {
  return mutateDatabase((db) => {
    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      username: input.username,
      passwordHash: input.passwordHash,
      name: input.name,
      company: input.company || '',
      licenseNo: input.licenseNo || '',
      phone: input.phone || '',
      role: 'member',
      points: input.referredBy ? 3 : 5,
      inviteCode: createInviteCode(input.username),
      referredBy: input.referredBy || null,
      createdAt: now,
      updatedAt: now
    };
    db.users.push(user);
    db.pointTransactions.push({
      id: crypto.randomUUID(),
      userId: user.id,
      amount: user.points,
      type: input.referredBy ? 'welcome' : 'register',
      resourceId: null,
      note: input.referredBy ? '推荐注册奖励' : '注册赠送积分',
      createdAt: now
    });
    return user;
  });
}

export async function updateUser(userId, updater) {
  return mutateDatabase((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (!user) return null;
    updater(user);
    return user;
  });
}

export async function addPointTransaction(input) {
  return mutateDatabase((db) => {
    const user = db.users.find((item) => item.id === input.userId);
    if (!user) return null;
    const transaction = {
      id: crypto.randomUUID(),
      userId: input.userId,
      amount: Number(input.amount),
      type: input.type,
      resourceId: input.resourceId || null,
      note: input.note || '',
      createdAt: new Date().toISOString()
    };
    user.points += transaction.amount;
    user.updatedAt = transaction.createdAt;
    db.pointTransactions.unshift(transaction);
    return transaction;
  });
}

export async function listUsers() {
  const db = await getDatabaseSnapshot();
  return db.users.map(getPublicUser).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function listPointTransactions(userId) {
  const db = await getDatabaseSnapshot();
  return db.pointTransactions
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function listResources({ keyword = '', category = '' } = {}) {
  const resources = await readJson(RESOURCE_INDEX_PATH, []);
  return resources.filter((resource) => {
    const matchesKeyword =
      !keyword ||
      resource.name.toLowerCase().includes(keyword) ||
      resource.category.toLowerCase().includes(keyword) ||
      resource.extension.toLowerCase().includes(keyword);
    const matchesCategory = !category || resource.category === category;
    return matchesKeyword && matchesCategory;
  });
}

export async function validateResourceAccess(userId, resourceId) {
  const db = await getDatabaseSnapshot();
  const user = db.users.find((item) => item.id === userId);
  if (!user) return { ok: false, status: 401, error: '请先登录' };

  const resources = await listResources();
  const resource = resources.find((item) => item.id === resourceId);
  if (!resource) return { ok: false, status: 404, error: '资源不存在' };

  if (user.points < resource.cost) {
    return { ok: false, status: 402, error: `积分不足，下载需要 ${resource.cost} 分` };
  }

  return { ok: true, user, resource };
}
