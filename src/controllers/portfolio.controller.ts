import type {} from "../types/express";
import { Request, Response } from "express";
import { AppError } from "../errors/appError";
import { PortfolioService } from "../services/portfolio.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new PortfolioService();

export const createPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const portfolio = await service.createPortfolio(req.body, req.user?.id);

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

  const portfolio = await service.getPortfolio(id, req.user?.id);

  res.json({
    success: true,
    data: portfolio,
  });
});

export const listPortfolios = asyncHandler(async (req: Request, res: Response) => {
  const portfolios = await service.listPortfolioCards(req.user?.id);

  res.json({
    success: true,
    data: portfolios,
  });
});

export const getPortfolioSummary = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const summary = await service.getPortfolioSummary(id, req.user?.id);

  res.json({
    success: true,
    data: summary,
  });
});

export const getPortfolioInsights = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const insights = await service.getPortfolioInsights(id, req.user?.id);

  res.json({
    success: true,
    data: insights,
  });
});

export const getPortfolioHoldings = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const filters = service.parseHoldingsFilters(req.query as Record<string, unknown>);
  const holdings = await service.getPortfolioHoldings(id, req.user?.id, filters);

  res.json({
    success: true,
    data: holdings,
  });
});

export const getHoldingDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;

  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  if (!symbol) {
    throw AppError.badRequest("Holding symbol is required.");
  }

  const holding = await service.getHoldingDetail(id, symbol, req.user?.id);

  res.json({
    success: true,
    data: holding,
  });
});

export const uploadPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const name = req.body?.name;
  const portfolio = await service.createPortfolioFromFile(
    req.user?.id,
    (req as Request & { file?: any }).file,
    name,
  );

  res.status(201).json({
    success: true,
    data: portfolio,
  });
});
