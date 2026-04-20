import { Request, Response } from "express";
import { AppError } from "../errors/appError";
import { PortfolioAnalysisService } from "../services/portfolioAnalysis.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new PortfolioAnalysisService();

export const analyzePortfolio = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const analysis = await service.analyzePortfolio(id);

  res.status(200).json({
    success: true,
    data: analysis,
  });
});

export const getLatestAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    throw AppError.badRequest("Portfolio id is required.");
  }

  const analysis = await service.getLatestAnalysis(id);

  res.status(200).json({
    success: true,
    data: analysis,
  });
});
