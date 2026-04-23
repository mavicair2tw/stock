import * as React from 'react';

import { cn } from '@/components/ui/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-emerald-400/40',
        className,
      )}
      {...props}
    />
  );
}
