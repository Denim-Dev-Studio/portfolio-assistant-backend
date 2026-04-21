import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config";
import { AppError } from "../errors/appError";

type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
};

const JWT_AUDIENCE = "portfolio-assistant";
const JWT_ISSUER = "portfolio-assistant-backend";

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);

export const comparePassword = async (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const signAccessToken = (user: { id: string; email: string; name: string }) =>
  jwt.sign(
    {
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    {
      subject: user.id,
      expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

export const verifyAccessToken = (token: string): Express.AuthenticatedUser => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as AuthTokenPayload;

    if (!payload.sub || !payload.email) {
      throw AppError.unauthorized("Access token payload is invalid.");
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.unauthorized("Access token is invalid or expired.");
  }
};
