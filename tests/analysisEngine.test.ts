import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHolding } from "../src/services/analysisEngine.service";
import { AggregatedData } from "../src/types/analysis.types";

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

test("analyzeHolding surfaces cause-specific reasoning for missing fundamentals", () => {
  const data: AggregatedData = {
    symbol: "TEST.NS",
    fundamental: null,
    technical: {
      rsi: 55,
      sma50: 100,
      sma200: 90,
    },
    sentiment: 3,
    news: [{ title: "Good", description: "positive" }],
    signals: {
      ...baseSignals,
      fundamental: {
        provider: "yahoo-finance2",
        status: "unsupported_symbol",
        message: "symbol not found",
      },
    },
    priceHistoryPoints: 220,
  };

  const result = analyzeHolding(
    {
      symbol: "TEST.NS",
      currentPrice: 110,
    },
    data,
  );

  assert.equal(result.signals.fundamental.status, "unsupported_symbol");
  assert.match(result.reasoning[0], /does not cover this NSE symbol/i);
});

test("analyzeHolding degrades confidence when only sentiment is available", () => {
  const data: AggregatedData = {
    symbol: "TEST.NS",
    fundamental: null,
    technical: null,
    sentiment: 4.5,
    news: [{ title: "Good", description: "positive" }],
    signals: {
      fundamental: {
        provider: "yahoo-finance2",
        status: "no_data",
        message: "no usable metrics",
      },
      priceHistory: {
        provider: "stock-nse-india",
        status: "no_data",
        message: "no bars",
      },
      technical: {
        provider: "derived",
        status: "insufficient_history",
        message: "Only 10 bars were available.",
      },
      news: baseSignals.news,
    },
    priceHistoryPoints: 10,
  };

  const result = analyzeHolding(
    {
      symbol: "TEST.NS",
      currentPrice: 110,
    },
    data,
  );

  assert.equal(result.action, "HOLD");
  assert.ok(result.confidence < 30);
  assert.match(result.reasoning[1], /historical coverage is too short|Only 10/i);
});
