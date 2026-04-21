import { PortfolioRepository } from "../repositories/portfolio.repository";
import { AnalysisRepository } from "../repositories/analysis.repository";
import { PortfolioItem } from "../models/portfolioItem.model";
import { AnalysisResult, AnalysisRunStatus } from "../types/analysis.types";
import { getFullData } from "./dataAggregator.service";
import { analyzeHolding, summarizeSignalAvailability } from "./analysisEngine.service";
import { AppError } from "../errors/appError";

const ANALYSIS_CONCURRENCY = 4;

export class PortfolioAnalysisService {
  private repo = new PortfolioRepository();
  private analysisRepo = new AnalysisRepository();

  private requireUserId(userId?: string) {
    if (!userId?.trim()) {
      throw AppError.unauthorized("Authentication is required.");
    }

    return userId;
  }

  private async getOwnedPortfolio(portfolioId: string, userId?: string) {
    const authenticatedUserId = this.requireUserId(userId);

    const portfolio = await this.repo.findById(portfolioId);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    if ((portfolio.get("userId") as string | null) !== authenticatedUserId) {
      throw AppError.forbidden("You do not have access to this portfolio.");
    }

    return portfolio;
  }

  private deriveRunStatus(items: AnalysisResult[]): AnalysisRunStatus {
    if (!items.length) {
      return "failed";
    }

    const summaries = items.map((item) => summarizeSignalAvailability(item.signals));
    const allFailed = summaries.every(
      (summary) => summary.available === 0 && summary.partial === 0,
    );

    if (allFailed) {
      return "failed";
    }

    const hasAnyDegraded = summaries.some(
      (summary) => summary.failed > 0 || summary.partial > 0,
    );

    return hasAnyDegraded ? "partial" : "completed";
  }

  async analyzePortfolio(portfolioId: string, userId?: string) {
    if (!portfolioId?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.getOwnedPortfolio(portfolioId, userId);

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

    const generatedAt = new Date().toISOString();
    const response = {
      portfolioId: portfolio.get("id"),
      portfolioName: portfolio.get("name"),
      generatedAt,
      summary,
      items: analyses,
    };

    await this.analysisRepo.createRun({
      portfolioId: portfolio.get("id") as string,
      status: this.deriveRunStatus(analyses),
      generatedAt,
      summary,
      items: items.map((item, index) => ({
        portfolioItemId: item.get("id") as string,
        result: analyses[index],
      })),
    });

    return response;
  }

  async getLatestAnalysis(portfolioId: string, userId?: string) {
    const portfolio = await this.getOwnedPortfolio(portfolioId, userId);

    const latest = await this.analysisRepo.findLatestByPortfolioId(portfolioId);

    if (!latest) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    return {
      portfolioId: portfolio.get("id"),
      portfolioName: portfolio.get("name"),
      analysisRunId: latest.id,
      status: latest.status,
      generatedAt: latest.generatedAt,
      summary: latest.summary,
      items: latest.items,
    };
  }
}
