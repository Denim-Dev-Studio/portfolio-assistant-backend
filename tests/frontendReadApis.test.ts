import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPortfolioInsights,
  getPortfolioSummary,
  listPortfolios,
} from "../src/controllers/portfolio.controller";
import { PortfolioService } from "../src/services/portfolio.service";
import { AppError } from "../src/errors/appError";

const originalListPortfolioCards = PortfolioService.prototype.listPortfolioCards;
const originalGetPortfolioSummary = PortfolioService.prototype.getPortfolioSummary;
const originalGetPortfolioInsights = PortfolioService.prototype.getPortfolioInsights;

afterEach(() => {
  PortfolioService.prototype.listPortfolioCards = originalListPortfolioCards;
  PortfolioService.prototype.getPortfolioSummary = originalGetPortfolioSummary;
  PortfolioService.prototype.getPortfolioInsights = originalGetPortfolioInsights;
});

const baseSignals = {
  fundamental: {
    provider: "yahoo-finance2",
    status: "available" as const,
    message: "ok",
  },
  priceHistory: {
    provider: "stock-nse-india",
    status: "available" as const,
    message: "ok",
  },
  technical: {
    provider: "derived",
    status: "available" as const,
    message: "ok",
  },
  news: {
    provider: "marketaux",
    status: "available" as const,
    message: "ok",
  },
};

const createPortfolioRecord = () => {
  const itemOne = {
    get(key: string) {
      const values: Record<string, unknown> = {
        id: "item-1",
        symbol: "RELIANCE.NS",
        displayName: "Reliance Industries",
        isin: "INE002A01018",
        quantity: 10,
        avgPrice: 2400,
        currentPrice: 2500,
      };

      return values[key];
    },
  };

  const itemTwo = {
    get(key: string) {
      const values: Record<string, unknown> = {
        id: "item-2",
        symbol: "INFY.NS",
        displayName: "Infosys",
        isin: "INE009A01021",
        quantity: 6,
        avgPrice: 1400,
        currentPrice: 1520,
      };

      return values[key];
    },
  };

  return {
    get(key: string) {
      const values: Record<string, unknown> = {
        id: "portfolio-1",
        userId: "user-1",
        name: "Core Portfolio",
        fileName: "core.xlsx",
        createdAt: new Date("2026-04-19T08:00:00.000Z"),
        updatedAt: new Date("2026-04-20T10:00:00.000Z"),
        items: [itemOne, itemTwo],
      };

      return values[key];
    },
  };
};

const invokeHandler = async (
  handler: (req: any, res: any, next: (error?: unknown) => void) => void,
  req: Record<string, unknown>,
) => {
  let nextError: unknown;
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  handler(req, response, (error?: unknown) => {
    nextError = error;
  });

  await Promise.resolve();
  await Promise.resolve();

  if (nextError) {
    throw nextError;
  }

  return response;
};

test("listPortfolios returns stable card shape", async () => {
  PortfolioService.prototype.listPortfolioCards = async function () {
    return [
      {
        id: "portfolio-1",
        name: "Core Portfolio",
        fileName: "core.xlsx",
        createdAt: "2026-04-19T08:00:00.000Z",
        lastAnalyzedAt: "2026-04-20T09:00:00.000Z",
        holdingCount: 2,
        latestSummary: {
          totalHoldings: 2,
          fullyAnalyzed: 1,
          partiallyAnalyzed: 1,
          failed: 0,
        },
      },
    ];
  };

  const response = await invokeHandler(listPortfolios, {
    user: { id: "user-1", email: "owner@example.com" },
  });
  const body = response.body as { success: boolean; data: unknown[] };

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data[0], {
    id: "portfolio-1",
    name: "Core Portfolio",
    fileName: "core.xlsx",
    createdAt: "2026-04-19T08:00:00.000Z",
    lastAnalyzedAt: "2026-04-20T09:00:00.000Z",
    holdingCount: 2,
    latestSummary: {
      totalHoldings: 2,
      fullyAnalyzed: 1,
      partiallyAnalyzed: 1,
      failed: 0,
    },
  });
});

test("getPortfolioSummary returns latest persisted run", async () => {
  PortfolioService.prototype.getPortfolioSummary = async function () {
    return {
      id: "portfolio-1",
      name: "Core Portfolio",
      fileName: "core.xlsx",
      createdAt: "2026-04-19T08:00:00.000Z",
      updatedAt: "2026-04-20T10:00:00.000Z",
      latestAnalysis: {
        runId: "run-2",
        status: "completed",
        generatedAt: "2026-04-20T09:30:00.000Z",
        summary: {
          totalHoldings: 2,
          fullyAnalyzed: 2,
          partiallyAnalyzed: 0,
          failed: 0,
        },
        items: [],
      },
      totals: {
        totalInvestedValue: 32400,
        totalCurrentValue: 34120,
        totalUnrealizedPl: 1720,
        totalUnrealizedPlPct: 5.308641975308642,
        actionDistribution: {
          BUY_MORE: 0,
          HOLD: 2,
          WATCH: 0,
          SELL: 0,
        },
        confidenceDistribution: {
          high: 2,
          medium: 0,
          low: 0,
        },
        missingDataCount: 0,
      },
    };
  };

  const response = await invokeHandler(getPortfolioSummary, {
    params: { id: "portfolio-1" },
    user: { id: "user-1", email: "owner@example.com" },
  });
  const body = response.body as {
    success: boolean;
    data: { latestAnalysis: { runId: string; generatedAt: string } };
  };

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.latestAnalysis.runId, "run-2");
  assert.equal(body.data.latestAnalysis.generatedAt, "2026-04-20T09:30:00.000Z");
});

test("PortfolioService holdings endpoint filtering works", async () => {
  const service = new PortfolioService();
  const portfolioRecord = createPortfolioRecord();

  (service as unknown as {
    repo: { findById: (id: string) => Promise<unknown> };
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).repo = {
    findById: async () => portfolioRecord,
  };

  (service as unknown as {
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).analysisRepo = {
    findLatestSnapshotByPortfolioId: async () => ({
      runId: "run-1",
      status: "partial",
      generatedAt: "2026-04-20T09:00:00.000Z",
      summary: {
        totalHoldings: 2,
        fullyAnalyzed: 1,
        partiallyAnalyzed: 1,
        failed: 0,
      },
      items: [
        {
          portfolioItemId: "item-1",
          symbol: "RELIANCE.NS",
          displayName: "Reliance Industries",
          action: "HOLD" as const,
          score: 64,
          confidence: 71,
          reasoning: ["steady"],
          signals: baseSignals,
        },
        {
          portfolioItemId: "item-2",
          symbol: "INFY.NS",
          displayName: "Infosys",
          action: "WATCH" as const,
          score: 52,
          confidence: 42,
          reasoning: ["missing"],
          signals: {
            ...baseSignals,
            news: {
              provider: "marketaux",
              status: "no_data" as const,
              message: "none",
            },
          },
        },
      ],
    }),
  };

  const rows = await service.getPortfolioHoldings("portfolio-1", "user-1", {
    action: "WATCH",
    minConfidence: 40,
    hasMissingData: true,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.symbol, "INFY.NS");
  assert.equal(rows[0]?.hasMissingData, true);
  assert.equal(rows[0]?.investedValue, 8400);
  assert.equal(rows[0]?.currentValue, 9120);
  assert.equal(rows[0]?.unrealizedPl, 720);
  assert.equal(rows[0]?.unrealizedPlPct, 8.571428571428571);
  assert.equal(rows[0]?.portfolioWeight, 26.729191090269637);
});

test("PortfolioService summary includes portfolio-level totals", async () => {
  const service = new PortfolioService();
  const portfolioRecord = createPortfolioRecord();

  (service as unknown as {
    repo: { findById: (id: string) => Promise<unknown> };
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).repo = {
    findById: async () => portfolioRecord,
  };

  (service as unknown as {
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).analysisRepo = {
    findLatestSnapshotByPortfolioId: async () => ({
      runId: "run-1",
      status: "partial",
      generatedAt: "2026-04-20T09:00:00.000Z",
      summary: {
        totalHoldings: 2,
        fullyAnalyzed: 1,
        partiallyAnalyzed: 1,
        failed: 0,
      },
      items: [
        {
          portfolioItemId: "item-1",
          symbol: "RELIANCE.NS",
          displayName: "Reliance Industries",
          action: "HOLD" as const,
          score: 64,
          confidence: 71,
          reasoning: ["steady"],
          signals: baseSignals,
        },
        {
          portfolioItemId: "item-2",
          symbol: "INFY.NS",
          displayName: "Infosys",
          action: "WATCH" as const,
          score: 52,
          confidence: 42,
          reasoning: ["missing"],
          signals: {
            ...baseSignals,
            news: {
              provider: "marketaux",
              status: "no_data" as const,
              message: "none",
            },
          },
        },
      ],
    }),
  };

  const summary = await service.getPortfolioSummary("portfolio-1", "user-1");

  assert.deepEqual(summary.totals, {
    totalInvestedValue: 32400,
    totalCurrentValue: 34120,
    totalUnrealizedPl: 1720,
    totalUnrealizedPlPct: 5.3086419753086425,
    actionDistribution: {
      BUY_MORE: 0,
      HOLD: 1,
      WATCH: 1,
      SELL: 0,
    },
    confidenceDistribution: {
      high: 1,
      medium: 1,
      low: 0,
    },
    missingDataCount: 1,
  });
});

test("PortfolioService insights ranks top and weak holdings deterministically", async () => {
  const service = new PortfolioService();
  const portfolioRecord = {
    get(key: string) {
      const itemOne = {
        get(itemKey: string) {
          const values: Record<string, unknown> = {
            id: "item-1",
            symbol: "ALPHA.NS",
            displayName: "Alpha",
            isin: "ISIN-1",
            quantity: 10,
            avgPrice: 100,
            currentPrice: 180,
          };

          return values[itemKey];
        },
      };
      const itemTwo = {
        get(itemKey: string) {
          const values: Record<string, unknown> = {
            id: "item-2",
            symbol: "BETA.NS",
            displayName: "Beta",
            isin: "ISIN-2",
            quantity: 5,
            avgPrice: 200,
            currentPrice: 220,
          };

          return values[itemKey];
        },
      };
      const itemThree = {
        get(itemKey: string) {
          const values: Record<string, unknown> = {
            id: "item-3",
            symbol: "DELTA.NS",
            displayName: "Delta",
            isin: "ISIN-3",
            quantity: 4,
            avgPrice: 300,
            currentPrice: 280,
          };

          return values[itemKey];
        },
      };
      const itemFour = {
        get(itemKey: string) {
          const values: Record<string, unknown> = {
            id: "item-4",
            symbol: "GAMMA.NS",
            displayName: "Gamma",
            isin: "ISIN-4",
            quantity: 3,
            avgPrice: 150,
            currentPrice: null,
          };

          return values[itemKey];
        },
      };

      const values: Record<string, unknown> = {
        id: "portfolio-2",
        userId: "user-1",
        name: "Insights Portfolio",
        fileName: "insights.xlsx",
        createdAt: new Date("2026-04-19T08:00:00.000Z"),
        updatedAt: new Date("2026-04-20T10:00:00.000Z"),
        items: [itemOne, itemTwo, itemThree, itemFour],
      };

      return values[key];
    },
  };

  (service as unknown as {
    repo: { findById: (id: string) => Promise<unknown> };
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).repo = {
    findById: async () => portfolioRecord,
  };

  (service as unknown as {
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).analysisRepo = {
    findLatestSnapshotByPortfolioId: async () => ({
      runId: "run-2",
      status: "partial",
      generatedAt: "2026-04-20T11:00:00.000Z",
      summary: {
        totalHoldings: 4,
        fullyAnalyzed: 3,
        partiallyAnalyzed: 1,
        failed: 0,
      },
      items: [
        {
          portfolioItemId: "item-1",
          symbol: "ALPHA.NS",
          displayName: "Alpha",
          action: "BUY_MORE" as const,
          score: 82,
          confidence: 78,
          reasoning: ["strong"],
          signals: baseSignals,
        },
        {
          portfolioItemId: "item-2",
          symbol: "BETA.NS",
          displayName: "Beta",
          action: "HOLD" as const,
          score: 82,
          confidence: 78,
          reasoning: ["steady"],
          signals: baseSignals,
        },
        {
          portfolioItemId: "item-3",
          symbol: "DELTA.NS",
          displayName: "Delta",
          action: "SELL" as const,
          score: 28,
          confidence: 62,
          reasoning: ["weak"],
          signals: baseSignals,
        },
        {
          portfolioItemId: "item-4",
          symbol: "GAMMA.NS",
          displayName: "Gamma",
          action: "WATCH" as const,
          score: 28,
          confidence: 35,
          reasoning: ["missing"],
          signals: {
            ...baseSignals,
            news: {
              provider: "marketaux",
              status: "no_data" as const,
              message: "none",
            },
          },
        },
      ],
    }),
  };

  const insights = await service.getPortfolioInsights("portfolio-2", "user-1");

  assert.deepEqual(
    insights.highestConvictionHoldings.map((holding) => holding.symbol),
    ["ALPHA.NS", "BETA.NS", "DELTA.NS"],
  );
  assert.deepEqual(
    insights.lowestScoringHoldings.map((holding) => holding.symbol),
    ["GAMMA.NS", "DELTA.NS", "ALPHA.NS"],
  );
  assert.deepEqual(insights.concentrationFlags, [
    {
      type: "single_holding",
      symbol: "ALPHA.NS",
      weight: 44.776119402985074,
      message: "ALPHA.NS accounts for at least 25% of current portfolio value.",
    },
    {
      type: "top_3_holdings",
      weight: 100,
      message: "Top 3 holdings account for at least 60% of current portfolio value.",
    },
  ]);
  assert.deepEqual(insights.dataQualityFlags, [
    {
      type: "missing_analysis_data",
      count: 1,
      message: "1 holdings have incomplete analysis signals.",
    },
    {
      type: "missing_market_price",
      count: 1,
      message: "1 holdings are missing current market price data.",
    },
  ]);
});

test("getPortfolioInsights returns service response", async () => {
  PortfolioService.prototype.getPortfolioInsights = async function () {
    return {
      portfolioId: "portfolio-2",
      generatedAt: "2026-04-20T11:00:00.000Z",
      overview: {
        totalInvestedValue: 3650,
        totalCurrentValue: 3320,
        totalUnrealizedPl: -330,
        totalUnrealizedPlPct: -9.04109589041096,
        actionDistribution: {
          BUY_MORE: 1,
          HOLD: 1,
          WATCH: 1,
          SELL: 1,
        },
        confidenceDistribution: {
          high: 2,
          medium: 1,
          low: 1,
        },
        missingDataCount: 1,
      },
      concentrationFlags: [],
      highestConvictionHoldings: [],
      lowestScoringHoldings: [],
      dataQualityFlags: [],
    };
  };

  const response = await invokeHandler(getPortfolioInsights, {
    params: { id: "portfolio-2" },
    user: { id: "user-1", email: "owner@example.com" },
  });
  const body = response.body as {
    success: boolean;
    data: { portfolioId: string; generatedAt: string };
  };

  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.portfolioId, "portfolio-2");
  assert.equal(body.data.generatedAt, "2026-04-20T11:00:00.000Z");
});

test("PortfolioService holding detail returns 404 for unknown symbol in portfolio", async () => {
  const service = new PortfolioService();
  const portfolioRecord = createPortfolioRecord();

  (service as unknown as {
    repo: { findById: (id: string) => Promise<unknown> };
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).repo = {
    findById: async () => portfolioRecord,
  };

  (service as unknown as {
    analysisRepo: { findLatestSnapshotByPortfolioId: (id: string) => Promise<unknown> };
  }).analysisRepo = {
    findLatestSnapshotByPortfolioId: async () => ({
      runId: "run-1",
      status: "completed",
      generatedAt: "2026-04-20T09:00:00.000Z",
      summary: {
        totalHoldings: 2,
        fullyAnalyzed: 2,
        partiallyAnalyzed: 0,
        failed: 0,
      },
      items: [],
    }),
  };

  await assert.rejects(
    () => service.getHoldingDetail("portfolio-1", "TCS.NS", "user-1"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /holding not found/i);
      return true;
    },
  );
});
