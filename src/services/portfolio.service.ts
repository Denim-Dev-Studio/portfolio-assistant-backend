import { PortfolioRepository } from "../repositories/portfolio.repository";
import { CreatePortfolioInput } from "../models/types";
import { parsePortfolioFile } from "../adapters/broker.parser";

export class PortfolioService {
  private repo = new PortfolioRepository();

  async createPortfolio(data: CreatePortfolioInput) {
    // minimal validation logic (can expand later)
    if (!data.name || !data.items?.length) {
      throw new Error("Invalid portfolio data");
    }

    return this.repo.create(data);
  }

  async getPortfolio(id: string) {
    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    return portfolio;
  }

  async createPortfolioFromFile(file: Express.Multer.File) {
    if (!file) {
      throw new Error("File is required");
    }

    const items = parsePortfolioFile(file);

    if (!items.length) {
      throw new Error("No valid data found in file");
    }

    return this.repo.create({
      name: file.originalname || "Uploaded Portfolio",
      items,
    });
  }
}
