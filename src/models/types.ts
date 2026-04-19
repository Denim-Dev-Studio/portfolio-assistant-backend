export type CreatePortfolioItemInput = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  displayName: string;
  isin: string;
};

export type ParsedPortfolioItemInput = Omit<CreatePortfolioItemInput, "symbol">;

export type CreatePortfolioInput = {
  fileName?: string;
  name: string;
  items: CreatePortfolioItemInput[];
};
