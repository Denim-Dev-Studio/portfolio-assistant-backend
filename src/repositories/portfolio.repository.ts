import { Portfolio } from '../models/portfolio.model';
import { PortfolioItem } from '../models/portfolioItem.model';
import { CreatePortfolioInput } from '../models/types';

export class PortfolioRepository {
  async create(data: CreatePortfolioInput) {
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
  }

  async findById(id: string) {
    return Portfolio.findByPk(id, {
      include: [{ model: PortfolioItem, as: 'items' }],
    });
  }
}