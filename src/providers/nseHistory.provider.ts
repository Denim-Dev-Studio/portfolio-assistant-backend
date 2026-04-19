import { NseIndia } from "stock-nse-india";
import { cache } from "../cache/inMemory.cache";
import { DataSignal } from "../types/analysis.types";

const nseIndia = new NseIndia();
const PROVIDER = "stock-nse-india";

type HistoricalPoint = {
  chClosingPrice?: number | string;
  CH_CLOSING_PRICE?: number | string;
  close?: number | string;
  closingPrice?: number | string;
};

type HistoricalChunk = {
  data?: HistoricalPoint[];
};

const normalizeNseSymbol = (symbol: string) =>
  symbol.replace(/\.NS$/i, "");

const parseClose = (point: HistoricalPoint): number | null => {
  const raw =
    point.chClosingPrice ??
    point.CH_CLOSING_PRICE ??
    point.close ??
    point.closingPrice;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapNseError = (error: unknown, symbol: string): DataSignal => {
  const message =
    error instanceof Error ? error.message : `Unknown NSE history error for ${symbol}.`;

  if (/symbol|not found|invalid/i.test(message)) {
    return {
      provider: PROVIDER,
      status: "unsupported_symbol",
      message,
    };
  }

  if (/no data|empty/i.test(message)) {
    return {
      provider: PROVIDER,
      status: "no_data",
      message,
    };
  }

  return {
    provider: PROVIDER,
    status: "provider_error",
    message,
  };
};

export const getHistoricalPrices = async (
  symbol: string,
): Promise<{ data: number[]; signal: DataSignal }> => {
  const cacheKey = `nse:v2:prices:${symbol}`;
  const cached = await cache.getPersistent<{ data: number[]; signal: DataSignal }>(cacheKey);
  if (cached) return cached;

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 400);

    const chunks = (await nseIndia.getEquityHistoricalData(normalizeNseSymbol(symbol), {
      start,
      end,
    })) as HistoricalChunk[];

    const rows = chunks.flatMap((chunk) => chunk.data ?? []);

    const prices = rows
      .map(parseClose)
      .filter((price: number | null): price is number => price !== null);

    const response = {
      data: prices,
      signal:
        prices.length > 0
          ? {
              provider: PROVIDER,
              status: "available" as const,
              message: `Loaded ${prices.length} daily price bars from NSE history for ${symbol}.`,
            }
          : {
              provider: PROVIDER,
              status: "no_data" as const,
              message: `NSE history returned no daily price bars for ${symbol}.`,
            },
    };

    await cache.setPersistent(cacheKey, response, 60 * 60 * 24 * 7);
    return response;
  } catch (error) {
    const response = {
      data: [] as number[],
      signal: mapNseError(error, symbol),
    };
    await cache.setPersistent(cacheKey, response, 60 * 15);
    return response;
  }
};
