import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { mockSnapshots } from '@/lib/mock-data';
import { detectMarketRegime } from '@/lib/market-regime';
import { evaluateSignal, getDefaultRules } from '@/lib/signal-engine';

export default function HomePage() {
  const rules = getDefaultRules();
  const marketState = detectMarketRegime(mockSnapshots);
  const assets = mockSnapshots.map((asset) => ({
    ...asset,
    signal: evaluateSignal(asset, marketState, rules),
  }));

  const alerts = assets
    .filter((asset): asset is (typeof assets)[number] & { signal: { action: 'BUY' | 'SELL' | 'WATCH' } } => asset.signal.action !== 'HOLD')
    .map((asset) => ({
      ticker: asset.ticker,
      action: asset.signal.action,
      timestamp: asset.updatedAt,
      reason: asset.signal.reason,
    }));

  return (
    <DashboardClient
      assets={assets}
      alerts={alerts}
      marketRegime={marketState.regime}
      marketSummary={marketState.summary}
      rules={rules}
      updatedAt={new Date(mockSnapshots[0]?.updatedAt ?? Date.now()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}
    />
  );
}
