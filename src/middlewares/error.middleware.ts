import type {} from "../types/express";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  DatabaseError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from "sequelize";
import { AppError } from "../errors/appError";
import { env } from "../config";

const isProduction = env.nodeEnv === "production";

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return AppError.payloadTooLarge("Uploaded file is too large.");
    }

    return AppError.badRequest(error.message);
  }

  if (error instanceof UniqueConstraintError) {
    return AppError.validation("A record with the same unique value already exists.", {
      issues: error.errors.map((issue) => ({
        message: issue.message,
        field: issue.path,
      })),
    });
  }

  if (error instanceof SequelizeValidationError) {
    return AppError.validation("Database validation failed.", {
      issues: error.errors.map((issue) => ({
        message: issue.message,
        field: issue.path,
      })),
    });
  }

  if (error instanceof DatabaseError) {
    const parent = error.parent as { code?: string } | undefined;
    return AppError.database("Database operation failed.", {
      name: error.name,
      code: parent?.code,
    }, error);
  }

  if (error instanceof SyntaxError && "body" in error) {
    return AppError.badRequest("Request body contains invalid JSON.");
  }

  if (error instanceof Error) {
    return AppError.internal(error.message, undefined, error);
  }

  return AppError.internal();
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const normalized = normalizeError(error);
  const requestId = req.requestId || "unknown";

  const logPayload = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: normalized.statusCode,
    code: normalized.code,
    message: normalized.message,
    details: normalized.details,
  };

  if (normalized.statusCode >= 500) {
    console.error("[error]", logPayload, error);
  } else {
    console.warn("[error]", logPayload);
  }

  const response: Record<string, unknown> = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.expose ? normalized.message : "Internal server error",
      requestId,
    },
  };

  if (normalized.details && normalized.expose) {
    response.error = {
      ...(response.error as object),
      details: normalized.details,
    };
  }

  if (!isProduction && normalized.statusCode >= 500) {
    response.error = {
      ...(response.error as object),
      details: normalized.details,
    };
  }

  res.status(normalized.statusCode).json(response);
};
