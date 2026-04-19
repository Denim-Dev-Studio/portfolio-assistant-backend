import { Portfolio } from './portfolio.model';
import { PortfolioItem } from './portfolioItem.model';
import { CacheEntry } from './cacheEntry.model';

const models = {
  Portfolio,
  PortfolioItem,
  CacheEntry,
};

// Run associations AFTER all models are initialized
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export default models;
export { Portfolio, PortfolioItem, CacheEntry };
