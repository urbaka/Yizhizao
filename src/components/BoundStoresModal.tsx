import React, { useState } from 'react';
import { X, Store, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface BoundStoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  boundIds: string[];
  onSaveBoundIds: (ids: string[]) => void;
}

export const BoundStoresModal: React.FC<BoundStoresModalProps> = ({
  isOpen,
  onClose,
  boundIds,
  onSaveBoundIds,
}) => {
  const [idsText, setIdsText] = useState(boundIds.join('\n'));
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentCount = idsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean).length;

  const isExceeded = currentCount > 100;

  const handleSave = () => {
    if (isExceeded) return;
    const parsed = idsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onSaveBoundIds(parsed);
    setSuccessMsg(`已成功更新 ${parsed.length} 个绑定门店 ID！`);
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Store className="w-5 h-5 text-blue-800" />
            <span>管理美团/点评绑定门店 (poi/getids)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>开放平台限制：</strong> 在进行批量数据获取前，必须先绑定对应的门店 ID 集合。
              单次批量处理最大不超过 <strong className="text-amber-900">100 个门店 ID</strong>。
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              美团门店 ID 列表（每行一个 ID）：
            </label>
            <textarea
              value={idsText}
              onChange={(e) => setIdsText(e.target.value)}
              rows={8}
              placeholder="MT-8839201&#10;MT-9921002&#10;MT-7712399"
              className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent bg-slate-50"
            />
            <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
              <span>当前已输入 {currentCount} 个 ID</span>
              <span className={isExceeded ? 'text-red-600 font-bold' : 'text-slate-500'}>
                上限: 100/100
              </span>
            </div>
          </div>

          {isExceeded && (
            <p className="text-xs text-red-600 font-medium">
              ⚠️ 数量超限！单次获取请勿超过 100 个门店 ID。
            </p>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setIdsText('')}
            className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> 清空
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isExceeded}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                isExceeded
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-sm hover:shadow-md hover:shadow-blue-500/20'
              }`}
            >
              保存门店绑定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
