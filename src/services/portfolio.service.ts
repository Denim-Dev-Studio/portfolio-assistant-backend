import { PortfolioRepository } from "../repositories/portfolio.repository";
import { CreatePortfolioInput } from "../models/types";
import { parsePortfolioFile } from "../adapters/broker.parser";
import { resolveSymbolFromISIN } from "../providers/nseSymbol.provider";
import { AppError } from "../errors/appError";
import { AnalysisRepository } from "../repositories/analysis.repository";
import { Portfolio } from "../models/portfolio.model";
import { PortfolioItem } from "../models/portfolioItem.model";
import {
  HoldingDetailDto,
  HoldingsFilter,
  HoldingRowDto,
  HoldingValuationDto,
  PortfolioCardDto,
  PortfolioInsightHoldingDto,
  PortfolioInsightsDto,
  PortfolioSummaryDto,
  PortfolioTotalsDto,
} from "../types/frontendRead.types";
import { AnalysisAction, AnalysisSignals, LatestAnalysisSnapshot } from "../types/analysis.types";

type NormalizedPortfolio = {
  id: string;
  name: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    symbol: string;
    displayName: string;
    isin: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number | null;
  }>;
};

type EnrichedHoldingRow = HoldingRowDto;

const TOP_HOLDINGS_LIMIT = 3;

export class PortfolioService {
  private repo = new PortfolioRepository();
  private analysisRepo = new AnalysisRepository();

  private normalizePortfolio(portfolio: Portfolio): NormalizedPortfolio {
    return {
      id: portfolio.get("id") as string,
      name: portfolio.get("name") as string,
      fileName: (portfolio.get("fileName") as string | null | undefined) ?? null,
      createdAt: (portfolio.get("createdAt") as Date).toISOString(),
      updatedAt: (portfolio.get("updatedAt") as Date).toISOString(),
      items: ((portfolio.get("items") as PortfolioItem[] | undefined) ?? []).map((item) => ({
        id: item.get("id") as string,
        symbol: item.get("symbol") as string,
        displayName: item.get("displayName") as string,
        isin: item.get("isin") as string,
        quantity: item.get("quantity") as number,
        avgPrice: item.get("avgPrice") as number,
        currentPrice: (item.get("currentPrice") as number | null | undefined) ?? null,
      })),
    };
  }

  private hasMissingData(signals: AnalysisSignals) {
    return Object.values(signals).some((signal) => signal.status !== "available");
  }

  private createAnalysisIndex(snapshot: LatestAnalysisSnapshot) {
    const byPortfolioItemId = new Map<string, LatestAnalysisSnapshot["items"][number]>();
    const bySymbol = new Map<string, LatestAnalysisSnapshot["items"][number]>();

    for (const item of snapshot.items) {
      byPortfolioItemId.set(item.portfolioItemId, item);
      bySymbol.set(item.symbol.toUpperCase(), item);
    }

    return {
      byPortfolioItemId,
      bySymbol,
    };
  }

  private getHoldingValuation(
    item: NormalizedPortfolio["items"][number],
    totalCurrentValue: number,
  ): HoldingValuationDto {
    const investedValue = item.quantity * item.avgPrice;
    const currentValue = item.currentPrice === null ? null : item.quantity * item.currentPrice;
    const unrealizedPl = currentValue === null ? null : currentValue - investedValue;
    const unrealizedPlPct =
      unrealizedPl === null || investedValue === 0 ? null : (unrealizedPl / investedValue) * 100;
    const portfolioWeight =
      currentValue === null || totalCurrentValue === 0 ? null : (currentValue / totalCurrentValue) * 100;

    return {
      investedValue,
      currentValue,
      unrealizedPl,
      unrealizedPlPct,
      portfolioWeight,
    };
  }

  private buildHoldingRows(
    portfolio: NormalizedPortfolio,
    snapshot: LatestAnalysisSnapshot,
  ): EnrichedHoldingRow[] {
    const analysisIndex = this.createAnalysisIndex(snapshot);
    const totalCurrentValue = portfolio.items.reduce((sum, item) => {
      if (item.currentPrice === null) {
        return sum;
      }

      return sum + item.quantity * item.currentPrice;
    }, 0);

    return portfolio.items
      .map((item) => {
        const analysis =
          analysisIndex.byPortfolioItemId.get(item.id) ??
          analysisIndex.bySymbol.get(item.symbol.toUpperCase());

        if (!analysis) {
          return null;
        }

        return {
          symbol: analysis.symbol,
          displayName: item.displayName,
          quantity: item.quantity,
          avgPrice: item.avgPrice,
          currentPrice: item.currentPrice,
          action: analysis.action,
          score: analysis.score,
          confidence: analysis.confidence,
          signals: analysis.signals,
          hasMissingData: this.hasMissingData(analysis.signals),
          ...this.getHoldingValuation(item, totalCurrentValue),
        };
      })
      .filter((item): item is EnrichedHoldingRow => item !== null);
  }

  private buildPortfolioTotals(rows: EnrichedHoldingRow[]): PortfolioTotalsDto {
    const totalInvestedValue = rows.reduce((sum, row) => sum + row.investedValue, 0);
    const totalCurrentValue = rows.reduce((sum, row) => sum + (row.currentValue ?? 0), 0);
    const totalUnrealizedPl = rows.reduce((sum, row) => sum + (row.unrealizedPl ?? 0), 0);

    return rows.reduce<PortfolioTotalsDto>(
      (acc, row) => {
        acc.actionDistribution[row.action] += 1;

        if (row.confidence >= 70) {
          acc.confidenceDistribution.high += 1;
        } else if (row.confidence >= 40) {
          acc.confidenceDistribution.medium += 1;
        } else {
          acc.confidenceDistribution.low += 1;
        }

        if (row.hasMissingData) {
          acc.missingDataCount += 1;
        }

        return acc;
      },
      {
        totalInvestedValue,
        totalCurrentValue,
        totalUnrealizedPl,
        totalUnrealizedPlPct:
          totalInvestedValue === 0 ? null : (totalUnrealizedPl / totalInvestedValue) * 100,
        actionDistribution: {
          BUY_MORE: 0,
          HOLD: 0,
          WATCH: 0,
          SELL: 0,
        },
        confidenceDistribution: {
          high: 0,
          medium: 0,
          low: 0,
        },
        missingDataCount: 0,
      },
    );
  }

  private applyHoldingFilters(rows: HoldingRowDto[], filters: HoldingsFilter) {
    return rows.filter((row) => {
      if (filters.action && row.action !== filters.action) {
        return false;
      }

      if (filters.minConfidence !== undefined && row.confidence < filters.minConfidence) {
        return false;
      }

      if (
        filters.hasMissingData !== undefined &&
        row.hasMissingData !== filters.hasMissingData
      ) {
        return false;
      }

      return true;
    });
  }

  private compareTopConviction(a: EnrichedHoldingRow, b: EnrichedHoldingRow) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    if ((b.portfolioWeight ?? -1) !== (a.portfolioWeight ?? -1)) {
      return (b.portfolioWeight ?? -1) - (a.portfolioWeight ?? -1);
    }

    return a.symbol.localeCompare(b.symbol);
  }

  private compareWeakest(a: EnrichedHoldingRow, b: EnrichedHoldingRow) {
    if (a.score !== b.score) {
      return a.score - b.score;
    }

    if (a.confidence !== b.confidence) {
      return a.confidence - b.confidence;
    }

    if ((b.portfolioWeight ?? -1) !== (a.portfolioWeight ?? -1)) {
      return (b.portfolioWeight ?? -1) - (a.portfolioWeight ?? -1);
    }

    return a.symbol.localeCompare(b.symbol);
  }

  private toInsightHolding(row: EnrichedHoldingRow): PortfolioInsightHoldingDto {
    return {
      symbol: row.symbol,
      displayName: row.displayName,
      action: row.action,
      score: row.score,
      confidence: row.confidence,
      currentValue: row.currentValue,
      portfolioWeight: row.portfolioWeight,
      hasMissingData: row.hasMissingData,
    };
  }

  private buildConcentrationFlags(rows: EnrichedHoldingRow[]) {
    const sortedByWeight = [...rows]
      .filter((row) => row.portfolioWeight !== null)
      .sort((a, b) => (b.portfolioWeight ?? 0) - (a.portfolioWeight ?? 0));

    const flags: PortfolioInsightsDto["concentrationFlags"] = [];
    const largest = sortedByWeight[0];

    if (largest && (largest.portfolioWeight ?? 0) >= 25) {
      flags.push({
        type: "single_holding",
        symbol: largest.symbol,
        weight: largest.portfolioWeight ?? 0,
        message: `${largest.symbol} accounts for at least 25% of current portfolio value.`,
      });
    }

    const topThreeWeight = sortedByWeight
      .slice(0, 3)
      .reduce((sum, row) => sum + (row.portfolioWeight ?? 0), 0);

    if (topThreeWeight >= 60) {
      flags.push({
        type: "top_3_holdings",
        weight: topThreeWeight,
        message: "Top 3 holdings account for at least 60% of current portfolio value.",
      });
    }

    return flags;
  }

  private buildDataQualityFlags(rows: EnrichedHoldingRow[]) {
    const missingAnalysisDataCount = rows.filter((row) => row.hasMissingData).length;
    const missingMarketPriceCount = rows.filter((row) => row.currentPrice === null).length;
    const flags: PortfolioInsightsDto["dataQualityFlags"] = [];

    if (missingAnalysisDataCount > 0) {
      flags.push({
        type: "missing_analysis_data",
        count: missingAnalysisDataCount,
        message: `${missingAnalysisDataCount} holdings have incomplete analysis signals.`,
      });
    }

    if (missingMarketPriceCount > 0) {
      flags.push({
        type: "missing_market_price",
        count: missingMarketPriceCount,
        message: `${missingMarketPriceCount} holdings are missing current market price data.`,
      });
    }

    return flags;
  }

  private async getPortfolioWithLatestAnalysis(id: string) {
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    const latestAnalysis = await this.analysisRepo.findLatestSnapshotByPortfolioId(id);

    return {
      normalized: this.normalizePortfolio(portfolio),
      latestAnalysis,
    };
  }

  async createPortfolio(data: CreatePortfolioInput) {
    if (!data?.name?.trim()) {
      throw AppError.validation("Portfolio name is required.");
    }

    if (!data.items?.length) {
      throw AppError.validation("Portfolio must contain at least one item.");
    }

    return this.repo.create(data);
  }

  async getPortfolio(id: string) {
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    return portfolio;
  }

  async listPortfolioCards(): Promise<PortfolioCardDto[]> {
    const portfolios = await this.repo.findAll();
    const normalized = portfolios.map((portfolio) => this.normalizePortfolio(portfolio));
    const latestSnapshots = await this.analysisRepo.findLatestSnapshotsByPortfolioIds(
      normalized.map((portfolio) => portfolio.id),
    );

    return normalized.map((portfolio) => {
      const latest = latestSnapshots.get(portfolio.id);

      return {
        id: portfolio.id,
        name: portfolio.name,
        fileName: portfolio.fileName,
        createdAt: portfolio.createdAt,
        lastAnalyzedAt: latest?.generatedAt ?? null,
        holdingCount: portfolio.items.length,
        latestSummary: latest?.summary ?? null,
      };
    });
  }

  async getPortfolioSummary(id: string): Promise<PortfolioSummaryDto> {
    const { normalized, latestAnalysis } = await this.getPortfolioWithLatestAnalysis(id);
    const rows = latestAnalysis ? this.buildHoldingRows(normalized, latestAnalysis) : [];

    return {
      id: normalized.id,
      name: normalized.name,
      fileName: normalized.fileName,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      latestAnalysis,
      totals: latestAnalysis ? this.buildPortfolioTotals(rows) : null,
    };
  }

  async getPortfolioHoldings(id: string, filters: HoldingsFilter = {}): Promise<HoldingRowDto[]> {
    const { normalized, latestAnalysis } = await this.getPortfolioWithLatestAnalysis(id);

    if (!latestAnalysis) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    const rows = this.buildHoldingRows(normalized, latestAnalysis);
    return this.applyHoldingFilters(rows, filters);
  }

  async getHoldingDetail(id: string, symbol: string): Promise<HoldingDetailDto> {
    if (!symbol?.trim()) {
      throw AppError.badRequest("Holding symbol is required.");
    }

    const { normalized, latestAnalysis } = await this.getPortfolioWithLatestAnalysis(id);

    if (!latestAnalysis) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    const rows = this.buildHoldingRows(normalized, latestAnalysis);
    const holding = rows.find((entry) => entry.symbol.toUpperCase() === symbol.trim().toUpperCase());
    const item = normalized.items.find(
      (entry) => entry.symbol.toUpperCase() === symbol.trim().toUpperCase(),
    );

    if (!item || !holding) {
      throw AppError.notFound("Holding not found in portfolio.");
    }

    const analysisIndex = this.createAnalysisIndex(latestAnalysis);
    const analysis =
      analysisIndex.byPortfolioItemId.get(item.id) ??
      analysisIndex.bySymbol.get(item.symbol.toUpperCase());

    if (!analysis) {
      throw AppError.notFound("No persisted analysis found for this holding.");
    }

    return {
      portfolioId: normalized.id,
      symbol: item.symbol,
      portfolioItem: {
        id: item.id,
        displayName: item.displayName,
        isin: item.isin,
        quantity: item.quantity,
        avgPrice: item.avgPrice,
        currentPrice: item.currentPrice,
        investedValue: holding.investedValue,
        currentValue: holding.currentValue,
        unrealizedPl: holding.unrealizedPl,
        unrealizedPlPct: holding.unrealizedPlPct,
        portfolioWeight: holding.portfolioWeight,
      },
      latestAnalysis: {
        runId: latestAnalysis.runId,
        generatedAt: latestAnalysis.generatedAt,
        status: latestAnalysis.status,
        action: analysis.action,
        score: analysis.score,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        signals: analysis.signals,
        hasMissingData: this.hasMissingData(analysis.signals),
      },
    };
  }

  async getPortfolioInsights(id: string): Promise<PortfolioInsightsDto> {
    const { normalized, latestAnalysis } = await this.getPortfolioWithLatestAnalysis(id);

    if (!latestAnalysis) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    const rows = this.buildHoldingRows(normalized, latestAnalysis);

    return {
      portfolioId: normalized.id,
      generatedAt: latestAnalysis.generatedAt,
      overview: this.buildPortfolioTotals(rows),
      concentrationFlags: this.buildConcentrationFlags(rows),
      highestConvictionHoldings: [...rows]
        .sort((a, b) => this.compareTopConviction(a, b))
        .slice(0, TOP_HOLDINGS_LIMIT)
        .map((row) => this.toInsightHolding(row)),
      lowestScoringHoldings: [...rows]
        .sort((a, b) => this.compareWeakest(a, b))
        .slice(0, TOP_HOLDINGS_LIMIT)
        .map((row) => this.toInsightHolding(row)),
      dataQualityFlags: this.buildDataQualityFlags(rows),
    };
  }

  parseHoldingsFilters(query: Record<string, unknown>): HoldingsFilter {
    const filters: HoldingsFilter = {};
    const action = typeof query.action === "string" ? query.action.trim().toUpperCase() : undefined;
    const allowedActions: AnalysisAction[] = ["BUY_MORE", "HOLD", "WATCH", "SELL"];

    if (action) {
      if (!allowedActions.includes(action as AnalysisAction)) {
        throw AppError.badRequest("action must be one of BUY_MORE, HOLD, WATCH, or SELL.");
      }

      filters.action = action as AnalysisAction;
    }

    if (query.minConfidence !== undefined) {
      const value = Number(query.minConfidence);

      if (Number.isNaN(value)) {
        throw AppError.badRequest("minConfidence must be a number.");
      }

      filters.minConfidence = value;
    }

    if (query.hasMissingData !== undefined) {
      if (query.hasMissingData === "true" || query.hasMissingData === true) {
        filters.hasMissingData = true;
      } else if (query.hasMissingData === "false" || query.hasMissingData === false) {
        filters.hasMissingData = false;
      } else {
        throw AppError.badRequest("hasMissingData must be true or false.");
      }
    }

    return filters;
  }

  async createPortfolioFromFile(file?: any, name?: string) {
    if (!file) {
      throw AppError.validation("File is required.");
    }

    if (!name || !name.trim()) {
      throw AppError.validation("Portfolio name is required.");
    }

    console.log("File info:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const parsedItems = parsePortfolioFile(file);

    if (!parsedItems.length) {
      throw AppError.validation("No valid data found in file.");
    }

    const enrichedItems = parsedItems.map((item) => {
      const symbol = resolveSymbolFromISIN(item.isin);

      if (!symbol) {
        console.warn(`Skipping item: Symbol not found for ISIN ${item.isin}`);
        return null;
      }

      return {
        symbol,
        displayName: item.displayName,
        isin: item.isin,
        quantity: item.quantity,
        avgPrice: item.avgPrice,
        currentPrice: item.currentPrice,
      };
    });

    const validItems = enrichedItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    if (!validItems.length) {
      throw AppError.validation("No valid instruments found after symbol resolution.");
    }

    console.log(
      `Parsed: ${parsedItems.length}, Valid after symbol resolution: ${validItems.length}`,
    );

    return this.repo.create({
      name: name.trim(),
      fileName: file.originalname || "Uploaded Portfolio",
      items: validItems,
    });
  }
}
