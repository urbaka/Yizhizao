import React from 'react';
import { MapPin, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
}) => {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-[#f8fafb]/95 px-4 backdrop-blur-xl sm:px-5 lg:px-6">
      {/* Title & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hidden text-sm font-bold tracking-[-0.02em] text-slate-950 sm:inline">
          {title}
        </span>
        <span className="hidden text-slate-300 sm:inline">/</span>
        <span className="truncate text-sm font-medium text-slate-600">
          {subtitle || title}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Icons */}
        <button
          type="button"
          aria-label="定位信息"
          title="定位信息"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 active:scale-[0.98]"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="用户账户"
          title="用户账户"
          className="ml-0.5 flex items-center rounded-lg p-1 text-slate-700 transition hover:bg-white active:scale-[0.98]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm">
            <User className="w-4 h-4" />
          </div>
        </button>
      </div>
    </header>
  );
};
