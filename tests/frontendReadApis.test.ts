import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { listPortfolios, getPortfolioSummary } from "../src/controllers/portfolio.controller";
import { PortfolioService } from "../src/services/portfolio.service";
import { AppError } from "../src/errors/appError";

const originalListPortfolioCards = PortfolioService.prototype.listPortfolioCards;
const originalGetPortfolioSummary = PortfolioService.prototype.getPortfolioSummary;

afterEach(() => {
  PortfolioService.prototype.listPortfolioCards = originalListPortfolioCards;
  PortfolioService.prototype.getPortfolioSummary = originalGetPortfolioSummary;
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

  const response = await invokeHandler(listPortfolios, {});
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
    };
  };

  const response = await invokeHandler(getPortfolioSummary, {
    params: { id: "portfolio-1" },
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

  const rows = await service.getPortfolioHoldings("portfolio-1", {
    action: "WATCH",
    minConfidence: 40,
    hasMissingData: true,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.symbol, "INFY.NS");
  assert.equal(rows[0]?.hasMissingData, true);
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
    () => service.getHoldingDetail("portfolio-1", "TCS.NS"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 404);
      assert.match(error.message, /holding not found/i);
      return true;
    },
  );
});
