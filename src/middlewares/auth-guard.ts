import { Request, Response, NextFunction } from 'express';

/**
 * Explicit allowlist of routes that do not require authentication.
 * All other routes will require a valid Bearer token.
 */
const PUBLIC_ROUTES = [
  { path: '/api/v1/ping', method: 'GET' },
  { path: '/api/v1/auth/register', method: 'POST' },
  { path: '/api/v1/auth/login', method: 'POST' },
  { path: '/api-docs', method: 'GET' },
];

/**
 * Middleware to enforce API hardening. 
 * Moves from route-specific protection to global-by-default protection.
 */
export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const isPublic = PUBLIC_ROUTES.some(route => {
    const methodMatches = req.method === route.method;
    // Matches exact path or sub-paths (important for swagger-ui assets)
    const pathMatches = req.path === route.path || req.path.startsWith(`${route.path}/`);
    return methodMatches && pathMatches;
  });

  if (isPublic) {
    return next();
  }

  // Default behavior: Require Authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication Required',
      message: 'This endpoint is protected. Please provide a valid Bearer token.'
    });
  }

  // Token verification (JWT) logic should follow here, typically implemented in M4.
  // If valid, next(); else res.status(401).
  next();
};