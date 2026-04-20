import { AnalysisRun } from "../models/analysisRun.model";
import { HoldingAnalysis } from "../models/holdingAnalysis.model";
import { PortfolioItem } from "../models/portfolioItem.model";
import { AppError } from "../errors/appError";
import {
  LatestAnalysisSnapshot,
  AnalysisResult,
  PersistedAnalysisItem,
  PersistedAnalysisRun,
} from "../types/analysis.types";

type CreateAnalysisRunInput = {
  portfolioId: string;
  status: "completed" | "partial" | "failed";
  generatedAt: string;
  summary: Record<string, unknown>;
  items: Array<{
    portfolioItemId: string;
    result: AnalysisResult;
  }>;
};

export class AnalysisRepository {
  private mapRunToSnapshot(run: AnalysisRun): LatestAnalysisSnapshot {
    const items = ((run.get("items") as HoldingAnalysis[] | undefined) ?? []).map((item) => {
      const portfolioItem = item.get("portfolioItem") as PortfolioItem | undefined;

      return {
        portfolioItemId: item.get("portfolioItemId") as string,
        symbol: item.get("symbol") as string,
        displayName: portfolioItem?.get("displayName") as string | undefined,
        action: item.get("action") as PersistedAnalysisItem["action"],
        score: item.get("score") as number,
        confidence: item.get("confidence") as number,
        reasoning: item.get("reasoningJson") as string[],
        signals: item.get("signalsJson") as PersistedAnalysisItem["signals"],
      };
    });

    return {
      runId: run.get("id") as string,
      status: run.get("status") as LatestAnalysisSnapshot["status"],
      generatedAt: (run.get("generatedAt") as Date).toISOString(),
      summary: run.get("summaryJson") as LatestAnalysisSnapshot["summary"],
      items,
    };
  }

  async createRun(input: CreateAnalysisRunInput) {
    try {
      const run = await AnalysisRun.create(
        {
          portfolioId: input.portfolioId,
          status: input.status,
          generatedAt: new Date(input.generatedAt),
          summaryJson: input.summary,
          items: input.items.map((item) => ({
            portfolioItemId: item.portfolioItemId,
            symbol: item.result.symbol,
            action: item.result.action,
            score: item.result.score,
            confidence: item.result.confidence,
            reasoningJson: item.result.reasoning,
            signalsJson: item.result.signals,
          })),
        },
        {
          include: [{ model: HoldingAnalysis, as: "items" }],
        },
      );

      return run;
    } catch (error) {
      throw AppError.database("Failed to persist analysis run.", undefined, error);
    }
  }

  async findLatestByPortfolioId(portfolioId: string): Promise<PersistedAnalysisRun | null> {
    try {
      const run = await AnalysisRun.findOne({
        where: { portfolioId },
        include: [
          {
            model: HoldingAnalysis,
            as: "items",
            include: [{ model: PortfolioItem, as: "portfolioItem" }],
          },
        ],
        order: [["generatedAt", "DESC"]],
      });

      if (!run) {
        return null;
      }

      const snapshot = this.mapRunToSnapshot(run);

      return {
        id: snapshot.runId,
        portfolioId: run.get("portfolioId") as string,
        status: snapshot.status,
        generatedAt: snapshot.generatedAt,
        summary: snapshot.summary,
        items: snapshot.items,
      };
    } catch (error) {
      throw AppError.database("Failed to fetch latest analysis run.", undefined, error);
    }
  }

  async findLatestSnapshotByPortfolioId(portfolioId: string): Promise<LatestAnalysisSnapshot | null> {
    const run = await this.findLatestByPortfolioId(portfolioId);

    if (!run) {
      return null;
    }

    return {
      runId: run.id,
      status: run.status,
      generatedAt: run.generatedAt,
      summary: run.summary,
      items: run.items,
    };
  }

  async findLatestSnapshotsByPortfolioIds(
    portfolioIds: string[],
  ): Promise<Map<string, LatestAnalysisSnapshot>> {
    const snapshots = new Map<string, LatestAnalysisSnapshot>();

    for (const portfolioId of portfolioIds) {
      const snapshot = await this.findLatestSnapshotByPortfolioId(portfolioId);

      if (snapshot) {
        snapshots.set(portfolioId, snapshot);
      }
    }

    return snapshots;
  }
}
