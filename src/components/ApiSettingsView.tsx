import React, { useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Save,
  Loader2,
} from 'lucide-react';
import { ApiSettings } from '../types';
import { PageTitle } from '@/components/ui/page-title';

interface ApiSettingsViewProps {
  settings: ApiSettings;
  onUpdateSettings: (newSettings: Partial<ApiSettings>) => void;
  onTestAmapConnection: (key: string) => Promise<void>;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onTestAmapConnection,
}) => {
  const [amapKeyInput, setAmapKeyInput] = useState(settings.amapKey || '');

  const [isTestingAmap, setIsTestingAmap] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTestAmap = async () => {
    setIsTestingAmap(true);
    setFeedbackMsg(null);
    try {
      await onTestAmapConnection(amapKeyInput);
    } finally {
      setIsTestingAmap(false);
    }
  };

  const handleSaveAmap = () => {
    onUpdateSettings({ amapKey: amapKeyInput });
    setFeedbackMsg({ type: 'success', text: '高德 API Key 已安全保存至服务器环境！' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          <PageTitle>接口设置</PageTitle>
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          配置外部数据源接入凭证及数据处理规则。请确保密钥安全，所有凭证仅在服务端进行加密存储。
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 1. Amap API Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                高德地图 Web 服务 API
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                用于基础地理编码、逆地理编码及周边 POI 检索。
              </p>
            </div>
          </div>
          <HelpCircle className="w-5 h-5 text-slate-400" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            API 密钥
          </label>
          <input
            type="password"
            value={amapKeyInput}
            onChange={(e) => setAmapKeyInput(e.target.value)}
            placeholder="输入高德地图 Web 服务 Key"
            className="w-full max-w-md px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            凭证仅保存在服务端，前端不可见完整密钥。
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestAmap}
            disabled={isTestingAmap}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isTestingAmap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-blue-700" />}
            测试连接
          </button>
          <button
            onClick={handleSaveAmap}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" />
            保存
          </button>

          {settings.amapStatus === 'connected' && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ml-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> API 已就绪
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
