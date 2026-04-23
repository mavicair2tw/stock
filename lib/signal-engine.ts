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

function localizedReason(en: string, zhTW: string) {
  return {
    reason: en,
    reasonI18n: {
      en,
      'zh-TW': zhTW,
    },
  };
}

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
      return { action: 'HOLD', score: 50, severity: 'neutral', ...localizedReason('No category logic available.', '目前沒有可用的分類判斷邏輯。') };
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
      ...localizedReason(
        'Trend structure remains intact with valuation support. Accumulate gradually instead of chasing strength.',
        '趨勢結構仍然完整，且估值具備支撐。應採取分批累積，而不是追高進場。',
      ),
    };
  }

  if (finalScore <= 42) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      ...localizedReason(
        'Price is stretched or premium risk is too high relative to the medium-term trend. Trim exposure and wait for discipline to return.',
        '價格已偏離合理區間，或溢價風險相對中期趨勢過高。應降低部位，等待更有紀律的進場點。',
      ),
    };
  }

  return {
    action: 'WATCH',
    score: finalScore,
    severity: 'warn',
    ...localizedReason(
      'Structure is mixed. Keep it on watch and only add if discount support improves without a breakout chase.',
      '結構訊號仍偏混合。先列入觀察，只有在折價支撐改善且不是追價突破時才考慮加碼。',
    ),
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
      ...localizedReason(
        'Yield support is attractive and valuation is discounted. This is the kind of income entry worth scaling into patiently.',
        '收益具備支撐力，估值處於折價區間。這類型的收益型進場機會，值得耐心分批布局、逐步加碼。',
      ),
    };
  }

  if (finalScore <= 40) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      ...localizedReason(
        'Premium is too rich or structure is slipping under support. Protect income capital rather than forcing yield at a bad price.',
        '溢價過高，或結構已跌破支撐。與其在不理想的價格硬追收益，不如優先保護收益型本金。',
      ),
    };
  }

  return {
    action: 'HOLD',
    score: finalScore,
    severity: 'neutral',
    ...localizedReason(
      'Income profile is acceptable, but valuation and trend support are not compelling enough for a fresh move today.',
      '收益條件尚可，但估值與趨勢支撐尚不足以支撐今天採取新的進場動作。',
    ),
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
      ...localizedReason(
        'Balanced structure is stable and not overly extended. It supports measured positioning to smooth portfolio volatility.',
        '平衡型結構穩定，且未明顯過度延伸。適合用來平穩布局，降低整體組合波動。',
      ),
    };
  }

  if (finalScore <= 38) {
    return {
      action: 'SELL',
      score: finalScore,
      severity: 'danger',
      ...localizedReason(
        'Trend stability has deteriorated enough that this holding is no longer doing its job as a volatility smoother.',
        '趨勢穩定性已經惡化到這個部位不再具備平滑波動的功能，應考慮調節。',
      ),
    };
  }

  return {
    action: 'WATCH',
    score: finalScore,
    severity: 'warn',
    ...localizedReason(
      'Stability is decent but not strong enough for action. Avoid chasing highs and wait for a cleaner setup.',
      '穩定性尚可，但還不足以支持立即動作。避免追高，等待更乾淨明確的布局時機。',
    ),
  };
}
