import { Portfolio } from '../models/portfolio.model';
import { PortfolioItem } from '../models/portfolioItem.model';
import { CreatePortfolioInput } from '../models/types';
import { AppError } from '../errors/appError';

export class PortfolioRepository {
  async create(data: CreatePortfolioInput) {
    try {
      const portfolio = await Portfolio.create(
        {
          name: data.name,
          items: data.items,
        },
        {
          include: [{ model: PortfolioItem, as: 'items' }],
        }
      );

      return portfolio;
    } catch (error) {
      throw AppError.database("Failed to create portfolio.", undefined, error);
    }
  }

  async findById(id: string) {
    try {
      return await Portfolio.findByPk(id, {
        include: [{ model: PortfolioItem, as: 'items' }],
      });
    } catch (error) {
      throw AppError.database("Failed to fetch portfolio.", undefined, error);
    }
  }

  async findAll() {
    try {
      return await Portfolio.findAll({
        include: [{ model: PortfolioItem, as: "items" }],
        order: [["createdAt", "DESC"]],
      });
    } catch (error) {
      throw AppError.database("Failed to fetch portfolios.", undefined, error);
    }
  }
}
