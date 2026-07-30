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
