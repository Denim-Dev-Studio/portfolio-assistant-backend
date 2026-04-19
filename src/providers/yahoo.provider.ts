import yahooFinance from "yahoo-finance2";
import { cache } from "../cache/inMemory.cache";
import {
  DataSignal,
  DataSignalStatus,
  FundamentalData,
} from "../types/analysis.types";

const PROVIDER = "yahoo-finance2";
const yahooClient = new yahooFinance();

type YahooQuoteSummaryResult = {
  defaultKeyStatistics?: Record<string, unknown>;
  financialData?: Record<string, unknown>;
  summaryDetail?: Record<string, unknown>;
};

export class ProviderSignalError extends Error {
  constructor(
    public readonly status: DataSignalStatus,
    message: string,
    public readonly provider: string = PROVIDER,
  ) {
    super(message);
    this.name = "ProviderSignalError";
  }
}

const buildSignal = (
  status: DataSignalStatus,
  message: string,
  provider = PROVIDER,
): DataSignal => ({
  provider,
  status,
  message,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getNestedValue = (
  source: Record<string, unknown>,
  paths: string[][],
): number | null => {
  for (const path of paths) {
    let current: unknown = source;

    for (const key of path) {
      if (!isRecord(current) || !(key in current)) {
        current = undefined;
        break;
      }

      current = current[key];
    }

    if (typeof current === "number") {
      return Number.isFinite(current) ? current : null;
    }

    if (typeof current === "string" && current.trim() !== "") {
      const parsed = Number(current);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (isRecord(current) && typeof current.raw === "number") {
      return Number.isFinite(current.raw) ? current.raw : null;
    }
  }

  return null;
};

const normalizeYahooSymbol = (symbol: string) =>
  symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;

const mapYahooError = (error: unknown, symbol: string): ProviderSignalError => {
  const message = error instanceof Error ? error.message : `Unknown Yahoo Finance error for ${symbol}.`;

  if (/symbol|quote not found|not found|404/i.test(message)) {
    return new ProviderSignalError("unsupported_symbol", message);
  }

  if (/no fundamentals data|no data|empty/i.test(message)) {
    return new ProviderSignalError("no_data", message);
  }

  return new ProviderSignalError("provider_error", message);
};

export const getFundamentals = async (
  symbol: string,
): Promise<{ data: FundamentalData | null; signal: DataSignal }> => {
  const cacheKey = `yahoo:v2:fundamental:${symbol}`;
  const cached = await cache.getPersistent<{ data: FundamentalData | null; signal: DataSignal }>(
    cacheKey,
  );
  if (cached) return cached;

  try {
    const yahooSymbol = normalizeYahooSymbol(symbol);
    const result = (await yahooClient.quoteSummary(yahooSymbol, {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
      formatted: false,
    })) as YahooQuoteSummaryResult;

    const merged = {
      ...(result.defaultKeyStatistics ?? {}),
      ...(result.financialData ?? {}),
      ...(result.summaryDetail ?? {}),
    };

    const peRatio = getNestedValue(merged, [
      ["trailingPE"],
      ["forwardPE"],
      ["priceToEpsCurrentYear"],
    ]);
    const roe = getNestedValue(merged, [
      ["returnOnEquity"],
      ["returnOnEquityTTM"],
    ]);
    const debtToEquity = getNestedValue(merged, [
      ["debtToEquity"],
    ]);

    const data =
      peRatio === null && roe === null && debtToEquity === null
        ? null
        : {
            peRatio,
            roe: roe !== null ? roe * (roe <= 1 ? 100 : 1) : null,
            debtToEquity,
          };

    const response = {
      data,
      signal: data
        ? buildSignal("available", `Fundamental data loaded from Yahoo Finance for ${symbol}.`)
        : buildSignal(
            "no_data",
            `Yahoo Finance returned no usable P/E, ROE, or debt-to-equity metrics for ${symbol}.`,
          ),
    };

    await cache.setPersistent(cacheKey, response, 60 * 60 * 24 * 7);
    return response;
  } catch (error) {
    const providerError = mapYahooError(error, symbol);
    const response = {
      data: null,
      signal: buildSignal(providerError.status, providerError.message),
    };

    await cache.setPersistent(cacheKey, response, 60 * 15);
    return response;
  }
};

export const analysisSignalFromError = (
  signal: DataSignal,
  symbol: string,
  stage: string,
) => {
  const level = signal.status === "provider_error" ? "error" : "warn";
  const log = {
    provider: signal.provider,
    symbol,
    stage,
    status: signal.status,
    message: signal.message,
  };

  if (level === "error") {
    console.error("[market-data]", log);
    return;
  }

  console.warn("[market-data]", log);
};
