import React, { useState } from 'react';
import { Compass, KeyRound, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { AnimatedGradient } from '@/components/ui/animated-gradient';

type SiteAccessLoginProps = {
  onGranted: (username: string | null) => void;
  onOpenAdmin: () => void;
};

const ACCESS_GRADIENT = {
  preset: 'custom',
  color1: '#071923',
  color2: '#0f3442',
  color3: '#138c9e',
  rotation: -36,
  proportion: 64,
  scale: 0.55,
  speed: 8,
  distortion: 30,
  swirl: 58,
  softness: 100,
  shape: 'Edge',
} as const;

export const SiteAccessLogin: React.FC<SiteAccessLoginProps> = ({ onGranted, onOpenAdmin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password || isLoggingIn) return;
    setIsLoggingIn(true);
    setError('');
    try {
      const response = await fetch('/api/access/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || '登录失败。');
      setPassword('');
      onGranted(typeof data.username === 'string' ? data.username : null);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后再试。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-100 p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(13,148,136,0.12),transparent_34%)]" />
      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl shadow-slate-900/15 min-[820px]:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-64 overflow-hidden bg-slate-950 p-8 text-white sm:p-10">
          <AnimatedGradient config={ACCESS_GRADIENT} noise={{ opacity: 0.08, scale: 0.8 }} />
          <div className="relative z-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <Compass className="h-6 w-6" />
            </span>
            <p className="mt-8 text-xs font-semibold tracking-[0.12em] text-cyan-300">YIZHIZAO BI</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">意智造商业工作台</h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              当前网站已开启私密访问。请使用管理员为您创建的网站访问账号登录。
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              账号密码仅用于本网站访问验证
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950">网站访问登录</h2>
          <p className="mt-2 text-sm text-slate-500">输入分配给您的账号与密码。</p>

          {error ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">访问账号</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.slice(0, 64))}
                autoComplete="username"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/15"
                placeholder="请输入访问账号"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">访问密码</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value.slice(0, 128))}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/15"
                  placeholder="请输入访问密码"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={!username.trim() || !password || isLoggingIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {isLoggingIn ? '正在验证…' : '进入工作台'}
            </button>
          </form>

          <button type="button" onClick={onOpenAdmin} className="mt-6 text-xs font-semibold text-slate-400 transition hover:text-slate-700">
            网站所有者进入后台管理
          </button>
        </div>
      </section>
    </div>
  );
};
