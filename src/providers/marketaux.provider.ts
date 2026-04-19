import axios from "axios";
import { cache } from "../cache/inMemory.cache";
import { env } from "../config";
import { NewsItem } from "../types/analysis.types";

export const getNews = async (symbol: string): Promise<NewsItem[]> => {
  const cacheKey = `news:${symbol}`;
  const cached = await cache.getPersistent<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const url = `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${env.MARKETAUX_API_KEY}`;

  const res = await axios.get(url);

  const articles =
    res.data?.data?.map((a: any) => ({
      title: a.title,
      description: a.description ?? "",
    })) || [];

  await cache.setPersistent(cacheKey, articles, 60 * 60 * 24 * 7); // 7 days
  return articles;
};
