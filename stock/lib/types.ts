export type AssetCategory = 'growth' | 'high_dividend' | 'balanced';

export type MarketRegime = 'bull' | 'bear' | 'neutral';

export type SignalAction = 'BUY' | 'SELL' | 'WATCH' | 'HOLD';

export type SignalSeverity = 'good' | 'warn' | 'danger' | 'neutral';

export interface AssetDefinition {
  ticker: string;
  name: string;
  category: AssetCategory;
}

export interface AssetMetrics {
  price: number;
  previousClose: number;
  volume: number;
  ma5: number;
  ma20: number;
  ma60: number;
  rsi: number;
  dividendYield: number;
  discountPremium: number;
}

export interface AssetSnapshot extends AssetDefinition {
  updatedAt: string;
  metrics: AssetMetrics;
}

export interface SignalOutput {
  action: SignalAction;
  score: number;
  reason: string;
  severity: SignalSeverity;
}

export interface EvaluatedAsset extends AssetSnapshot {
  signal: SignalOutput;
}

export interface AlertItem {
  ticker: string;
  action: Exclude<SignalAction, 'HOLD'>;
  timestamp: string;
  reason: string;
}

export interface RulesConfig {
  rsiOversold: number;
  rsiOverbought: number;
  deepDiscount: number;
  premiumCeiling: number;
  refreshIntervalSeconds: number;
}
