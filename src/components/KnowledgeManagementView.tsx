import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Files,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';

type KnowledgeDocument = {
  id: string;
  title: string;
  originalName: string;
  sourceType: 'docx' | 'txt' | 'md' | 'pdf';
  createdAt: string;
  updatedAt: string;
  characterCount: number;
};

type KnowledgeManagementViewProps = {
  onKnowledgeChanged: () => void;
  embedded?: boolean;
  onAuthenticationRequired?: () => void;
  onLogout?: () => void;
};

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = new Set(['docx', 'txt', 'md', 'markdown', 'pdf']);

function formatCharacterCount(value: number) {
  return value >= 10_000 ? `${(value / 10_000).toFixed(1)} 万字` : `${value.toLocaleString()} 字`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
}

export const KnowledgeManagementView: React.FC<KnowledgeManagementViewProps> = ({
  onKnowledgeChanged,
  embedded = false,
  onAuthenticationRequired,
  onLogout,
}) => {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadDocuments = async () => {
    const response = await fetch('/api/admin/documents');
    if (response.status === 401) {
      setAuthenticated(false);
      setDocuments([]);
      onAuthenticationRequired?.();
      return;
    }
    const data = await response.json();
    if (!response.ok || !data?.success) throw new Error(data?.message || '资料列表加载失败。');
    setDocuments(Array.isArray(data.documents) ? data.documents : []);
    setAuthenticated(true);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/admin/session').then((response) => response.json()),
      fetch('/api/admin/documents').then(async (response) => ({
        ok: response.ok,
        status: response.status,
        data: await response.json(),
      })),
    ])
      .then(([session, documentResult]) => {
        if (cancelled) return;
        setConfigured(Boolean(session?.configured));
        const isAuthenticated = Boolean(session?.authenticated && documentResult.ok);
        setAuthenticated(isAuthenticated);
        if (!isAuthenticated && embedded) onAuthenticationRequired?.();
        setDocuments(
          isAuthenticated && Array.isArray(documentResult.data?.documents)
            ? documentResult.data.documents
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setFeedback({ type: 'error', message: '资料管理服务暂时无法连接。' });
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, onAuthenticationRequired]);

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
      await loadDocuments();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '管理员登录失败。',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    setAuthenticated(false);
    setDocuments([]);
    setFeedback(null);
    setPendingDeleteId(null);
    onLogout?.();
  };

  const chooseFile = (file: File | null) => {
    setFeedback(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const extension = file.name.toLowerCase().split('.').pop();
    if (!extension || !SUPPORTED_FILE_EXTENSIONS.has(extension)) {
      setSelectedFile(null);
      setFeedback({ type: 'error', message: '仅支持上传 DOCX、TXT、MD 或 PDF 文档。' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSelectedFile(null);
      setFeedback({ type: 'error', message: '单个文档不能超过 8MB。' });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Document-Name': encodeURIComponent(selectedFile.name),
        },
        body: selectedFile,
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        onAuthenticationRequired?.();
        throw new Error('管理员登录已失效，请重新登录。');
      }
      if (!response.ok || !data?.success) throw new Error(data?.message || '文档上传失败。');
      setSelectedFile(null);
      await loadDocuments();
      onKnowledgeChanged();
      setFeedback({ type: 'success', message: `“${data.document.title}”已加入问题助手知识库。` });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '文档上传失败。',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (document: KnowledgeDocument) => {
    if (deletingId) return;
    setDeletingId(document.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/documents/${encodeURIComponent(document.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.status === 401) {
        setAuthenticated(false);
        onAuthenticationRequired?.();
        throw new Error('管理员登录已失效，请重新登录。');
      }
      if (!response.ok || !data?.success) throw new Error(data?.message || '文档删除失败。');
      setPendingDeleteId(null);
      await loadDocuments();
      onKnowledgeChanged();
      setFeedback({ type: 'success', message: `“${document.title}”已永久删除，无法恢复。` });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '文档删除失败。',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isChecking) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
        正在检查管理员权限…
      </div>
    );
  }

  if (!authenticated) {
    if (embedded) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/90 p-6 text-center">
          <LockKeyhole className="mb-3 h-7 w-7 text-amber-600" />
          <p className="text-sm font-semibold text-amber-900">管理员会话已失效</p>
          <p className="mt-1 text-xs text-amber-700">请返回后台登录页重新验证身份。</p>
        </div>
      );
    }
    return (
      <div className="mx-auto flex h-full max-w-5xl items-center justify-center p-4 sm:p-6 lg:p-8">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white/94 p-6 shadow-xl shadow-slate-900/8 sm:p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <PageTitle>管理员资料管理</PageTitle>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                仅网站所有者可上传或删除问题助手使用的知识文档。
              </p>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`mb-4 rounded-lg border px-3.5 py-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {configured ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">管理员密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  maxLength={200}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  placeholder="请输入管理员密码"
                />
              </label>
              <button
                type="submit"
                disabled={!password || isLoggingIn}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                进入资料管理
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              服务器尚未配置管理员密码，请先由网站所有者完成安全配置。
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-400">
            登录会话 12 小时后自动失效。当前站点使用 HTTP，后续建议绑定域名并启用 HTTPS。
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={embedded ? 'h-full' : 'mx-auto h-full max-w-6xl overflow-y-auto p-4 sm:p-6 lg:p-8'}>
      {!embedded && <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>资料管理</PageTitle>
          <p className="mt-2 text-sm text-slate-500">
            管理问题助手可检索的私有知识文档，上传后立即生效。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            管理员已验证
          </span>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            退出
          </button>
        </div>
      </div>}

      {feedback && (
        <div
          role="status"
          className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-slate-200 bg-white/94 p-5 shadow-sm shadow-slate-900/5"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">上传知识文档</h3>
              <p className="text-xs text-slate-500">支持 DOCX、TXT、MD、PDF，单个文件不超过 8MB</p>
              <p className="mt-0.5 text-[10px] text-slate-400">PDF 需包含文本层，纯扫描件暂不支持 OCR</p>
            </div>
          </div>

          <label
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              chooseFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <input
              type="file"
              accept=".docx,.txt,.md,.markdown,.pdf"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />
            <Files className="mb-3 h-8 w-8 text-blue-500" />
            <span className="text-sm font-semibold text-slate-700">
              {selectedFile ? selectedFile.name : '拖拽文档到这里，或点击选择'}
            </span>
            <span className="mt-1 text-xs text-slate-400">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '原始文档不会向普通访客开放下载'}
            </span>
          </label>

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? '正在解析并发布…' : '上传并加入知识库'}
          </button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white/94 p-5 shadow-sm shadow-slate-900/5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">已发布资料</h3>
                <p className="text-xs text-slate-500">问题助手当前检索 {documents.length} 份文档</p>
              </div>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <Files className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">知识库暂时为空</p>
              <p className="mt-1 text-xs text-slate-400">上传第一份资料后，问题助手即可开始检索</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const isPendingDelete = pendingDeleteId === document.id;
                const isDeleting = deletingId === document.id;
                return (
                  <article
                    key={document.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase text-blue-700 shadow-sm">
                            {document.sourceType}
                          </span>
                          <h4 className="truncate text-sm font-semibold text-slate-800">{document.title}</h4>
                        </div>
                        <p className="mt-2 truncate text-xs text-slate-500">原文件：{document.originalName}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatCharacterCount(document.characterCount)} · 上传于 {formatDate(document.createdAt)}
                        </p>
                      </div>

                      {isPendingDelete ? (
                        <div className="shrink-0 text-right">
                          <p className="mb-1.5 text-[11px] font-medium text-rose-600">永久删除，无法恢复</p>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              disabled={isDeleting}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(document)}
                              disabled={isDeleting}
                              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                              {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                              永久删除
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(document.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`永久删除“${document.title}”`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
