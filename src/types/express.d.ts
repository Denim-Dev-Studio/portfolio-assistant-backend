import "express";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      name?: string;
    }

    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
