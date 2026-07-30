import React from 'react';
import {
  MapPin,
  Search,
  Settings,
  Compass,
  MessageCircleQuestion,
} from 'lucide-react';
import { AnimatedGradient } from '@/components/ui/animated-gradient';

const BRAND_GRADIENT_CONFIG = { preset: 'Aurora', speed: 10 } as const;
const BRAND_GRADIENT_NOISE = { opacity: 0.12, scale: 0.8 } as const;

export type ActiveTab =
  | 'regional-analysis'
  | 'lead-search'
  | 'question-assistant'
  | 'api-settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
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
      id: 'question-assistant' as ActiveTab,
      label: '问题助手',
      icon: MessageCircleQuestion,
    },
    {
      id: 'api-settings' as ActiveTab,
      label: '接口设置',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-white/85 backdrop-blur-xl border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20">
      <div>
        {/* Logo Section */}
        <div className="relative min-h-[104px] overflow-hidden border-b border-white/10 p-5 flex items-center gap-3.5">
          <AnimatedGradient
            config={BRAND_GRADIENT_CONFIG}
            noise={BRAND_GRADIENT_NOISE}
            className="opacity-95"
          />
          <div className="relative z-10 w-10 h-10 rounded-xl bg-white/12 text-white flex items-center justify-center shadow-lg shadow-black/20 ring-1 ring-white/25 backdrop-blur-md shrink-0">
            <Compass className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div className="relative z-10 flex flex-col justify-center">
            <h1 className="font-extrabold text-white text-xl tracking-tight leading-none font-sans drop-shadow-sm">
              意智造
            </h1>
            <p className="text-[11px] text-white/70 font-medium mt-1 tracking-wider">
              商业工作台
            </p>
          </div>
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
                className={`w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-lg transition-all duration-200 cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-md shadow-xs" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] transition-colors ${
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
      </div>
    </aside>
  );
};
