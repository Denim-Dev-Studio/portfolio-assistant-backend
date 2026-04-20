import { Request, Response } from "express";
import { AppError } from "../errors/appError";
import { PortfolioService } from "../services/portfolio.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new PortfolioService();

export const createPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const portfolio = await service.createPortfolio(req.body);

  res.status(201).json({
    success: true,
    data: portfolio,
  });
});

export const getPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const portfolio = await service.getPortfolio(id);

  res.json({
    success: true,
    data: portfolio,
  });
});

export const uploadPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const name = req.body?.name;
  const portfolio = await service.createPortfolioFromFile(req.file, name);

  res.status(201).json({
    success: true,
    data: portfolio,
  });
});
