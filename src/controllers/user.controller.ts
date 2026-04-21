import type {} from "../types/express";
import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";

const service = new UserService();

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const profile = await service.getCurrentUser(req.user?.id);

  res.json({
    success: true,
    data: profile,
  });
});
