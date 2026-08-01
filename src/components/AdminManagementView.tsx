import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
  Wifi,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';
import { ApiSettings } from '../types';
import { ApiSettingsView } from './ApiSettingsView';
import { KnowledgeManagementView } from './KnowledgeManagementView';

type AdminSection = 'overview' | 'knowledge' | 'services' | 'security';

type KnowledgeDocumentSummary = {
  id: string;
  title: string;
  originalName: string;
  sourceType: 'docx' | 'txt' | 'md' | 'pdf';
  updatedAt: string;
  characterCount: number;
};

type AdminOverview = {
  generatedAt: string;
  system: {
    status: 'online';
    uptimeSeconds: number;
    environment: string;
    version: string;
  };
  services: {
    amap: {
      configured: boolean;
      status: 'connected' | 'disconnected' | 'testing';
    };
    deepseek: {
      configured: boolean;
      status: 'connected' | 'disconnected';
      model: string;
    };
  };
  knowledge: {
    documentCount: number;
    chunkCount: number;
    characterCount: number;
    lastUpdatedAt: string | null;
    formats: Record<string, number>;
  };
  recentDocuments: KnowledgeDocumentSummary[];
  security: {
    passwordConfigured: boolean;
    cookieSecure: boolean;
    sessionExpiresAt: string | null;
    sessionTtlHours: number;
    loginAttemptLimit: number;
    loginWindowMinutes: number;
  };
};

type AdminManagementViewProps = {
  settings: ApiSettings;
  knowledgeVersion: number;
  onKnowledgeChanged: () => void;
  onTestAmapConnection: () => Promise<boolean>;
};

const SECTION_ITEMS: Array<{
  id: AdminSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: '系统概览', description: '运行与数据状态', icon: LayoutDashboard },
  { id: 'knowledge', label: '知识库', description: '上传及永久删除', icon: BookOpen },
  { id: 'services', label: '服务连接', description: 'API 状态检测', icon: Wifi },
  { id: 'security', label: '安全与会话', description: '权限和保护状态', icon: ShieldCheck },
];

function formatCharacterCount(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)} 万`;
  return value.toLocaleString('zh-CN');
}

function formatDate(value: string | null) {
  if (!value) return '暂无记录';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${Math.max(0, minutes)} 分钟`;
}

function StatusPill({ online, label }: { online: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        online
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border border-slate-200 bg-white/94 p-4 text-left shadow-sm shadow-slate-900/5 transition hover:-translate-y-px hover:border-blue-200 hover:bg-white"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white/94 p-4 shadow-sm shadow-slate-900/5">
      {content}
    </article>
  );
}

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  settings,
  knowledgeVersion,
  onKnowledgeChanged,
  onTestAmapConnection,
}) => {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requireAuthentication = useCallback(() => {
    setAuthenticated(false);
    setOverview(null);
    setFeedback('管理员会话已失效，请重新登录。');
  }, []);

  const loadOverview = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        requireAuthentication();
        return;
      }
      if (!response.ok || !data?.success) throw new Error(data?.message || '后台概览加载失败。');
      setOverview(data);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '后台概览加载失败。');
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, [requireAuthentication]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch('/api/admin/session', { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setConfigured(Boolean(data?.configured));
        setAuthenticated(Boolean(data?.authenticated));
      })
      .catch((error) => {
        if (active && error instanceof Error && error.name !== 'AbortError') {
          setFeedback('后台服务暂时无法连接。');
        }
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    void loadOverview();
    const refreshTimer = window.setInterval(() => void loadOverview(false), 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [authenticated, knowledgeVersion, loadOverview]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || isLoggingIn) return;
    setIsLoggingIn(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || '管理员登录失败。');
      setPassword('');
      setAuthenticated(true);
      setActiveSection('overview');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '管理员登录失败。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    setAuthenticated(false);
    setOverview(null);
    setPassword('');
    setFeedback(null);
    setActiveSection('overview');
  }, []);

  const handleKnowledgeChanged = useCallback(() => {
    onKnowledgeChanged();
  }, [onKnowledgeChanged]);

  if (isCheckingSession) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
        正在检查后台权限…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex h-full max-w-6xl items-center justify-center p-4 sm:p-6 lg:p-8">
        <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/10 min-[900px]:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden bg-slate-950 p-8 text-white lg:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/18 blur-3xl" />
            <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-8 text-xs font-semibold tracking-[0.08em] text-cyan-300">网站所有者专用</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">意智造运营后台</h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
                集中管理知识资料、服务连接和安全状态。普通访客无法进入，也无法查看服务器密钥。
              </p>
              <div className="mt-8 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />资料上传与永久删除</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />API 连接状态检测</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />12 小时安全会话与登录限流</div>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <div className="mb-7">
              <PageTitle className="text-2xl">后台登录</PageTitle>
              <p className="mt-2 text-sm leading-6 text-slate-500">仅网站所有者可使用管理员密码登录。</p>
            </div>

            {feedback ? (
              <div role="status" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {feedback}
              </div>
            ) : null}

            {configured ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">管理员密码</span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      maxLength={200}
                      autoFocus
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                      placeholder="请输入管理员密码"
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={!password || isLoggingIn}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  {isLoggingIn ? '正在验证…' : '进入后台'}
                </button>
              </form>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                服务器尚未配置管理员密码，请先完成环境变量配置。
              </div>
            )}
            <p className="mt-6 text-xs leading-5 text-slate-400">登录失败超过限制后会暂时锁定；密码不会发送给任何第三方服务。</p>
          </div>
        </section>
      </div>
    );
  }

  const amapOnline = Boolean(overview?.services.amap.configured && overview.services.amap.status === 'connected');
  const deepseekOnline = Boolean(overview?.services.deepseek.configured && overview.services.deepseek.status === 'connected');

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden p-4 sm:p-5 lg:p-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-300/70 px-1 pb-4 lg:mb-5 lg:pb-5">
        <div>
          <div className="flex items-center gap-3">
            <PageTitle className="text-2xl">运营后台</PageTitle>
            <StatusPill online label="管理员已验证" />
          </div>
          <p className="mt-2 text-sm text-slate-500">统一管理知识库、服务连接与网站安全状态。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新状态
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出后台
          </button>
        </div>
      </div>

      {feedback ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {feedback}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[204px_minmax(0,1fr)] xl:gap-5">
        <nav aria-label="后台管理栏目" className="flex h-fit gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/92 p-2 shadow-sm shadow-slate-900/5 xl:block">
          {SECTION_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                aria-current={selected ? 'page' : undefined}
                className={`flex min-w-[148px] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition active:scale-[0.99] xl:mb-1 xl:w-full xl:min-w-0 xl:py-3 xl:last:mb-0 ${
                  selected ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-white/12' : 'bg-slate-100'}`}>
                  <Icon className={`h-4 w-4 ${selected ? 'text-white' : 'text-slate-500'}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-white/60' : 'text-slate-400'}`}>{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/88 p-4 shadow-sm shadow-slate-900/5 lg:p-5">
          {activeSection === 'overview' && (
            <div className="space-y-5">
              {!overview ? (
                <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />正在读取系统状态…
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="系统状态" value="运行中" detail={`已连续运行 ${formatUptime(overview.system.uptimeSeconds)}`} icon={Activity} />
                    <MetricCard label="知识文档" value={`${overview.knowledge.documentCount} 份`} detail={`最近更新：${formatDate(overview.knowledge.lastUpdatedAt)}`} icon={FileText} onClick={() => setActiveSection('knowledge')} />
                    <MetricCard label="检索片段" value={`${overview.knowledge.chunkCount} 个`} detail="问题助手当前可检索片段" icon={Database} onClick={() => setActiveSection('knowledge')} />
                    <MetricCard label="知识字数" value={formatCharacterCount(overview.knowledge.characterCount)} detail="来自已发布资料的真实统计" icon={Gauge} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">服务运行状态</h3>
                          <p className="mt-1 text-xs text-slate-400">只显示连接状态，不返回任何密钥内容</p>
                        </div>
                        <button type="button" onClick={() => setActiveSection('services')} className="text-xs font-semibold text-blue-700">查看服务</button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Server className="h-4 w-4" /></span>
                            <div><p className="text-sm font-semibold text-slate-800">高德地图 Web 服务</p><p className="mt-0.5 text-[11px] text-slate-400">区域定位与真实 POI 检索</p></div>
                          </div>
                          <StatusPill online={amapOnline} label={amapOnline ? '连接正常' : '需要检查'} />
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600"><Activity className="h-4 w-4" /></span>
                            <div><p className="text-sm font-semibold text-slate-800">DeepSeek 文档问答</p><p className="mt-0.5 text-[11px] text-slate-400">{overview.services.deepseek.model}</p></div>
                          </div>
                          <StatusPill online={deepseekOnline} label={deepseekOnline ? '服务在线' : '未配置'} />
                        </div>
                      </div>
                    </article>

                    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div><h3 className="text-sm font-bold text-slate-900">最近资料</h3><p className="mt-1 text-xs text-slate-400">按最后更新时间排列</p></div>
                        <span className="text-[11px] font-semibold text-slate-400">{Object.entries(overview.knowledge.formats).map(([type, count]) => `${type.toUpperCase()} ${count}`).join(' · ') || '暂无格式'}</span>
                      </div>
                      {overview.recentDocuments.length === 0 ? (
                        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">尚未发布知识文档</div>
                      ) : (
                        <div className="space-y-2">
                          {overview.recentDocuments.map((document) => (
                            <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                              <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{document.title}</p><p className="mt-1 text-[10px] text-slate-400">{formatDate(document.updatedAt)}</p></div>
                              <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase text-blue-700">{document.sourceType}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'knowledge' && (
            <KnowledgeManagementView
              embedded
              onKnowledgeChanged={handleKnowledgeChanged}
              onAuthenticationRequired={requireAuthentication}
              onLogout={handleLogout}
            />
          )}

          {activeSection === 'services' && (
            <ApiSettingsView embedded settings={settings} onTestAmapConnection={onTestAmapConnection} />
          )}

          {activeSection === 'security' && overview && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">安全与会话</h3>
                <p className="mt-1 text-sm text-slate-500">管理员凭证由服务器环境变量托管，浏览器无法读取密码或 API 密钥。</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                  <div className="flex items-start justify-between gap-4"><div><h4 className="text-sm font-bold text-slate-900">管理员身份</h4><p className="mt-1 text-xs text-slate-400">当前会话到期后需重新登录</p></div><StatusPill online={overview.security.passwordConfigured} label={overview.security.passwordConfigured ? '密码已配置' : '未配置'} /></div>
                  <dl className="mt-5 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">会话有效期</dt><dd className="font-semibold text-slate-700">{overview.security.sessionTtlHours} 小时</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">本次会话到期</dt><dd className="text-right font-semibold text-slate-700">{formatDate(overview.security.sessionExpiresAt)}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">登录防暴力破解</dt><dd className="text-right font-semibold text-slate-700">{overview.security.loginWindowMinutes} 分钟内 {overview.security.loginAttemptLimit} 次</dd></div>
                  </dl>
                </article>

                <article className={`rounded-xl border p-5 shadow-sm shadow-slate-900/5 ${overview.security.cookieSecure ? 'border-emerald-200 bg-emerald-50/90' : 'border-amber-200 bg-amber-50/90'}`}>
                  <div className="flex items-start gap-3">
                    {overview.security.cookieSecure ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                    <div><h4 className={`text-sm font-bold ${overview.security.cookieSecure ? 'text-emerald-900' : 'text-amber-900'}`}>{overview.security.cookieSecure ? 'HTTPS 会话保护已启用' : '建议启用 HTTPS'}</h4><p className={`mt-2 text-xs leading-6 ${overview.security.cookieSecure ? 'text-emerald-700' : 'text-amber-800'}`}>{overview.security.cookieSecure ? '管理员 Cookie 已启用 Secure 标记，仅通过 HTTPS 传输。' : '当前站点通过 HTTP 访问。建议绑定域名并配置 HTTPS 后，将 ADMIN_COOKIE_SECURE 设为 true。'}</p></div>
                  </div>
                </article>
              </div>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><LogOut className="h-4 w-4" /></span><div><h4 className="text-sm font-bold text-slate-900">结束管理员会话</h4><p className="mt-1 text-xs text-slate-400">退出后立即清除当前浏览器的管理员权限</p></div></div>
                  <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">安全退出</button>
                </div>
              </article>
            </div>
          )}

          {activeSection === 'security' && !overview && (
            <div className="flex min-h-72 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在读取安全状态…</div>
          )}
        </section>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5"><Clock3 className="h-3 w-3" />状态每 60 秒自动更新</span>
        <span className="flex items-center gap-1.5">{overview?.system.environment || 'unknown'} · {overview?.system.version || 'v2.4.0-PRO'}</span>
      </div>
    </div>
  );
};
