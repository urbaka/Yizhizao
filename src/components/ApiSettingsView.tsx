import React, { useState } from 'react';
import {
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Play,
  Save,
  Loader2,
} from 'lucide-react';
import { ApiSettings } from '../types';
import { BoundStoresModal } from './BoundStoresModal';

interface ApiSettingsViewProps {
  settings: ApiSettings;
  onUpdateSettings: (newSettings: Partial<ApiSettings>) => void;
  onTestAmapConnection: (key: string) => Promise<void>;
  onTestMeituanConnection: (appId: string, secret: string) => Promise<void>;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onTestAmapConnection,
  onTestMeituanConnection,
}) => {
  const [amapKeyInput, setAmapKeyInput] = useState(settings.amapKey || '');
  const [meituanAppIdInput, setMeituanAppIdInput] = useState(settings.meituanAppId || '');
  const [meituanSecretInput, setMeituanSecretInput] = useState(settings.meituanAppSecret || '');

  const [isTestingAmap, setIsTestingAmap] = useState(false);
  const [isTestingMeituan, setIsTestingMeituan] = useState(false);

  const [isBoundModalOpen, setIsBoundModalOpen] = useState(false);
  const [boundIds, setBoundIds] = useState(['MT-8839201', 'MT-9921002', 'MT-7712399', 'MT-6638102']);

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

  const handleTestMeituan = async () => {
    setIsTestingMeituan(true);
    setFeedbackMsg(null);
    try {
      await onTestMeituanConnection(meituanAppIdInput, meituanSecretInput);
    } finally {
      setIsTestingMeituan(false);
    }
  };

  const handleSaveMeituan = () => {
    onUpdateSettings({
      meituanAppId: meituanAppIdInput,
      meituanAppSecret: meituanSecretInput,
    });
    setFeedbackMsg({ type: 'success', text: '美团开放平台凭证已加密保存至服务端！' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">接口设置</h2>
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

      {/* 2. Meituan API Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                美团/点评开放平台
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                用于获取商户详情、评价数据及团购信息。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Mode Switcher */}
          <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>美团/点评数据接入模式</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {settings.meituanMode === 'official_bound' ? '官方授权绑定模式' : '第三方免绑定全网检索模式 (推荐)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ meituanMode: 'third_party_open' })}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                  settings.meituanMode !== 'official_bound'
                    ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">⚡ 第三方免绑定全网检索模式</span>
                  {settings.meituanMode !== 'official_bound' && (
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>无须绑定美团商户账号！</strong>可像高德 API 一样直接调取全国任意城市和区域全量商户的美团/点评基础数据与竞品信息。
                </p>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ meituanMode: 'official_bound' })}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                  settings.meituanMode === 'official_bound'
                    ? 'bg-amber-50/80 border-amber-600 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">🔐 美团官方开放平台授权模式</span>
                  {settings.meituanMode === 'official_bound' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  要求拥有美团开放平台开发者账号，需使用 <code>poi/getids</code> 提前绑定特定门店 ID，单次处理上限 100 家。
                </p>
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                App ID
              </label>
              <input
                type="text"
                value={meituanAppIdInput}
                onChange={(e) => setMeituanAppIdInput(e.target.value)}
                placeholder="开放平台 App ID"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                App Secret
              </label>
              <input
                type="password"
                value={meituanSecretInput}
                onChange={(e) => setMeituanSecretInput(e.target.value)}
                placeholder="开放平台 App Secret"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono"
              />
            </div>
          </div>

          {/* Right Info Box */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>门店 ID 绑定 (poi/getids)</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              在进行批量数据获取前，需要先通过接口绑定对应的门店 ID 集合。
            </p>
            <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>
                <strong>注意：</strong>开放平台限制批量处理单次请求最大不超过 100 个门店 ID。
              </span>
            </div>
            <button
              onClick={() => setIsBoundModalOpen(true)}
              className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-md text-xs font-semibold shadow-xs cursor-pointer text-center"
            >
              管理绑定门店 ({boundIds.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestMeituan}
            disabled={isTestingMeituan}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isTestingMeituan ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-blue-700" />
            )}
            测试凭证
          </button>
          <button
            onClick={handleSaveMeituan}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" />
            保存凭证
          </button>
        </div>
      </div>

      <BoundStoresModal
        isOpen={isBoundModalOpen}
        onClose={() => setIsBoundModalOpen(false)}
        boundIds={boundIds}
        onSaveBoundIds={(ids) => setBoundIds(ids)}
      />
    </div>
  );
};
