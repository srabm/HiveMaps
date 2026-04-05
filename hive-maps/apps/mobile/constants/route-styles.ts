export const ROUTE_STYLE_TOKENS = {
  driving: {
    color: '#e5a712',
    width: 8,
  },
  walking: {
    color: '#6B7280',
    width: 6,
    dasharray: [2, 2] as number[],
  },
  transitBusFallback: {
    color: '#2563EB',
    width: 7,
  },
  transitRailFallback: {
    color: '#1D4ED8',
    width: 7,
  },
  indoor: {
    color: '#9ca3af',
    width: 4,
    dasharray: [1.5, 1.5] as number[],
  },
  shuttle: {
    color: '#9d1e30',
    width: 7,
  },
} as const;

