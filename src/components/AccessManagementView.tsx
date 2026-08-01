import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Plus,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

type AccessUser = {
  id: string;
  username: string;
  createdAt: string;
};

type AccessSettings = {
  mode: 'public' | 'private';
  userCount: number;
  updatedAt: string;
  users: AccessUser[];
  cookieSecure: boolean;
};

type AccessManagementViewProps = {
  onAuthenticationRequired: () => void;
};

export const AccessManagementView: React.FC<AccessManagementViewProps> = ({
  onAuthenticationRequired,
}) => {
  const [settings, setSettings] = useState<AccessSettings | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { cache: 'no-store', ...init });
    const data = await response.json();
    if (response.status === 401) {
      onAuthenticationRequired();
      throw new Error('管理员会话已失效，请重新登录。');
    }
    if (!response.ok || !data?.success) throw new Error(data?.message || '操作失败。');
    return data;
  }, [onAuthenticationRequired]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await request('/api/admin/access');
      setSettings(data);
      setFeedback('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '网站访问设置加载失败。');
    } finally {
      setIsLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const setMode = async (mode: 'public' | 'private') => {
    if (!settings || settings.mode === mode || isSaving) return;
    if (mode === 'private' && settings.users.length === 0) {
      setFeedback('请先创建至少一个网站访问账号，再启用私密访问。');
      return;
    }
    setIsSaving(true);
    setFeedback('');
    try {
      await request('/api/admin/access/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      setSettings((current) => (current ? { ...current, mode } : current));
      setFeedback(mode === 'private' ? '网站已切换为私密访问。' : '网站已切换为公开访问。');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '访问模式更新失败。');
    } finally {
      setIsSaving(false);
    }
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || password.length < 6 || isSaving) return;
    setIsSaving(true);
    setFeedback('');
    try {
      const data = await request('/api/admin/access/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setSettings((current) => current
        ? { ...current, userCount: current.userCount + 1, users: [...current.users, data.user] }
        : current
      );
      setUsername('');
      setPassword('');
      setFeedback('访问账号已创建。密码只保存为不可逆哈希，请妥善告知使用者。');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '访问账号创建失败。');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (user: AccessUser) => {
    if (isSaving || !window.confirm(`确定永久删除访问账号“${user.username}”吗？该账号的现有会话也会立即失效。`)) return;
    setIsSaving(true);
    setFeedback('');
    try {
      await request(`/api/admin/access/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      setSettings((current) => current
        ? {
            ...current,
            userCount: Math.max(0, current.userCount - 1),
            users: current.users.filter((candidate) => candidate.id !== user.id),
          }
        : current
      );
      setFeedback('访问账号已永久删除，关联会话已撤销。');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '访问账号删除失败。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-72 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />正在读取网站访问设置…</div>;
  }

  if (!settings) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{feedback || '网站访问设置暂时不可用。'}</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-black tracking-tight text-slate-900">网站访问权限</h3>
        <p className="mt-1 text-sm text-slate-500">控制网站公开或私密，并管理普通访客使用的账号。</p>
      </div>

      {feedback ? <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">{feedback}</div> : null}

      {!settings.cookieSecure ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div><h4 className="text-sm font-bold text-amber-900">启用私密模式前建议配置 HTTPS</h4><p className="mt-1 text-xs leading-5 text-amber-800">当前为 HTTP 访问，传输链路不具备 HTTPS 加密。私密登录功能可以工作，但正式分发账号前应先绑定域名并启用 HTTPS。</p></div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => void setMode('public')}
          disabled={isSaving}
          aria-pressed={settings.mode === 'public'}
          className={`rounded-xl border p-5 text-left transition ${settings.mode === 'public' ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><Globe2 className="h-5 w-5" /></span>{settings.mode === 'public' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}</div>
          <h4 className="mt-4 text-sm font-bold text-slate-900">公开访问</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">任何获得网址的人都可直接使用网站。</p>
        </button>
        <button
          type="button"
          onClick={() => void setMode('private')}
          disabled={isSaving || settings.users.length === 0}
          aria-pressed={settings.mode === 'private'}
          className={`rounded-xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${settings.mode === 'private' ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><LockKeyhole className="h-5 w-5" /></span>{settings.mode === 'private' ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : null}</div>
          <h4 className="mt-4 text-sm font-bold text-slate-900">私密访问</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">访客必须使用您创建的账号和密码登录。</p>
        </button>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between gap-4"><div><h4 className="text-sm font-bold text-slate-900">新建访问账号</h4><p className="mt-1 text-xs text-slate-400">密码最少 6 位，服务器只保存不可逆哈希。</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Plus className="h-4 w-4" /></span></div>
        <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label><span className="sr-only">访问账号</span><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={username} onChange={(event) => setUsername(event.target.value.slice(0, 32))} autoComplete="off" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white" placeholder="访问账号" /></div></label>
          <label><span className="sr-only">访问密码</span><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value.slice(0, 128))} autoComplete="new-password" minLength={6} maxLength={128} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white" placeholder="访问密码（至少 6 位）" /></div></label>
          <button type="submit" disabled={!username.trim() || password.length < 6 || isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}创建账号</button>
        </form>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between gap-4"><div><h4 className="text-sm font-bold text-slate-900">已创建账号</h4><p className="mt-1 text-xs text-slate-400">删除后不可恢复，现有登录会话同步失效。</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"><Users className="h-3.5 w-3.5" />{settings.users.length} 个</span></div>
        {settings.users.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">尚未创建网站访问账号</div> : <div className="mt-4 divide-y divide-slate-100">{settings.users.map((user) => <div key={user.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{user.username}</p><p className="mt-0.5 text-[10px] text-slate-400">创建于 {new Date(user.createdAt).toLocaleString('zh-CN')}</p></div></div><button type="button" onClick={() => void deleteUser(user)} disabled={isSaving} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />永久删除</button></div>)}</div>}
      </article>
    </div>
  );
};
