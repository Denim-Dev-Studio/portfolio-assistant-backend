import { Portfolio } from './portfolio.model';
import { PortfolioItem } from './portfolioItem.model';
import { CacheEntry } from './cacheEntry.model';
import { AnalysisRun } from './analysisRun.model';
import { HoldingAnalysis } from './holdingAnalysis.model';
import { User } from './user.model';

const models = {
  User,
  Portfolio,
  PortfolioItem,
  CacheEntry,
  AnalysisRun,
  HoldingAnalysis,
};

// Run associations AFTER all models are initialized
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export default models;
export { User, Portfolio, PortfolioItem, CacheEntry, AnalysisRun, HoldingAnalysis };
