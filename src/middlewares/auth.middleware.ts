import type {} from "../types/express";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";
import { verifyAccessToken } from "../utils/auth";

export const authenticateRequest = (req: Request, _res: Response, next: NextFunction) => {
  const authorizationHeader = req.header("authorization");

  if (!authorizationHeader) {
    next(AppError.unauthorized("Authorization header is required."));
    return;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(AppError.unauthorized("Authorization header must use Bearer token format."));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};
