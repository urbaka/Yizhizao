import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  CheckCircle2,
  ClipboardList,
  Download,
  FileAudio,
  Languages,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';

type MeetingLanguage = 'mandarin' | 'sichuanese' | 'english';
type MeetingSummary = {
  title: string;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{ task: string; owner: string; deadline: string }>;
  risks: string[];
  openQuestions: string[];
  keywords: string[];
};
type MeetingResult = {
  fileName: string;
  language: MeetingLanguage;
  transcript: string;
  summary: MeetingSummary;
  completedAt: string;
  asrModel: string;
  summaryModel: string;
};
type MeetingJobState = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  queuePosition?: number;
};
type MeetingServiceStatus = {
  configured: boolean;
  localAsrReady: boolean;
  deepseekReady: boolean;
  busy: boolean;
  queueLength: number;
  maxUploadBytes: number;
};

const LANGUAGE_OPTIONS: Array<{ id: MeetingLanguage; label: string; description: string }> = [
  { id: 'mandarin', label: '中文普通话', description: '普通话会议、访谈与汇报' },
  { id: 'sichuanese', label: '四川话', description: '四川方言及川普混合表达' },
  { id: 'english', label: '英语', description: '英文会议与中英混合内容' },
];
const ACCEPTED_EXTENSIONS = ['.wav', '.mp3', '.flac', '.m4a', '.mp4', '.ogg', '.webm', '.aac'];
const FALLBACK_MAX_BYTES = 80 * 1024 * 1024;

function languageLabel(language: MeetingLanguage) {
  return LANGUAGE_OPTIONS.find((item) => item.id === language)?.label || language;
}

function listSection(title: string, items: string[]) {
  return `${title}\n${items.length > 0 ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : '无明确内容'}`;
}

function buildKeyInformationExport(result: MeetingResult) {
  const { summary } = result;
  const actionItems = summary.actionItems.length > 0
    ? summary.actionItems
        .map((item, index) => `${index + 1}. ${item.task}\n   负责人：${item.owner}\n   截止时间：${item.deadline}`)
        .join('\n')
    : '无明确待办事项';
  return `${summary.title}

原始文件：${result.fileName}
会议语言：${languageLabel(result.language)}
整理时间：${new Date(result.completedAt).toLocaleString('zh-CN')}

会议概览
${summary.overview}

${listSection('关键要点', summary.keyPoints)}

${listSection('明确决定', summary.decisions)}

行动事项
${actionItems}

${listSection('风险与障碍', summary.risks)}

${listSection('待确认问题', summary.openQuestions)}

关键词
${summary.keywords.length > 0 ? summary.keywords.join('、') : '无'}
`;
}

function buildFullExport(result: MeetingResult) {
  return `${buildKeyInformationExport(result)}

完整转写
${result.transcript}
`;
}

function downloadText(fileName: string, content: string) {
  const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const MeetingAssistantView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const [serviceStatus, setServiceStatus] = useState<MeetingServiceStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<MeetingLanguage>('mandarin');
  const [job, setJob] = useState<MeetingJobState | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/meetings/status', { signal: controller.signal, cache: 'no-store' })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        setServiceStatus({
          configured: Boolean(data?.configured),
          localAsrReady: Boolean(data?.localAsrReady),
          deepseekReady: Boolean(data?.deepseekReady),
          busy: Boolean(data?.busy),
          queueLength: Number(data?.queueLength) || 0,
          maxUploadBytes: Number(data?.maxUploadBytes) || FALLBACK_MAX_BYTES,
        });
      })
      .catch((statusError) => {
        if (statusError instanceof Error && statusError.name !== 'AbortError') {
          setServiceStatus({ configured: false, localAsrReady: false, deepseekReady: false, busy: false, queueLength: 0, maxUploadBytes: FALLBACK_MAX_BYTES });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
    if (pollTimerRef.current !== null) window.clearTimeout(pollTimerRef.current);
  }, []);

  const selectFile = (nextFile: File | null) => {
    setError('');
    setResult(null);
    setJob(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('请选择 WAV、MP3、FLAC、M4A、MP4、OGG、WEBM 或 AAC 录音。');
      return;
    }
    if (nextFile.size === 0) {
      setError('录音文件为空，请重新选择。');
      return;
    }
    const maxBytes = serviceStatus?.maxUploadBytes || FALLBACK_MAX_BYTES;
    if (nextFile.size > maxBytes) {
      setError(`录音不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB，请压缩或拆分后上传。`);
      return;
    }
    setFile(nextFile);
  };

  const waitBeforePoll = (signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const handleAbort = () => {
        if (pollTimerRef.current !== null) window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
        reject(new DOMException('Aborted', 'AbortError'));
      };
      pollTimerRef.current = window.setTimeout(() => {
        pollTimerRef.current = null;
        signal.removeEventListener('abort', handleAbort);
        resolve();
      }, 2000);
      signal.addEventListener('abort', handleAbort, { once: true });
    });

  const startMeetingProcessing = async () => {
    if (!file || job?.status === 'queued' || job?.status === 'processing') return;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setError('');
    setResult(null);
    setJob({ id: '', status: 'queued', stage: '正在上传录音', progress: 2 });

    try {
      const response = await fetch('/api/meetings/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Meeting-Name': encodeURIComponent(file.name),
          'X-Meeting-Language': language,
        },
        body: file,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.jobId) {
        throw new Error(data?.message || '会议任务创建失败，请稍后重试。');
      }

      const jobId = String(data.jobId);
      setJob({ id: jobId, status: 'queued', stage: '等待本地语音处理', progress: 5, queuePosition: data.queuePosition });
      while (!controller.signal.aborted) {
        await waitBeforePoll(controller.signal);
        const statusResponse = await fetch(`/api/meetings/jobs/${encodeURIComponent(jobId)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const statusData = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok || !statusData?.success) {
          throw new Error(statusData?.message || '会议任务状态读取失败。');
        }
        setJob({
          id: jobId,
          status: statusData.status,
          stage: statusData.stage || '正在处理会议',
          progress: Number(statusData.progress) || 0,
          queuePosition: Number(statusData.queuePosition) || 0,
        });
        if (statusData.status === 'completed' && statusData.result) {
          setResult(statusData.result as MeetingResult);
          return;
        }
        if (statusData.status === 'failed') {
          throw new Error(statusData.error || '会议处理失败，请稍后重试。');
        }
      }
    } catch (processingError) {
      if (processingError instanceof Error && processingError.name === 'AbortError') return;
      setError(processingError instanceof Error ? processingError.message : '会议处理失败，请稍后重试。');
      setJob((current) => current ? { ...current, status: 'failed', stage: '处理失败' } : current);
    }
  };

  const reset = () => {
    requestControllerRef.current?.abort();
    setFile(null);
    setJob(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isWorking = job?.status === 'queued' || job?.status === 'processing';
  const baseExportName = result?.fileName.replace(/\.[^.]+$/, '') || '会议纪要';

  return (
    <div className="mx-auto h-full max-w-7xl overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>会议助手</PageTitle>
          <p className="mt-2 text-sm text-slate-500">本地语音转写 · AI 会议秘书 · 关键信息结构化整理</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${serviceStatus?.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {serviceStatus === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : serviceStatus.configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AudioLines className="h-3.5 w-3.5" />}
          {serviceStatus === null ? '正在检查服务' : serviceStatus.configured ? '本地语音识别已就绪' : '会议服务暂未就绪'}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-cyan-300"><FileAudio className="h-5 w-5" /></span>
            <div><h2 className="text-base font-black tracking-tight text-slate-900">上传会议录音</h2><p className="mt-0.5 text-xs text-slate-400">最大 80MB，录音仅在本次任务中暂存</p></div>
          </div>

          <input ref={fileInputRef} type="file" accept=".wav,.mp3,.flac,.m4a,.mp4,.ogg,.webm,.aac,audio/*" className="hidden" onChange={(event) => selectFile(event.target.files?.[0] || null)} />
          {file ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <FileAudio className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{file.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
              {!isWorking ? <button type="button" onClick={() => selectFile(null)} aria-label="移除录音" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"><X className="h-4 w-4" /></button> : null}
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center transition hover:border-cyan-400 hover:bg-cyan-50/50">
              <UploadCloud className="h-7 w-7 text-cyan-600" /><span className="mt-3 text-sm font-semibold text-slate-700">选择会议录音</span><span className="mt-1 text-[11px] text-slate-400">支持常见音频及录音视频格式</span>
            </button>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">音频只在服务器本地由 FunASR 转写；仅转写后的文本用于生成会议摘要。</p>

          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><Languages className="h-4 w-4 text-cyan-600" />会议语言</div>
            <div className="space-y-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <button key={option.id} type="button" disabled={isWorking} onClick={() => setLanguage(option.id)} aria-pressed={language === option.id} className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed ${language === option.id ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span><span className="block text-xs font-bold text-slate-800">{option.label}</span><span className="mt-0.5 block text-[10px] text-slate-400">{option.description}</span></span>
                  {language === option.id ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : null}
                </button>
              ))}
            </div>
          </div>

          {error ? <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</div> : null}

          {isWorking ? (
            <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-cyan-900"><Loader2 className="h-4 w-4 animate-spin" />{job?.stage}</span><span className="text-xs font-bold text-cyan-700">{job?.progress || 0}%</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cyan-100"><div className="h-full rounded-full bg-cyan-500 transition-[width] duration-500" style={{ width: `${job?.progress || 0}%` }} /></div>
              {job?.status === 'queued' && job.queuePosition ? <p className="mt-2 text-[10px] text-cyan-700">当前排队位置：第 {job.queuePosition} 位</p> : null}
            </div>
          ) : null}

          <button type="button" onClick={() => void startMeetingProcessing()} disabled={!file || !serviceStatus?.configured || isWorking} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">
            {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{isWorking ? '正在处理会议…' : '开始生成会议纪要'}
          </button>
          {(file || result) && !isWorking ? <button type="button" onClick={reset} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" />重新开始</button> : null}
        </section>

        <section className="min-h-[620px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm shadow-slate-900/5 sm:p-5">
          {!result ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{isWorking ? <Loader2 className="h-6 w-6 animate-spin" /> : <ClipboardList className="h-6 w-6" />}</span>
              <h3 className="mt-5 text-base font-bold text-slate-900">{isWorking ? '会议秘书正在工作' : '等待会议录音'}</h3>
              <p className="mt-2 max-w-md text-xs leading-6 text-slate-500">{isWorking ? '本地转写较长录音需要一定时间，您可以保持页面打开并等待结果。' : '上传录音后，将获得完整转写、会议概览、关键决定、行动事项、风险与待确认问题。'}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div><p className="text-[11px] font-semibold text-cyan-700">会议纪要已生成</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{result.summary.title}</h2><p className="mt-1 text-xs text-slate-400">{result.fileName} · {languageLabel(result.language)}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => downloadText(`${baseExportName}_完整会议记录.txt`, buildFullExport(result))} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Download className="h-4 w-4" />导出全文</button>
                  <button type="button" onClick={() => downloadText(`${baseExportName}_关键信息.txt`, buildKeyInformationExport(result))} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"><ListChecks className="h-4 w-4" />导出关键信息</button>
                </div>
              </div>

              <article className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4"><h3 className="text-xs font-bold text-cyan-950">会议概览</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.summary.overview}</p></article>

              <div className="grid gap-4 lg:grid-cols-2">
                <SummaryList title="关键要点" items={result.summary.keyPoints} />
                <SummaryList title="明确决定" items={result.summary.decisions} />
                <SummaryList title="风险与障碍" items={result.summary.risks} />
                <SummaryList title="待确认问题" items={result.summary.openQuestions} />
              </div>

              <article className="rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-black text-slate-900">行动事项</h3>{result.summary.actionItems.length > 0 ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="border-b border-slate-200 text-slate-400"><tr><th className="pb-2 pr-4 font-semibold">任务</th><th className="pb-2 pr-4 font-semibold">负责人</th><th className="pb-2 font-semibold">截止时间</th></tr></thead><tbody className="divide-y divide-slate-100">{result.summary.actionItems.map((item, index) => <tr key={`${item.task}-${index}`}><td className="py-3 pr-4 leading-5 text-slate-700">{item.task}</td><td className="py-3 pr-4 text-slate-500">{item.owner}</td><td className="py-3 text-slate-500">{item.deadline}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-xs text-slate-400">会议中未识别到明确行动事项。</p>}</article>

              <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-slate-900">完整转写</h3><span className="text-[10px] text-slate-400">{result.transcript.length.toLocaleString('zh-CN')} 字</span></div><div className="mt-3 max-h-[440px] overflow-y-auto rounded-xl bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.transcript}</p></div></article>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      {items.length > 0 ? <ol className="mt-3 space-y-2">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">{index + 1}</span><span>{item}</span></li>)}</ol> : <p className="mt-3 text-xs text-slate-400">未识别到明确内容。</p>}
    </article>
  );
}
