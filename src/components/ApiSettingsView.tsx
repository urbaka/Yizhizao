import React, { useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Loader2,
  MapPin,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageTitle } from '@/components/ui/page-title';
import { ApiSettings } from '../types';

interface ApiSettingsViewProps {
  settings: ApiSettings;
  onTestAmapConnection: () => Promise<boolean>;
  embedded?: boolean;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  settings,
  onTestAmapConnection,
  embedded = false,
}) => {
  const [isTestingAmap, setIsTestingAmap] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleTestAmap = async () => {
    setIsTestingAmap(true);
    setFeedbackMsg(null);
    try {
      const connected = await onTestAmapConnection();
      setFeedbackMsg({
        type: connected ? 'success' : 'error',
        text: connected
          ? '高德地图 API 连接正常。'
          : '高德地图 API 连接失败，请由管理员检查服务器配置。',
      });
    } finally {
      setIsTestingAmap(false);
    }
  };

  const isConfigured = Boolean(settings.hasAmapKey);

  return (
    <div className={embedded ? 'space-y-5' : 'mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8'}>
      {!embedded && <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          <PageTitle>接口设置</PageTitle>
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          API 凭证由腾讯云服务器统一托管，网页访客无法查看或修改密钥。
        </p>
      </div>}

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
                用于区域定位、地理编码及周边 POI 商户检索。
              </p>
            </div>
          </div>
          <HelpCircle className="w-5 h-5 text-slate-400" />
        </div>

        <div className="max-w-md rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck
                className={`w-5 h-5 shrink-0 ${
                  isConfigured ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">服务器端密钥</p>
                <p className="text-xs text-slate-500 truncate">
                  {isConfigured ? '已安全配置，密钥内容不可见' : '尚未配置'}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                isConfigured
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {isConfigured ? '已托管' : '未配置'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestAmap}
            disabled={isTestingAmap || !isConfigured}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingAmap ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-blue-700" />
            )}
            测试连接
          </button>

          {settings.amapStatus === 'connected' && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> API 已就绪
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
