import { ETF_ASSETS } from '@/lib/asset-classifier';
import { AssetSnapshot } from '@/lib/types';

const now = new Date().toISOString();

const seeded = {
  '00981A': { price: 15.42, previousClose: 15.18, volume: 1823400, ma5: 15.28, ma20: 15.11, ma60: 15.36, rsi: 54, dividendYield: 2.8, discountPremium: -1.9 },
  '00400A': { price: 18.63, previousClose: 18.74, volume: 2412000, ma5: 18.7, ma20: 18.55, ma60: 18.29, rsi: 48, dividendYield: 6.7, discountPremium: -2.4 },
  '00401A': { price: 21.08, previousClose: 20.94, volume: 2065100, ma5: 20.98, ma20: 20.77, ma60: 20.43, rsi: 58, dividendYield: 6.1, discountPremium: -0.7 },
  '00980A': { price: 13.91, previousClose: 13.88, volume: 1642800, ma5: 13.86, ma20: 13.79, ma60: 13.74, rsi: 51, dividendYield: 4.3, discountPremium: -0.4 },
  '00996A': { price: 17.36, previousClose: 17.45, volume: 1319000, ma5: 17.42, ma20: 17.21, ma60: 17.05, rsi: 47, dividendYield: 4.8, discountPremium: -1.2 },
} as const;

export const mockSnapshots: AssetSnapshot[] = ETF_ASSETS.map((asset) => ({
  ...asset,
  updatedAt: now,
  metrics: seeded[asset.ticker as keyof typeof seeded],
}));
