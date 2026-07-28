import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export type PageTitleProps = ComponentPropsWithoutRef<'span'>;

export function PageTitle({ children, className, ...props }: PageTitleProps) {
  return (
    <span
      className={cn(
        'relative inline-block bg-gradient-to-r from-slate-950 via-indigo-800 to-teal-700 bg-clip-text font-extrabold tracking-[-0.035em] text-transparent',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute -left-3 top-1/2 h-[1.15em] w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-fuchsia-500 via-violet-600 to-teal-400 shadow-[0_0_10px_rgba(124,58,237,0.35)]"
      />
      {children}
    </span>
  );
}
