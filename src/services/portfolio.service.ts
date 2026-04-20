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
  PortfolioCardDto,
  PortfolioSummaryDto,
} from "../types/frontendRead.types";
import { AnalysisAction, AnalysisSignals, LatestAnalysisSnapshot } from "../types/analysis.types";

export class PortfolioService {
  private repo = new PortfolioRepository();
  private analysisRepo = new AnalysisRepository();

  private normalizePortfolio(portfolio: Portfolio) {
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

  private toHoldingRow(
    snapshot: LatestAnalysisSnapshot,
    item: ReturnType<PortfolioService["normalizePortfolio"]>["items"][number],
  ): HoldingRowDto | null {
    const analysis = snapshot.items.find((entry) => entry.portfolioItemId === item.id);

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
    };
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
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    const normalized = this.normalizePortfolio(portfolio);
    const latestAnalysis = await this.analysisRepo.findLatestSnapshotByPortfolioId(id);

    return {
      id: normalized.id,
      name: normalized.name,
      fileName: normalized.fileName,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      latestAnalysis,
    };
  }

  async getPortfolioHoldings(id: string, filters: HoldingsFilter = {}): Promise<HoldingRowDto[]> {
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    const latestAnalysis = await this.analysisRepo.findLatestSnapshotByPortfolioId(id);

    if (!latestAnalysis) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    const rows = this.normalizePortfolio(portfolio).items
      .map((item) => this.toHoldingRow(latestAnalysis, item))
      .filter((item): item is HoldingRowDto => item !== null);

    return this.applyHoldingFilters(rows, filters);
  }

  async getHoldingDetail(id: string, symbol: string): Promise<HoldingDetailDto> {
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    if (!symbol?.trim()) {
      throw AppError.badRequest("Holding symbol is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    const latestAnalysis = await this.analysisRepo.findLatestSnapshotByPortfolioId(id);

    if (!latestAnalysis) {
      throw AppError.notFound("No persisted analysis found for this portfolio.");
    }

    const normalized = this.normalizePortfolio(portfolio);
    const item = normalized.items.find(
      (entry) => entry.symbol.toUpperCase() === symbol.trim().toUpperCase(),
    );

    if (!item) {
      throw AppError.notFound("Holding not found in portfolio.");
    }

    const analysis = latestAnalysis.items.find(
      (entry) => entry.portfolioItemId === item.id || entry.symbol.toUpperCase() === item.symbol.toUpperCase(),
    );

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
        symbol, // ✅ resolved from NSE CSV
        displayName: item.displayName, // ✅ from XLSX
        isin: item.isin, // ✅ from XLSX
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
