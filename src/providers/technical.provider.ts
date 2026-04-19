import talib from "talib";
import { DataSignal, TechnicalData } from "../types/analysis.types";

export const getTechnicalAnalysis = async (
  prices: number[],
): Promise<{ data: TechnicalData | null; signal: DataSignal }> => {
  if (!prices.length) {
    return {
      data: null,
      signal: {
        provider: "derived",
        status: "no_data",
        message: "No price history was available, so technical indicators were not computed.",
      },
    };
  }

  if (prices.length < 14) {
    return {
      data: null,
      signal: {
        provider: "derived",
        status: "insufficient_history",
        message: `Only ${prices.length} daily bars were available; at least 14 are required for RSI.`,
      },
    };
  }

  const rsi = await talib.execute({
    name: "RSI",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInTimePeriod: 14,
  });

  const sma50 = await talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInTimePeriod: 50,
  });

  const sma200 = await talib.execute({
    name: "SMA",
    startIdx: 0,
    endIdx: prices.length - 1,
    inReal: prices,
    optInTimePeriod: 200,
  });

  const technical = {
    rsi: rsi.result.outReal.slice(-1)[0] ?? null,
    sma50: sma50.result.outReal.slice(-1)[0] ?? null,
    sma200: sma200.result.outReal.slice(-1)[0] ?? null,
  };

  const availableIndicators = [technical.rsi, technical.sma50, technical.sma200].filter(
    (value) => value !== null,
  ).length;

  if (availableIndicators === 0) {
    return {
      data: null,
      signal: {
        provider: "derived",
        status: "insufficient_history",
        message: `Only ${prices.length} daily bars were available; none of RSI, SMA50, or SMA200 could be computed.`,
      },
    };
  }

  const message =
    technical.sma200 === null
      ? `Technical indicators were partially computed from ${prices.length} daily bars; SMA200 is unavailable.`
      : `Technical indicators were computed from ${prices.length} daily bars.`;

  return {
    data: technical,
    signal: {
      provider: "derived",
      status: technical.sma200 === null ? "insufficient_history" : "available",
      message,
    },
  };
};
