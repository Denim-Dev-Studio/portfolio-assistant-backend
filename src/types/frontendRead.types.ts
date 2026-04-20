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

export type PortfolioSummaryDto = {
  id: string;
  name: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  latestAnalysis: LatestAnalysisSnapshot | null;
};

export type HoldingsFilter = {
  action?: AnalysisAction;
  minConfidence?: number;
  hasMissingData?: boolean;
};

export type HoldingRowDto = {
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
  portfolioItem: {
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
