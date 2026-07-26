import React from 'react';
import {
  MapPin,
  Search,
  Settings,
  Plus,
  Compass,
} from 'lucide-react';

export type ActiveTab =
  | 'regional-analysis'
  | 'lead-search'
  | 'api-settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewAnalysis?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewAnalysis,
}) => {
  const menuItems = [
    {
      id: 'regional-analysis' as ActiveTab,
      label: '区域分析',
      icon: MapPin,
    },
    {
      id: 'lead-search' as ActiveTab,
      label: '线索检索',
      icon: Search,
    },
    {
      id: 'api-settings' as ActiveTab,
      label: '接口设置',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20">
      <div>
        {/* Logo Section */}
        <div className="p-5 flex items-center gap-3.5 border-b border-slate-100/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-1 ring-white/30 shrink-0">
            <Compass className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight leading-none font-sans">
              意智造
            </h1>
            <p className="text-[11px] text-slate-400 font-normal mt-1 tracking-wider">
              商业工作台
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            onClick={onNewAnalysis}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            新建分析
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-2 space-y-1 px-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-md shadow-xs" />
                )}
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>当前版本</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
            v2.4.0-PRO
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400">
          高德 POI & 美团数据融合引擎
        </div>
      </div>
    </aside>
  );
};
