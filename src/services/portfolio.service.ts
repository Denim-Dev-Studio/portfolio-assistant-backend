import { PortfolioRepository } from "../repositories/portfolio.repository";
import { CreatePortfolioInput } from "../models/types";
import { parsePortfolioFile } from "../adapters/broker.parser";
import { resolveSymbolFromISIN } from "../providers/nseSymbol.provider";

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
  async createPortfolioFromFile(file: Express.Multer.File, name?: string) {
    if (!file) {
      throw new Error("File is required");
    }

    if (!name || !name.trim()) {
      throw new Error("Portfolio name is required");
    }

    console.log('File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Step 1: Parse file (returns normalized rows WITHOUT symbol)
    const parsedItems = parsePortfolioFile(file);

    if (!parsedItems.length) {
      throw new Error("No valid data found in file");
    }

    // Step 2: Resolve symbol using ISIN
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

    // Step 3: Filter invalid rows
    const validItems = enrichedItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    if (!validItems.length) {
      throw new Error("No valid instruments found after symbol resolution");
    }

    console.log(
      `Parsed: ${parsedItems.length}, Valid after symbol resolution: ${validItems.length}`,
    );

    // Step 4: Persist
    return this.repo.create({
      name: name.trim(),
      fileName: file.originalname || "Uploaded Portfolio",
      items: validItems,
    });
  }
}
