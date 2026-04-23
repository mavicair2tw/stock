import { MarketRegimeState } from '@/lib/market-regime';
import { AssetSnapshot, RulesConfig, SignalOutput } from '@/lib/types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const defaultRules: RulesConfig = {
  rsiOversold: 35,
  rsiOverbought: 68,
  deepDiscount: -2,
  premiumCeiling: 2,
  refreshIntervalSeconds: 60,
};

export function getDefaultRules(): RulesConfig {
  return defaultRules;
}

export function evaluateSignal(asset: AssetSnapshot, market: MarketRegimeState, rules: RulesConfig = defaultRules): SignalOutput {
  switch (asset.category) {
    case 'growth':
      return evaluateGrowth(asset, market);
    case 'high_dividend':
      return evaluateHighDividend(asset, market, rules);
    case 'balanced':
      return evaluateBalanced(asset, market);
    default:
      return { action: 'HOLD', score: 50, reason: 'No category logic available.', severity: 'neutral' };
  }
}

function evaluateGrowth(asset: AssetSnapshot, market: MarketRegimeState): SignalOutput {
  const { price, ma20, ma60, discountPremium } = asset.metrics;
  const trendStable = price >= ma20 && ma20 >= ma60;
  let score = 55 + market.bias;

  if (trendStable) score += 14;
  if (discountPremium <= -1) score += 10;
  if (discountPremium >= 1.5) score -= 16;
  if (price > ma20 * 1.04) score -= 12;

  const finalScore = clamp(score);

  if (finalScore >= 72) {
    return {
      action: market.regime === 'bear' ? 'WATCH' : 'BUY',
      score: finalScore,
      severity: 'good',
      reason: 'Trend structure remains intact with valuation support. Accumulate gradually instead of chasing strength.',
    };
  }

  if (finalScore <= 42) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      reason: 'Price is stretched or premium risk is too high relative to the medium-term trend. Trim exposure and wait for discipline to return.',
    };
  }

  return {
    action: 'WATCH',
    score: finalScore,
    severity: 'warn',
    reason: 'Structure is mixed. Keep it on watch and only add if discount support improves without a breakout chase.',
  };
}

function evaluateHighDividend(asset: AssetSnapshot, market: MarketRegimeState, rules: RulesConfig): SignalOutput {
  const { dividendYield, discountPremium, ma20, ma60, price } = asset.metrics;
  let score = 50 + market.bias;

  if (dividendYield >= 6) score += 18;
  if (discountPremium <= rules.deepDiscount) score += 16;
  if (discountPremium >= rules.premiumCeiling) score -= 25;
  if (price < ma60) score -= 14;
  if (ma20 >= ma60) score += 8;

  const finalScore = clamp(score);

  if (finalScore >= 74) {
    return {
      action: market.regime === 'bear' ? 'WATCH' : 'BUY',
      score: finalScore,
      severity: 'good',
      reason: 'Yield support is attractive and valuation is discounted. This is the kind of income entry worth scaling into patiently.',
    };
  }

  if (finalScore <= 40) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      reason: 'Premium is too rich or structure is slipping under support. Protect income capital rather than forcing yield at a bad price.',
    };
  }

  return {
    action: 'HOLD',
    score: finalScore,
    severity: 'neutral',
    reason: 'Income profile is acceptable, but valuation and trend support are not compelling enough for a fresh move today.',
  };
}

function evaluateBalanced(asset: AssetSnapshot, market: MarketRegimeState): SignalOutput {
  const { price, ma20, ma60, discountPremium } = asset.metrics;
  let score = 52 + market.bias;

  if (price >= ma20 && ma20 >= ma60) score += 14;
  if (price > ma20 * 1.03) score -= 10;
  if (price < ma60) score -= 12;
  if (discountPremium <= -1) score += 7;

  const finalScore = clamp(score);

  if (finalScore >= 70) {
    return {
      action: market.regime === 'bear' ? 'WATCH' : 'BUY',
      score: finalScore,
      severity: 'good',
      reason: 'Balanced structure is stable and not overly extended. It supports measured positioning to smooth portfolio volatility.',
    };
  }

  if (finalScore <= 38) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      reason: 'Trend stability has deteriorated enough that this holding is no longer doing its job as a volatility smoother.',
    };
  }

  return {
    action: 'WATCH',
    score: finalScore,
    severity: 'warn',
    reason: 'Stability is decent but not strong enough for action. Avoid chasing highs and wait for a cleaner setup.',
  };
}
