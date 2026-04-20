import { AnalysisAction, AnalysisSignals, LatestAnalysisSnapshot } from "./analysis.types";

export type PortfolioCardDto = {
  id: string;
  name: string;
  fileName: string | null;
  createdAt: string;
  lastAnalyzedAt: string | null;
  holdingCount: number;
  latestSummary: LatestAnalysisSnapshot["summary"] | null;
};

export type PortfolioTotalsDto = {
  totalInvestedValue: number;
  totalCurrentValue: number;
  totalUnrealizedPl: number;
  totalUnrealizedPlPct: number | null;
  actionDistribution: Record<AnalysisAction, number>;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  missingDataCount: number;
};

export type HoldingValuationDto = {
  investedValue: number;
  currentValue: number | null;
  unrealizedPl: number | null;
  unrealizedPlPct: number | null;
  portfolioWeight: number | null;
};

export type PortfolioSummaryDto = {
  id: string;
  name: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  latestAnalysis: LatestAnalysisSnapshot | null;
  totals: PortfolioTotalsDto | null;
};

export type HoldingsFilter = {
  action?: AnalysisAction;
  minConfidence?: number;
  hasMissingData?: boolean;
};

export type HoldingRowDto = HoldingValuationDto & {
  symbol: string;
  displayName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  action: AnalysisAction;
  score: number;
  confidence: number;
  signals: AnalysisSignals;
  hasMissingData: boolean;
};

export type HoldingDetailDto = {
  portfolioId: string;
  symbol: string;
  portfolioItem: HoldingValuationDto & {
    id: string;
    displayName: string;
    isin: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number | null;
  };
  latestAnalysis: {
    runId: string;
    generatedAt: string;
    status: LatestAnalysisSnapshot["status"];
    action: AnalysisAction;
    score: number;
    confidence: number;
    reasoning: string[];
    signals: AnalysisSignals;
    hasMissingData: boolean;
  };
};

export type PortfolioInsightHoldingDto = {
  symbol: string;
  displayName: string;
  action: AnalysisAction;
  score: number;
  confidence: number;
  currentValue: number | null;
  portfolioWeight: number | null;
  hasMissingData: boolean;
};

export type PortfolioInsightsDto = {
  portfolioId: string;
  generatedAt: string;
  overview: PortfolioTotalsDto;
  concentrationFlags: Array<{
    type: "single_holding" | "top_3_holdings";
    message: string;
    weight: number;
    symbol?: string;
  }>;
  highestConvictionHoldings: PortfolioInsightHoldingDto[];
  lowestScoringHoldings: PortfolioInsightHoldingDto[];
  dataQualityFlags: Array<{
    type: "missing_analysis_data" | "missing_market_price";
    message: string;
    count: number;
  }>;
};
