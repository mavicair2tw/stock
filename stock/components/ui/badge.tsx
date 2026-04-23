import * as React from 'react';

import { cn } from '@/components/ui/utils';

const variants = {
  good: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  warn: 'bg-amber-500/15 text-amber-200 border-amber-300/30',
  danger: 'bg-rose-500/15 text-rose-200 border-rose-300/30',
  neutral: 'bg-slate-500/15 text-slate-200 border-slate-300/20',
};

export function Badge({ className, variant = 'neutral', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return <div className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]', variants[variant], className)} {...props} />;
}
