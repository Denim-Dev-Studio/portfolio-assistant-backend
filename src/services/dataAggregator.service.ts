import {
  analysisSignalFromError,
  getFundamentals,
} from "../providers/yahoo.provider";
import { getHistoricalPrices } from "../providers/nseHistory.provider";
import { getTechnicalAnalysis } from "../providers/technical.provider";
import { getNews } from "../providers/marketaux.provider";
import { getSentimentScore } from "../providers/sentiment.provider";
import { AggregatedData, DataSignal, NewsItem } from "../types/analysis.types";

const newsSignal = (symbol: string, news: NewsItem[]): DataSignal =>
  news.length > 0
    ? {
        provider: "marketaux",
        status: "available",
        message: `Loaded ${news.length} related news articles for ${symbol}.`,
      }
    : {
        provider: "marketaux",
        status: "no_data",
        message: `MarketAux returned no recent related news for ${symbol}.`,
      };

export const getFullData = async (symbol: string): Promise<AggregatedData> => {
  const [fundamentalResult, pricesResult, newsResult] = await Promise.allSettled([
    getFundamentals(symbol),
    getHistoricalPrices(symbol),
    getNews(symbol),
  ]);

  const fundamental =
    fundamentalResult.status === "fulfilled"
      ? fundamentalResult.value
      : {
          data: null,
          signal: {
            provider: "yahoo-finance2",
            status: "provider_error" as const,
            message: `Unexpected failure while loading fundamentals for ${symbol}.`,
          },
        };

  const prices =
    pricesResult.status === "fulfilled"
      ? pricesResult.value
      : {
          data: [],
          signal: {
            provider: "stock-nse-india",
            status: "provider_error" as const,
            message: `Unexpected failure while loading historical prices for ${symbol}.`,
          },
        };

  const news: NewsItem[] = newsResult.status === "fulfilled" ? newsResult.value : [];
  const technical = await getTechnicalAnalysis(prices.data);
  const sentiment = getSentimentScore(news);
  const signals = {
    fundamental: fundamental.signal,
    priceHistory: prices.signal,
    technical: technical.signal,
    news: newsSignal(symbol, news),
  };

  for (const [stage, signal] of Object.entries(signals)) {
    if (signal.status !== "available") {
      analysisSignalFromError(signal, symbol, stage);
    }
  }

  return {
    symbol,
    fundamental: fundamental.data,
    technical: technical.data,
    sentiment,
    news,
    signals,
    priceHistoryPoints: prices.data.length,
  };
};
