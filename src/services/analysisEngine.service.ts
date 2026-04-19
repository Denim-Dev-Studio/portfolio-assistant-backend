import {
  AggregatedData,
  AnalysisResult,
  DataSignal,
  DataSignalStatus,
} from "../types/analysis.types";

type PortfolioHolding = {
  symbol: string;
  currentPrice?: number | null;
};

type ScoreContribution = {
  value: number;
  available: boolean;
  reasons: string[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 100) / 100;

const missingSignalReason = (
  label: string,
  signal: DataSignal,
  fallback: string,
) => {
  const prefix = `${label} signal`;

  switch (signal.status) {
    case "auth_error":
      return `${prefix} unavailable because ${signal.provider} authentication failed: ${signal.message}`;
    case "provider_error":
      return `${prefix} unavailable because ${signal.provider} request failed: ${signal.message}`;
    case "unsupported_symbol":
      return `${prefix} unavailable because ${signal.provider} does not cover this NSE symbol: ${signal.message}`;
    case "insufficient_history":
      return `${prefix} unavailable because historical coverage is too short: ${signal.message}`;
    case "no_data":
      return `${prefix} unavailable: ${signal.message}`;
    default:
      return fallback;
  }
};

const scoreFundamentals = (data: AggregatedData): ScoreContribution => {
  if (!data.fundamental) {
    return {
      value: 0,
      available: false,
      reasons: [
        missingSignalReason(
          "Fundamental",
          data.signals.fundamental,
          "Fundamental data unavailable; valuation and balance-sheet checks skipped.",
        ),
      ],
    };
  }

  const reasons: string[] = [];
  let score = 0;
  let metricsAvailable = 0;

  const { peRatio, roe, debtToEquity } = data.fundamental;

  if (peRatio !== null) {
    metricsAvailable += 1;

    if (peRatio > 0 && peRatio <= 20) {
      score += 10;
      reasons.push(`P/E ${round(peRatio)} looks attractive for accumulation.`);
    } else if (peRatio <= 30) {
      score += 5;
      reasons.push(`P/E ${round(peRatio)} is still within a reasonable range.`);
    } else if (peRatio <= 45) {
      reasons.push(`P/E ${round(peRatio)} is full; upside may already be priced in.`);
    } else {
      score -= 8;
      reasons.push(`P/E ${round(peRatio)} is expensive versus a disciplined entry framework.`);
    }
  } else {
    reasons.push("P/E metric was not returned by the fundamentals provider.");
  }

  if (roe !== null) {
    metricsAvailable += 1;

    if (roe >= 20) {
      score += 12;
      reasons.push(`ROE ${round(roe)} indicates strong capital efficiency.`);
    } else if (roe >= 15) {
      score += 8;
      reasons.push(`ROE ${round(roe)} supports durable business quality.`);
    } else if (roe >= 10) {
      score += 4;
      reasons.push(`ROE ${round(roe)} is acceptable but not exceptional.`);
    } else if (roe > 0) {
      score -= 4;
      reasons.push(`ROE ${round(roe)} is weak for a high-conviction buy.`);
    } else {
      score -= 8;
      reasons.push(`ROE ${round(roe)} signals poor profitability.`);
    }
  } else {
    reasons.push("ROE metric was not returned by the fundamentals provider.");
  }

  if (debtToEquity !== null) {
    metricsAvailable += 1;

    if (debtToEquity <= 0.3) {
      score += 10;
      reasons.push(`Debt/equity ${round(debtToEquity)} leaves ample balance-sheet flexibility.`);
    } else if (debtToEquity <= 0.7) {
      score += 6;
      reasons.push(`Debt/equity ${round(debtToEquity)} is comfortably manageable.`);
    } else if (debtToEquity <= 1.2) {
      score += 2;
      reasons.push(`Debt/equity ${round(debtToEquity)} is acceptable but worth monitoring.`);
    } else if (debtToEquity <= 2) {
      score -= 5;
      reasons.push(`Debt/equity ${round(debtToEquity)} is elevated for fresh risk-taking.`);
    } else {
      score -= 10;
      reasons.push(`Debt/equity ${round(debtToEquity)} is too aggressive for a quality screen.`);
    }
  } else {
    reasons.push("Debt-to-equity metric was not returned by the fundamentals provider.");
  }

  return {
    value: score,
    available: metricsAvailable > 0,
    reasons,
  };
};

const scoreTechnicals = (
  data: AggregatedData,
  holding: PortfolioHolding,
): ScoreContribution => {
  if (!data.technical) {
    return {
      value: 0,
      available: false,
      reasons: [
        missingSignalReason(
          "Technical",
          data.signals.technical,
          "Technical data unavailable; momentum and trend checks skipped.",
        ),
      ],
    };
  }

  const reasons: string[] = [];
  let score = 0;
  let metricsAvailable = 0;
  const { rsi, sma50, sma200 } = data.technical;
  const currentPrice = holding.currentPrice ?? null;

  if (rsi !== null) {
    metricsAvailable += 1;

    if (rsi < 30) {
      score += 6;
      reasons.push(`RSI ${round(rsi)} shows oversold conditions that can support a staggered add.`);
    } else if (rsi < 45) {
      score += 8;
      reasons.push(`RSI ${round(rsi)} suggests room for upside without crowding.`);
    } else if (rsi <= 60) {
      score += 10;
      reasons.push(`RSI ${round(rsi)} reflects healthy momentum without being overheated.`);
    } else if (rsi <= 70) {
      score += 3;
      reasons.push(`RSI ${round(rsi)} is constructive but getting extended.`);
    } else {
      score -= 6;
      reasons.push(`RSI ${round(rsi)} is overheated and raises near-term pullback risk.`);
    }
  } else {
    reasons.push(`RSI could not be computed from the available ${data.priceHistoryPoints} price bars.`);
  }

  if (sma50 !== null && sma200 !== null) {
    metricsAvailable += 1;

    if (currentPrice !== null) {
      if (currentPrice > sma50 && sma50 > sma200) {
        score += 12;
        reasons.push(
          `Price ${round(currentPrice)} is above the 50 DMA ${round(sma50)} and 200 DMA ${round(sma200)}.`,
        );
      } else if (currentPrice > sma200 && sma50 >= sma200) {
        score += 6;
        reasons.push(
          `Price ${round(currentPrice)} remains above long-term trend support near ${round(sma200)}.`,
        );
      } else if (currentPrice < sma200 && sma50 < sma200) {
        score -= 10;
        reasons.push(
          `Price ${round(currentPrice)} sits below both 50 DMA ${round(sma50)} and 200 DMA ${round(sma200)}.`,
        );
      } else {
        score -= 3;
        reasons.push("Trend setup is mixed and does not justify aggressive buying.");
      }
    } else if (sma50 > sma200) {
      score += 5;
      reasons.push(`50 DMA ${round(sma50)} is above 200 DMA ${round(sma200)}, keeping trend positive.`);
    } else {
      score -= 5;
      reasons.push(`50 DMA ${round(sma50)} is below 200 DMA ${round(sma200)}, showing weak structure.`);
    }
  } else {
    reasons.push(`Only ${data.priceHistoryPoints} daily bars were available, so the moving-average trend picture is incomplete.`);
  }

  return {
    value: score,
    available: metricsAvailable > 0,
    reasons,
  };
};

const scoreSentiment = (data: AggregatedData): ScoreContribution => {
  const reasons: string[] = [];
  const articleCount = data.news.length;

  if (articleCount === 0) {
    return {
      value: 0,
      available: false,
      reasons: [missingSignalReason("News", data.signals.news, "No recent news coverage available; sentiment left neutral.")],
    };
  }

  const sentiment = data.sentiment;
  let score = 0;

  if (sentiment >= 4) {
    score += 12;
    reasons.push(`Average news sentiment ${round(sentiment)} is strongly positive across ${articleCount} articles.`);
  } else if (sentiment >= 1.5) {
    score += 8;
    reasons.push(`Average news sentiment ${round(sentiment)} is supportive across ${articleCount} articles.`);
  } else if (sentiment > -1.5) {
    score += 2;
    reasons.push(`Average news sentiment ${round(sentiment)} is broadly neutral.`);
  } else if (sentiment > -4) {
    score -= 6;
    reasons.push(`Average news sentiment ${round(sentiment)} is turning cautious.`);
  } else {
    score -= 12;
    reasons.push(`Average news sentiment ${round(sentiment)} is decisively negative.`);
  }

  return {
    value: score,
    available: true,
    reasons,
  };
};

const deriveAction = (score: number): AnalysisResult["action"] => {
  if (score >= 75) {
    return "BUY_MORE";
  }

  if (score >= 55) {
    return "HOLD";
  }

  if (score >= 35) {
    return "WATCH";
  }

  return "SELL";
};

const confidenceFloor = (availableSignals: number) => {
  if (availableSignals === 3) return 45;
  if (availableSignals === 2) return 30;
  if (availableSignals === 1) return 15;
  return 10;
};

export const summarizeSignalAvailability = (signals: AnalysisResult["signals"]) => {
  const statuses = Object.values(signals).map((signal) => signal.status);
  const available = statuses.filter((status) => status === "available").length;
  const partial = statuses.filter((status) => status === "insufficient_history").length;
  const failed = statuses.filter((status) => status !== "available" && status !== "insufficient_history").length;

  return { available, partial, failed };
};

export const analyzeHolding = (
  holding: PortfolioHolding,
  data: AggregatedData,
): AnalysisResult => {
  const fundamental = scoreFundamentals(data);
  const technical = scoreTechnicals(data, holding);
  const sentiment = scoreSentiment(data);

  const rawScore = 50 + fundamental.value + technical.value + sentiment.value;
  const score = clamp(Math.round(rawScore), 0, 100);
  const availableSignals = [fundamental, technical, sentiment].filter(
    (signal) => signal.available,
  ).length;
  const completeness = availableSignals / 3;
  const conviction = Math.abs(score - 50) / 50;
  const confidence = clamp(
    Math.round((completeness * 0.55 + conviction * 0.2) * 100),
    confidenceFloor(availableSignals),
    90,
  );

  const reasoning = [
    ...fundamental.reasons,
    ...technical.reasons,
    ...sentiment.reasons,
  ];

  if (availableSignals === 0) {
    return {
      symbol: holding.symbol,
      action: "WATCH",
      score: 50,
      confidence: 10,
      reasoning: [
        "Insufficient usable market data was available to build a reliable multi-factor view.",
        ...reasoning,
      ],
      signals: data.signals,
    };
  }

  return {
    symbol: holding.symbol,
    action: deriveAction(score),
    score,
    confidence,
    reasoning,
    signals: data.signals,
  };
};
