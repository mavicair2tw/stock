import { AssetSnapshot, MarketRegime } from '@/lib/types';

export interface MarketRegimeState {
  regime: MarketRegime;
  summary: string;
  bias: number;
}

export function detectMarketRegime(assets: AssetSnapshot[]): MarketRegimeState {
  const advancing = assets.filter((asset) => asset.metrics.ma20 >= asset.metrics.ma60).length;
  const discountSupport = assets.filter((asset) => asset.metrics.discountPremium < 0).length;
  const ratio = (advancing + discountSupport) / (assets.length * 2);

  if (ratio >= 0.72) {
    return {
      regime: 'bull',
      summary: 'Broad ETF structure is constructive. Trend support and discounts allow controlled accumulation.',
      bias: 8,
    };
  }

  if (ratio <= 0.42) {
    return {
      regime: 'bear',
      summary: 'Breadth is weak. Preserve cash discipline and require stronger valuation support before buying.',
      bias: -12,
    };
  }

  return {
    regime: 'neutral',
    summary: 'Market internals are mixed. Favor selective entries and prioritize stable structures over aggressive chasing.',
    bias: 0,
  };
}
