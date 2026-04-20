import { PortfolioRepository } from "../repositories/portfolio.repository";
import { PortfolioItem } from "../models/portfolioItem.model";
import { AnalysisResult } from "../types/analysis.types";
import { getFullData } from "./dataAggregator.service";
import { analyzeHolding, summarizeSignalAvailability } from "./analysisEngine.service";
import { AppError } from "../errors/appError";

const ANALYSIS_CONCURRENCY = 4;

export class PortfolioAnalysisService {
  private repo = new PortfolioRepository();

  async analyzePortfolio(portfolioId: string) {
    if (!portfolioId?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(portfolioId);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    const items = (portfolio.get("items") as PortfolioItem[] | undefined) ?? [];

    const analyzeItem = async (item: PortfolioItem): Promise<AnalysisResult> => {
      try {
        const data = await getFullData(item.symbol);

        return analyzeHolding(
          {
            symbol: item.symbol,
            currentPrice: item.currentPrice ?? null,
          },
          data,
        );
      } catch (error) {
        console.error(`Analysis failed for ${item.symbol}`, error);

        return {
          symbol: item.symbol,
          action: "WATCH",
          score: 50,
          confidence: 10,
          reasoning: ["Market data could not be fetched for this holding at analysis time."],
          signals: {
            fundamental: {
              provider: "yahoo-finance2",
              status: "provider_error",
              message: "Portfolio analysis aborted before fundamental data could be collected.",
            },
            priceHistory: {
              provider: "stock-nse-india",
              status: "provider_error",
              message: "Portfolio analysis aborted before price history could be collected.",
            },
            technical: {
              provider: "derived",
              status: "provider_error",
              message: "Technical indicators were not computed because the analysis request failed.",
            },
            news: {
              provider: "marketaux",
              status: "provider_error",
              message: "News sentiment was not loaded because the analysis request failed.",
            },
          },
        };
      }
    };

    const analyses: AnalysisResult[] = [];

    for (let index = 0; index < items.length; index += ANALYSIS_CONCURRENCY) {
      const batch = items.slice(index, index + ANALYSIS_CONCURRENCY);
      const batchResults = await Promise.all(batch.map(analyzeItem));
      analyses.push(...batchResults);
    }

    const summary = analyses.reduce(
      (acc, item) => {
        const availability = summarizeSignalAvailability(item.signals);
        const hasFundamentalAndTechnical =
          item.signals.fundamental.status === "available" &&
          item.signals.technical.status === "available";

        if (hasFundamentalAndTechnical) {
          acc.fullyAnalyzed += 1;
        } else if (availability.available + availability.partial > 0) {
          acc.partiallyAnalyzed += 1;
        } else {
          acc.failed += 1;
        }

        return acc;
      },
      {
        totalHoldings: analyses.length,
        fullyAnalyzed: 0,
        partiallyAnalyzed: 0,
        failed: 0,
      },
    );

    return {
      portfolioId: portfolio.get("id"),
      portfolioName: portfolio.get("name"),
      generatedAt: new Date().toISOString(),
      summary,
      items: analyses,
    };
  }
}
