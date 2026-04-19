export type CreatePortfolioItemInput = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
};

export type CreatePortfolioInput = {
  name: string;
  items: CreatePortfolioItemInput[];
};