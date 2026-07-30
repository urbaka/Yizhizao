import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  CircleAlert,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';

type AssistantStatus = {
  configured: boolean;
  knowledgeReady: boolean;
  documentTitle: string;
  documentCount: number;
  model: string;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  sources?: string[];
  error?: boolean;
};

const SUGGESTED_QUESTIONS = [
  '资料中的核心建设指标有哪些？',
  '租赁模式和保证金怎么规定？',
  '餐饮经营需要满足哪些条件？',
  '营业时间和现场管理有什么要求？',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '您好，我是资料问题助手。我会先检索网站管理员发布的全部知识文档，再依据原文回答；知识库没有明确说明的内容，我会如实提示您联系资料负责人确认。',
};

type QuestionAssistantViewProps = {
  knowledgeVersion: number;
};

export const QuestionAssistantView: React.FC<QuestionAssistantViewProps> = ({ knowledgeVersion }) => {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/assistant/status')
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .catch(() =>
        setStatus({
          configured: false,
          knowledgeReady: false,
          documentTitle: '暂无知识文档',
          documentCount: 0,
          model: 'deepseek-v4-flash',
        })
      );
  }, [knowledgeVersion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isAsking]);

  const askQuestion = async (value?: string) => {
    const text = (value ?? question).trim();
    if (!text || isAsking) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || '问题助手暂时无法回答，请稍后重试。');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: error instanceof Error ? error.message : '问题助手暂时无法回答，请稍后重试。',
          error: true,
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const isReady = Boolean(status?.configured && status?.knowledgeReady);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>资料问题助手</PageTitle>
          <p className="mt-2 text-sm text-slate-500">
            检索管理员发布的全部知识文档，由 DeepSeek 生成严格贴合原文的回答
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            isReady
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {status === null ? '正在检查服务' : isReady ? 'DeepSeek 文档问答在线' : '服务尚未就绪'}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur-xl sm:col-span-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">当前知识文档</p>
            <p className="truncate text-xs text-slate-500">
              {status?.documentTitle || '暂无知识文档'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">回答边界</p>
            <p className="text-xs text-slate-500">只依据文档，不补充猜测</p>
          </div>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-violet-600" />
            知识库问答
          </div>
          <span className="text-[10px] text-slate-400">不会展示或下载原始文档</span>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.error
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : message.error ? (
                  <CircleAlert className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div className={`max-w-[82%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm leading-6 ${
                    message.role === 'user'
                      ? 'rounded-tr-sm bg-blue-600 text-white shadow-sm'
                      : message.error
                      ? 'rounded-tl-sm border border-rose-100 bg-rose-50 text-rose-700'
                      : 'rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-700'
                  }`}
                >
                  {message.content}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.map((source) => (
                      <span
                        key={source}
                        className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] text-blue-700"
                      >
                        文档依据：{source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                正在检索项目资料并核对答案…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100 bg-white/85 p-4 sm:p-5">
          {messages.length === 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void askQuestion(suggestion)}
                  disabled={!isReady || isAsking}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void askQuestion();
            }}
            className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15"
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void askQuestion();
                }
              }}
              rows={2}
              aria-label="向问题助手提问"
              placeholder="请输入与知识库文档相关的问题…"
              disabled={!isReady || isAsking}
              className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isReady || isAsking || !question.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="发送问题"
            >
              {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Enter 发送 · Shift + Enter 换行</span>
            <span>{question.length}/500</span>
          </div>
        </div>
      </section>
    </div>
  );
};
