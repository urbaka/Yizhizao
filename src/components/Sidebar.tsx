import React from 'react';
import {
  MapPin,
  Search,
  Compass,
  MessageCircleQuestion,
  ShieldCheck,
} from 'lucide-react';
import { AnimatedGradient } from '@/components/ui/animated-gradient';

const BRAND_GRADIENT_CONFIG = {
  preset: 'custom',
  color1: '#071923',
  color2: '#0f3442',
  color3: '#138c9e',
  rotation: -36,
  proportion: 64,
  scale: 0.55,
  speed: 8,
  distortion: 30,
  swirl: 58,
  softness: 100,
  shape: 'Edge',
} as const;
const BRAND_GRADIENT_NOISE = { opacity: 0.08, scale: 0.8 } as const;

export type ActiveTab =
  | 'regional-analysis'
  | 'lead-search'
  | 'question-assistant'
  | 'admin';

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
  ];

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex h-16 w-full shrink-0 select-none border-t border-slate-200/80 bg-[#f7f9fa]/96 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl md:sticky md:inset-auto md:top-0 md:h-[100dvh] md:w-[84px] md:flex-col md:border-r md:border-t-0 md:shadow-none lg:w-64">
      {/* Logo Section */}
      <div className="relative hidden min-h-[92px] w-full shrink-0 items-center justify-center overflow-hidden border-b border-white/10 px-3 md:flex lg:justify-start lg:px-5">
          <AnimatedGradient
            config={BRAND_GRADIENT_CONFIG}
            noise={BRAND_GRADIENT_NOISE}
            className="opacity-100"
          />
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-md">
            <Compass className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div className="relative z-10 ml-3.5 hidden flex-col justify-center lg:flex">
            <h1 className="font-extrabold text-white text-xl tracking-tight leading-none font-sans drop-shadow-sm">
              意智造
            </h1>
            <p className="text-[11px] text-white/70 font-medium mt-1 tracking-wider">
              商业工作台
            </p>
          </div>
      </div>

      <div className="flex min-w-0 flex-1 items-stretch md:min-h-0 md:w-full md:flex-col">
        {/* Navigation Items */}
        <nav className="flex min-w-0 flex-1 items-center justify-around gap-1 px-2 md:block md:space-y-1 md:px-2.5 md:pt-3" aria-label="主要功能">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition duration-200 active:scale-[0.98] md:w-full md:flex-none md:flex-row md:gap-0 md:px-3 md:py-3 md:text-left md:text-sm lg:justify-start lg:gap-3 lg:px-4 lg:text-[15px] ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-sm shadow-slate-900/10'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-t bg-cyan-400 md:bottom-auto md:left-0 md:top-1/2 md:h-5 md:w-0.5 md:-translate-x-0 md:-translate-y-1/2 md:rounded-r" />
                )}
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                />
                <span className="max-w-full truncate md:hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Admin remains the final navigation action on mobile. */}
        <nav className="flex min-w-[64px] items-center px-1 md:hidden" aria-label="网站管理">
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            aria-current={activeTab === 'admin' ? 'page' : undefined}
            className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition active:scale-[0.98] ${
              activeTab === 'admin' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className={`h-[18px] w-[18px] ${activeTab === 'admin' ? 'text-cyan-300' : 'text-slate-400'}`} />
            <span>后台管理</span>
          </button>
        </nav>

        {/* Desktop admin entry is anchored above the version footer. */}
        <nav className="mt-auto hidden w-full px-2.5 pb-3 md:block" aria-label="网站管理">
          <div className="mb-3 border-t border-slate-200/80" />
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            aria-current={activeTab === 'admin' ? 'page' : undefined}
            title="后台管理"
            className={`relative flex w-full items-center justify-center rounded-lg px-3 py-3 text-sm font-medium transition duration-200 active:scale-[0.98] lg:justify-start lg:gap-3 lg:px-4 lg:text-[15px] ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-white font-semibold shadow-sm shadow-slate-900/10'
                : 'text-slate-500 hover:bg-white hover:text-slate-900'
            }`}
          >
            {activeTab === 'admin' && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-cyan-400" />
            )}
            <ShieldCheck
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                activeTab === 'admin' ? 'text-cyan-300' : 'text-slate-400'
              }`}
            />
            <span className="hidden lg:inline">后台管理</span>
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="hidden w-full shrink-0 border-t border-slate-200/80 px-3 py-4 text-xs text-slate-400 md:block lg:p-4">
        <div className="flex items-center justify-center lg:justify-between">
          <span className="hidden lg:inline">当前版本</span>
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-600 ring-1 ring-slate-200 lg:text-xs">
            v2.4.0-PRO
          </span>
        </div>
      </div>
    </aside>
  );
};
