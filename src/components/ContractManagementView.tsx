import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Scale,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';

type RiskLevel = '高' | '中' | '低';

type ContractReview = {
  fileName: string;
  ourParty: string;
  model: string;
  reviewedAt: string;
  overall: {
    riskLevel: RiskLevel;
    summary: string;
    mainDisadvantages: string[];
  };
  dimensions: Array<{ title: string; riskLevel: RiskLevel; findings: string[] }>;
  risks: Array<{
    riskLevel: RiskLevel;
    clause: string;
    risk: string;
    analysis: string;
    suggestion: string;
  }>;
  missingClauses: Array<{ name: string; reason: string; suggestion: string }>;
  reportText?: string;
  disclaimer: string;
};

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.markdown', '.txt'];

const RISK_STYLES: Record<RiskLevel, string> = {
  高: 'border-rose-200 bg-rose-50 text-rose-700',
  中: 'border-amber-200 bg-amber-50 text-amber-700',
  低: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

function RiskPill({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${RISK_STYLES[level]}`}>
      {level}风险
    </span>
  );
}

function escapeReportCell(value: string) {
  return value.replace(/\|/g, '｜').replace(/\r?\n/g, '；');
}

function buildReportText(review: ContractReview) {
  const disadvantages = review.overall.mainDisadvantages.length > 0
    ? review.overall.mainDisadvantages.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : '未识别到明确的我方主要劣势。';
  const dimensions = review.dimensions
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}（${item.riskLevel}风险）\n${
          item.findings.length > 0 ? item.findings.map((finding) => `   - ${finding}`).join('\n') : '   - 暂未识别到明确问题。'
        }`
    )
    .join('\n');
  const risks = review.risks.length > 0
    ? review.risks
        .map(
          (item) =>
            `| ${item.riskLevel} | ${escapeReportCell(item.clause)} | ${escapeReportCell(`${item.risk}；${item.analysis}`)} | ${escapeReportCell(item.suggestion)} |`
        )
        .join('\n')
    : '| 低 | 未发现 | 本次自动审查未识别到明确风险，但不代表合同不存在风险 | 建议由专业律师进行最终复核 |';
  const missing = review.missingClauses.length > 0
    ? review.missingClauses
        .map((item, index) => `${index + 1}. ${item.name}\n   - 缺失影响：${item.reason}\n   - 补充建议：${item.suggestion}`)
        .join('\n')
    : '本次审查未识别到明显缺失的常规条款。';

  return `合同风险审查报告

合同文件：${review.fileName}
我方身份：${review.ourParty}
审查模型：DeepSeek-V4-Flash
审查时间：${new Date(review.reviewedAt).toLocaleString('zh-CN')}

一、整体评估
整体风险等级：${review.overall.riskLevel}
${review.overall.summary}

我方主要劣势：
${disadvantages}

二、五个核心维度审查
${dimensions}

三、风险清单与修改建议
| 风险等级（高/中/低） | 合同对应条款/位置 | 存在的风险及法律分析 | 具体的修改建议或补充条款文本 |
| --- | --- | --- | --- |
${risks}

四、缺失条款提醒
${missing}

重要提示：${review.disclaimer}`;
}

export const ContractManagementView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ourParty, setOurParty] = useState('我方（合同审查发起方）');
  const [consented, setConsented] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<ContractReview | null>(null);
  const [reportText, setReportText] = useState('');

  const selectFile = (nextFile: File | null) => {
    setError('');
    setReview(null);
    setReportText('');
    if (!nextFile) {
      setFile(null);
      return;
    }
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('仅支持 PDF、DOCX、MD 或 TXT 合同文档。');
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setError('单个合同文档不能超过 15MB。');
      return;
    }
    setFile(nextFile);
  };

  const submitReview = async () => {
    if (!file || !consented || isReviewing) return;
    setIsReviewing(true);
    setError('');
    setReview(null);
    setReportText('');
    try {
      const response = await fetch('/api/contracts/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Contract-Name': encodeURIComponent(file.name),
          'X-Contract-Party': encodeURIComponent(ourParty.trim() || '我方（合同审查发起方）'),
          'X-Contract-Consent': 'true',
          'X-Generate-Report': 'false',
        },
        body: file,
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || '合同审查失败，请稍后重试。');
      setReview(data as ContractReview);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : '合同审查失败，请稍后重试。');
    } finally {
      setIsReviewing(false);
    }
  };

  const generateReport = () => {
    if (!review) return;
    setReportText(review.reportText || buildReportText(review));
  };

  const downloadReport = () => {
    if (!review || !reportText) return;
    const blob = new Blob(['\uFEFF', reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${review.fileName.replace(/\.[^.]+$/, '')}_合同风险审查报告.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto h-full max-w-7xl overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>合同管理</PageTitle>
          <p className="mt-2 text-sm text-slate-500">当前功能：合同风险审查 · 五个核心维度深度分析</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
          <Sparkles className="h-3.5 w-3.5" />DeepSeek-V4-Flash 正式版
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-cyan-300">
              <FileCheck2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">合同风险审查</h2>
              <p className="mt-0.5 text-xs text-slate-400">支持 PDF、DOCX、MD、TXT，最大 15MB</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.md,.markdown,.txt"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0] || null)}
          />
          {file ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <FileText className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{file.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={() => selectFile(null)} aria-label="移除合同" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
            >
              <UploadCloud className="h-7 w-7 text-blue-600" />
              <span className="mt-3 text-sm font-semibold text-slate-700">选择合同文档</span>
              <span className="mt-1 text-[11px] text-slate-400">扫描版 PDF 暂不支持，请使用带文字层的文件</span>
            </button>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">我方身份或立场</span>
            <input
              value={ourParty}
              onChange={(event) => setOurParty(event.target.value.slice(0, 80))}
              maxLength={80}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              placeholder="例如：甲方、采购方、承租方"
            />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-[11px] leading-5 text-slate-600">
              我确认有权上传，并同意合同文本发送至服务器配置的 DeepSeek API 进行本次审查。
            </span>
          </label>

          {error ? <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{error}</div> : null}

          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={!file || !consented || isReviewing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {isReviewing ? '正在进行五维深度审查…' : '开始风险审查'}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50/70 p-3 text-[11px] leading-5 text-cyan-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            合同原文只在本次请求内存中处理，不写入知识库或服务器文件；AI 结果不构成正式法律意见。
          </div>
        </section>

        <section className="min-h-[560px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm shadow-slate-900/5 sm:p-5">
          {isReviewing ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Loader2 className="h-6 w-6 animate-spin" /></span>
              <h3 className="mt-5 text-base font-bold text-slate-900">DeepSeek 正在审阅合同</h3>
              <p className="mt-2 max-w-md text-xs leading-6 text-slate-500">正在核对权利义务、付款交付、违约赔偿、解除机制与争议管辖。长合同可能需要约 1–2 分钟。</p>
            </div>
          ) : !review ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Scale className="h-6 w-6" /></span>
              <h3 className="mt-5 text-base font-bold text-slate-900">等待合同文档</h3>
              <p className="mt-2 max-w-md text-xs leading-6 text-slate-500">完成审查后，将显示整体风险等级、五维结论、风险清单、修改文本与缺失条款提醒。</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h2 className="text-base font-black text-slate-900">审查完成</h2></div>
                  <p className="mt-1.5 text-xs text-slate-400">{review.fileName} · {new Date(review.reviewedAt).toLocaleString('zh-CN')}</p>
                </div>
                <RiskPill level={review.overall.riskLevel} />
              </div>

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">整体评估</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{review.overall.summary}</p>
                {review.overall.mainDisadvantages.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600">
                    {review.overall.mainDisadvantages.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                  </ul>
                ) : null}
              </article>

              <div>
                <h3 className="text-sm font-bold text-slate-900">五个核心维度</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {review.dimensions.map((dimension) => (
                    <article key={dimension.title} className="rounded-xl border border-slate-200 p-4 last:md:col-span-2">
                      <div className="flex items-center justify-between gap-3"><h4 className="text-xs font-bold text-slate-800">{dimension.title}</h4><RiskPill level={dimension.riskLevel} /></div>
                      <ul className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-500">
                        {(dimension.findings.length > 0 ? dimension.findings : ['暂未识别到明确问题。']).map((finding, index) => <li key={`${finding}-${index}`}>• {finding}</li>)}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">风险清单与修改建议</h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[920px] w-full border-collapse text-left text-[11px] leading-5">
                    <thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2.5">风险等级</th><th className="px-3 py-2.5">合同条款/位置</th><th className="px-3 py-2.5">风险及分析</th><th className="px-3 py-2.5">修改建议或补充文本</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {review.risks.length > 0 ? review.risks.map((item, index) => (
                        <tr key={`${item.clause}-${index}`} className="align-top"><td className="px-3 py-3"><RiskPill level={item.riskLevel} /></td><td className="max-w-44 px-3 py-3 font-semibold text-slate-700">{item.clause}</td><td className="max-w-72 px-3 py-3 text-slate-600"><p className="font-semibold text-slate-700">{item.risk}</p><p className="mt-1">{item.analysis}</p></td><td className="max-w-80 whitespace-pre-wrap px-3 py-3 text-slate-600">{item.suggestion}</td></tr>
                      )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">本次未识别到明确风险，请仍由专业律师进行最终复核。</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <article className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <h3 className="text-sm font-bold text-amber-900">缺失条款提醒</h3>
                {review.missingClauses.length > 0 ? <div className="mt-3 space-y-3">{review.missingClauses.map((item, index) => <div key={`${item.name}-${index}`} className="text-xs leading-5 text-amber-900"><p className="font-bold">{index + 1}. {item.name}</p><p className="mt-1 text-amber-800">{item.reason}</p><p className="mt-1 text-amber-800">建议：{item.suggestion}</p></div>)}</div> : <p className="mt-2 text-xs text-amber-800">本次审查未识别到明显缺失的常规条款。</p>}
              </article>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-bold text-slate-900">专业合同审查报告</h3><p className="mt-1 text-[11px] text-slate-500">确认风险结果后，可生成并导出规范文本报告。</p></div>
                  {!reportText ? <button type="button" onClick={generateReport} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500">生成专业报告</button> : <button type="button" onClick={downloadReport} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"><Download className="h-3.5 w-3.5" />导出 TXT</button>}
                </div>
                {reportText ? <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-blue-100 bg-white p-4 font-sans text-[11px] leading-6 text-slate-600">{reportText}</pre> : null}
              </div>

              <p className="text-[10px] leading-5 text-slate-400">{review.disclaimer}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
