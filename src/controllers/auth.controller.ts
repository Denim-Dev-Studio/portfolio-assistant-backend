import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.register(req.body ?? {});

  res.status(201).json({
    success: true,
    data: result,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.login(req.body ?? {});

  res.status(200).json({
    success: true,
    data: result,
  });
});
