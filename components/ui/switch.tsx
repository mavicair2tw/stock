"use client";

import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/components/ui/utils';

export function Switch(props: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn('peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-slate-800 transition-colors data-[state=checked]:bg-emerald-500')}
      {...props}
    >
      <SwitchPrimitives.Thumb className={cn('pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0')} />
    </SwitchPrimitives.Root>
  );
}
