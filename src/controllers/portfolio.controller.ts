import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolio.service';

const service = new PortfolioService();

export const createPortfolio = async (req: Request, res: Response) => {
  try {
    const portfolio = await service.createPortfolio(req.body);

    res.status(201).json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPortfolio = async (req: Request, res: Response) => {
  try {
    const portfolio = await service.getPortfolio(req.params.id);

    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadPortfolio = async (req: Request, res: Response) => {
  try {
    const portfolio = await service.createPortfolioFromFile(req.file!);

    res.status(201).json({
      success: true,
      data: portfolio,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};