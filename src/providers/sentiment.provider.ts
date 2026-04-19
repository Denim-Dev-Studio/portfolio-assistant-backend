import Sentiment from "sentiment";
import { NewsItem } from "../types/analysis.types";

const sentiment = new Sentiment();

export const getSentimentScore = (articles: NewsItem[]) => {
  if (!articles.length) return 0;

  const scores = articles.map((a) => {
    const text = `${a.title} ${a.description}`;
    return sentiment.analyze(text).score;
  });

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  return avg;
};
