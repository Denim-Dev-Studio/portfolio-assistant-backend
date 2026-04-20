export type FundamentalData = {
  peRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
};

export type TechnicalData = {
  rsi: number | null;
  sma50: number | null;
  sma200: number | null;
};

export type NewsItem = {
  title: string;
  description: string;
};

export type DataSignalStatus =
  | "available"
  | "unsupported_symbol"
  | "no_data"
  | "provider_error"
  | "auth_error"
  | "insufficient_history";

export type DataSignal = {
  provider: string;
  status: DataSignalStatus;
  message: string;
};

export type AnalysisSignals = {
  fundamental: DataSignal;
  priceHistory: DataSignal;
  technical: DataSignal;
  news: DataSignal;
};

export type AggregatedData = {
  symbol: string;
  fundamental: FundamentalData | null;
  technical: TechnicalData | null;
  sentiment: number;
  news: NewsItem[];
  signals: AnalysisSignals;
  priceHistoryPoints: number;
};

export type AnalysisAction = "BUY_MORE" | "HOLD" | "WATCH" | "SELL";

export type AnalysisResult = {
  symbol: string;
  action: AnalysisAction;
  score: number;
  confidence: number;
  reasoning: string[];
  signals: AnalysisSignals;
};

export type AnalysisRunStatus = "completed" | "partial" | "failed";

export type PersistedAnalysisItem = {
  portfolioItemId: string;
  symbol: string;
  displayName?: string;
  action: AnalysisAction;
  score: number;
  confidence: number;
  reasoning: string[];
  signals: AnalysisSignals;
};

export type PersistedAnalysisRun = {
  id: string;
  portfolioId: string;
  status: AnalysisRunStatus;
  generatedAt: string;
  summary: {
    totalHoldings: number;
    fullyAnalyzed: number;
    partiallyAnalyzed: number;
    failed: number;
  };
  items: PersistedAnalysisItem[];
};

export type LatestAnalysisSnapshot = {
  runId: string;
  status: AnalysisRunStatus;
  generatedAt: string;
  summary: PersistedAnalysisRun["summary"];
  items: PersistedAnalysisItem[];
};
