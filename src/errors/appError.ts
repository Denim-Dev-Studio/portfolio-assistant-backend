export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options?: {
      details?: unknown;
      expose?: boolean;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? statusCode < 500;

    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, "BAD_REQUEST", message, { details });
  }

  static unauthorized(message: string, details?: unknown) {
    return new AppError(401, "UNAUTHORIZED", message, { details });
  }

  static forbidden(message: string, details?: unknown) {
    return new AppError(403, "FORBIDDEN", message, { details });
  }

  static notFound(message: string, details?: unknown) {
    return new AppError(404, "NOT_FOUND", message, { details });
  }

  static unsupportedMediaType(message: string, details?: unknown) {
    return new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message, { details });
  }

  static payloadTooLarge(message: string, details?: unknown) {
    return new AppError(413, "PAYLOAD_TOO_LARGE", message, { details });
  }

  static validation(message: string, details?: unknown) {
    return new AppError(422, "VALIDATION_ERROR", message, { details });
  }

  static database(message: string, details?: unknown, cause?: unknown) {
    return new AppError(500, "DATABASE_ERROR", message, {
      details,
      cause,
      expose: false,
    });
  }

  static internal(message = "Internal server error", details?: unknown, cause?: unknown) {
    return new AppError(500, "INTERNAL_SERVER_ERROR", message, {
      details,
      cause,
      expose: false,
    });
  }
}
