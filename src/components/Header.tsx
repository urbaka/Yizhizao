import React from 'react';
import {
  MapPin,
  User,
  Download,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  amapConnected: boolean;
  onConnectApiClick: () => void;
  onExportDataClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  amapConnected,
  onConnectApiClick,
  onExportDataClick,
}) => {
  return (
    <header className="h-14 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
      {/* Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-extrabold text-slate-900 text-sm tracking-tight font-sans">
          意智造
        </span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 text-sm font-medium">
          {subtitle || title}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Connection status badge / button */}
        <button
          onClick={onConnectApiClick}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            amapConnected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-2xs'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-[0.98]'
          }`}
          title="点击配置高德/美团 API"
        >
          {amapConnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              API 已连接
            </>
          ) : (
            <>
              <KeyRound className="w-3.5 h-3.5" />
              连接 API
            </>
          )}
        </button>

        {/* Export Data */}
        <button
          onClick={onExportDataClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          导出数据
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        {/* Icons */}
        <button className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
          <MapPin className="w-4 h-4" />
        </button>
        <button className="flex items-center gap-2 p-1 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer ml-1">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs border border-slate-300">
            <User className="w-4 h-4" />
          </div>
        </button>
      </div>
    </header>
  );
};
