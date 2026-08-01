import fs from 'fs';
import path from 'path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';

export type SiteAccessMode = 'public' | 'private';

export type SiteAccessUser = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

type SiteAccessData = {
  mode: SiteAccessMode;
  users: SiteAccessUser[];
  updatedAt: string;
};

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{2,32}$/u;

function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyPassword(password: string, encodedHash: string) {
  const [scheme, saltHex, expectedHex] = encodedHash.split('$');
  if (scheme !== 'scrypt' || !saltHex || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function normalizeUsername(value: string) {
  return value.normalize('NFKC').trim();
}

export function createSiteAccessStore(filePathValue: string) {
  const filePath = path.resolve(filePathValue);
  const directoryPath = path.dirname(filePath);

  const ensureDirectory = () => {
    fs.mkdirSync(directoryPath, { recursive: true, mode: 0o700 });
  };

  const defaultData = (): SiteAccessData => ({
    mode: 'public',
    users: [],
    updatedAt: new Date().toISOString(),
  });

  const read = (): SiteAccessData => {
    ensureDirectory();
    if (!fs.existsSync(filePath)) return defaultData();
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const mode: SiteAccessMode = parsed?.mode === 'private' ? 'private' : 'public';
      const users = Array.isArray(parsed?.users)
        ? parsed.users.filter(
            (user: unknown): user is SiteAccessUser =>
              Boolean(
                user &&
                  typeof user === 'object' &&
                  typeof (user as SiteAccessUser).id === 'string' &&
                  typeof (user as SiteAccessUser).username === 'string' &&
                  typeof (user as SiteAccessUser).passwordHash === 'string' &&
                  typeof (user as SiteAccessUser).createdAt === 'string'
              )
          )
        : [];
      return {
        mode,
        users,
        updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    } catch (error) {
      console.error('Site access data load failed:', error);
      return defaultData();
    }
  };

  const write = (data: SiteAccessData) => {
    ensureDirectory();
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    try {
      fs.renameSync(temporaryPath, filePath);
    } catch (error) {
      if (process.platform !== 'win32' || !fs.existsSync(filePath)) throw error;
      fs.copyFileSync(temporaryPath, filePath);
      fs.unlinkSync(temporaryPath);
    }
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      // Windows development environments may not support POSIX modes.
    }
    return data;
  };

  const listPublicUsers = () =>
    read().users.map(({ passwordHash: _passwordHash, ...user }) => user);

  const setMode = (mode: SiteAccessMode) => {
    const data = read();
    if (mode === 'private' && data.users.length === 0) {
      throw new Error('请先创建至少一个网站访问账号，再启用私密访问。');
    }
    return write({ ...data, mode, updatedAt: new Date().toISOString() });
  };

  const addUser = (usernameValue: string, password: string) => {
    const username = normalizeUsername(usernameValue);
    if (!USERNAME_PATTERN.test(username)) {
      throw new Error('账号需为 2–32 位中文、字母、数字、点、下划线或短横线。');
    }
    if (password.length < 8 || password.length > 128) {
      throw new Error('密码长度需为 8–128 位。');
    }
    const data = read();
    const usernameKey = username.toLocaleLowerCase('zh-CN');
    if (data.users.some((user) => user.username.toLocaleLowerCase('zh-CN') === usernameKey)) {
      throw new Error('该访问账号已存在。');
    }
    const user: SiteAccessUser = {
      id: randomUUID(),
      username,
      passwordHash: createPasswordHash(password),
      createdAt: new Date().toISOString(),
    };
    write({ ...data, users: [...data.users, user], updatedAt: new Date().toISOString() });
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  };

  const deleteUser = (id: string) => {
    const data = read();
    const nextUsers = data.users.filter((user) => user.id !== id);
    if (nextUsers.length === data.users.length) return false;
    if (data.mode === 'private' && nextUsers.length === 0) {
      throw new Error('私密模式下必须保留至少一个访问账号。请先切换为公开模式。');
    }
    write({ ...data, users: nextUsers, updatedAt: new Date().toISOString() });
    return true;
  };

  const authenticate = (usernameValue: string, password: string) => {
    const username = normalizeUsername(usernameValue).toLocaleLowerCase('zh-CN');
    const data = read();
    const user = data.users.find(
      (candidate) => candidate.username.toLocaleLowerCase('zh-CN') === username
    );
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return { id: user.id, username: user.username };
  };

  return {
    getStatus: () => {
      const data = read();
      return { mode: data.mode, userCount: data.users.length, updatedAt: data.updatedAt };
    },
    listPublicUsers,
    setMode,
    addUser,
    deleteUser,
    authenticate,
  };
}
