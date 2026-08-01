import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export type PageTitleProps = ComponentPropsWithoutRef<'span'>;

export function PageTitle({ children, className, ...props }: PageTitleProps) {
  return (
    <span
      className={cn(
        'relative inline-block font-bold tracking-[-0.025em] text-slate-950',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute -left-3 top-1/2 h-[0.9em] w-0.5 -translate-y-1/2 rounded-full bg-blue-600"
      />
      {children}
    </span>
  );
}
