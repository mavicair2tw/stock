import { AssetDefinition } from '@/lib/types';

export const ETF_ASSETS: AssetDefinition[] = [
  { ticker: '00981A', name: '00981A Growth Allocation ETF', category: 'growth' },
  { ticker: '00400A', name: '00400A High Dividend Income ETF', category: 'high_dividend' },
  { ticker: '00401A', name: '00401A Dividend Quality ETF', category: 'high_dividend' },
  { ticker: '00980A', name: '00980A Balanced Strategy ETF', category: 'balanced' },
  { ticker: '00996A', name: '00996A Stability Allocation ETF', category: 'balanced' },
];

export const assetCategoryLabel: Record<AssetDefinition['category'], string> = {
  growth: 'Growth',
  high_dividend: 'High Dividend',
  balanced: 'Balanced',
};
