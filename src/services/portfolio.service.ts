import { PortfolioRepository } from "../repositories/portfolio.repository";
import { CreatePortfolioInput } from "../models/types";
import { parsePortfolioFile } from "../adapters/broker.parser";
import { resolveSymbolFromISIN } from "../providers/nseSymbol.provider";
import { AppError } from "../errors/appError";

export class PortfolioService {
  private repo = new PortfolioRepository();

  async createPortfolio(data: CreatePortfolioInput) {
    if (!data?.name?.trim()) {
      throw AppError.validation("Portfolio name is required.");
    }

    if (!data.items?.length) {
      throw AppError.validation("Portfolio must contain at least one item.");
    }

    return this.repo.create(data);
  }

  async getPortfolio(id: string) {
    if (!id?.trim()) {
      throw AppError.badRequest("Portfolio id is required.");
    }

    const portfolio = await this.repo.findById(id);

    if (!portfolio) {
      throw AppError.notFound("Portfolio not found.");
    }

    return portfolio;
  }
  async createPortfolioFromFile(file?: Express.Multer.File, name?: string) {
    if (!file) {
      throw AppError.validation("File is required.");
    }

    if (!name || !name.trim()) {
      throw AppError.validation("Portfolio name is required.");
    }

    console.log("File info:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const parsedItems = parsePortfolioFile(file);

    if (!parsedItems.length) {
      throw AppError.validation("No valid data found in file.");
    }

    const enrichedItems = parsedItems.map((item) => {
      const symbol = resolveSymbolFromISIN(item.isin);

      if (!symbol) {
        console.warn(`Skipping item: Symbol not found for ISIN ${item.isin}`);
        return null;
      }

      return {
        symbol, // ✅ resolved from NSE CSV
        displayName: item.displayName, // ✅ from XLSX
        isin: item.isin, // ✅ from XLSX
        quantity: item.quantity,
        avgPrice: item.avgPrice,
        currentPrice: item.currentPrice,
      };
    });

    const validItems = enrichedItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    if (!validItems.length) {
      throw AppError.validation("No valid instruments found after symbol resolution.");
    }

    console.log(
      `Parsed: ${parsedItems.length}, Valid after symbol resolution: ${validItems.length}`,
    );

    return this.repo.create({
      name: name.trim(),
      fileName: file.originalname || "Uploaded Portfolio",
      items: validItems,
    });
  }
}
