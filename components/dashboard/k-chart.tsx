"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';

const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

import { Button } from '@/components/ui/button';
import { ChartPoint } from '@/lib/types';

type RangeKey = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

interface KChartProps {
  series?: Record<RangeKey, ChartPoint[]>;
  labels: Record<RangeKey, string>;
}

export function KChart({ series, labels }: KChartProps) {
  const [range, setRange] = useState<RangeKey>('day');

  const data = useMemo(() => series?.[range] ?? [], [range, series]);

  if (!series) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as RangeKey[]).map((key) => (
          <Button key={key} type="button" className={key === range ? '' : 'bg-slate-800 text-white hover:bg-slate-700'} onClick={() => setRange(key)}>
            {labels[key]}
          </Button>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
            <Line type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
