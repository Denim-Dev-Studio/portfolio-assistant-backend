import axios from "axios";
import { cache } from "../cache/inMemory.cache";
import { env } from "../config";
import { FundamentalData } from "../types/analysis.types";

const BASE_URL = "https://financialmodelingprep.com/api/v3";

const normalizeSymbol = (symbol: string) =>
  symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;

export const getFundamentals = async (
  symbol: string,
): Promise<FundamentalData | null> => {
  const cacheKey = `fundamental:${symbol}`;
  const cached = await cache.getPersistent<FundamentalData | null>(cacheKey);
  if (cached !== null) return cached;

  const url = `${BASE_URL}/key-metrics/${normalizeSymbol(symbol)}?apikey=${env.FMP_API_KEY}`;
  const res = await axios.get(url);

  const data = res.data?.[0];

  const result = data
    ? {
        peRatio: data.peRatio ?? null,
        roe: data.roe ?? null,
        debtToEquity: data.debtToEquity ?? null,
      }
    : null;

  await cache.setPersistent(cacheKey, result, 60 * 60 * 24 * 7); // 7 days
  return result;
};


export const getHistoricalPrices = async (symbol: string): Promise<number[]> => {
  const cacheKey = `price:${symbol}`;
  const cached = await cache.getPersistent<number[]>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/historical-price-full/${normalizeSymbol(symbol)}?apikey=${env.FMP_API_KEY}`;
  const res = await axios.get(url);

  const prices = res.data?.historical?.map((p: any) => p.close) || [];

  await cache.setPersistent(cacheKey, prices, 60 * 60 * 24 * 7); // 7 days
  return prices;
};
