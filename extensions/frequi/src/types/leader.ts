export interface LeaderTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  qty: string;
  price: string;
  time: number;
  detectedAt: number;
  realizedPnl: string;
  effect: 'open' | 'add' | 'reduce' | 'close' | 'unknown';
  after: string | null;
  revision: number;
}

export interface LeaderFeed {
  muMarket?: {
    symbol: string;
    pair: string;
    timeframe: string;
    source: string;
    updatedAt: number | null;
    error: string | null;
    candles: number[][];
  };
  version: number;
  generatedAt: number;
  lastReadAt: number | null;
  bridgeError: string | null;
  trader: { id: string; name: string };
  health: {
    initialized: boolean;
    paused: boolean;
    lastSuccess: number | null;
    failures: number;
    error: string | null;
  };
  trades: LeaderTrade[];
  total: number;
  positionWarning: string | null;
  positionScope: string | null;
  positionReliable: boolean;
  positions: { symbol: string; positionSide: string; qty: string; avg: string }[];
}
