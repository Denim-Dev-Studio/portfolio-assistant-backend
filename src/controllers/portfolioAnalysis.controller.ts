import { Request, Response } from "express";
import { PortfolioAnalysisService } from "../services/portfolioAnalysis.service";

const service = new PortfolioAnalysisService();

export const analyzePortfolio = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const analysis = await service.analyzePortfolio(id);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    const status = error.message === "Portfolio not found" ? 404 : 400;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};
