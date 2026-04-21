import { Router } from "express";
import { getCurrentUser } from "../controllers/user.controller";
import { authenticateRequest } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Current user APIs
 */

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get the currently authenticated user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile fetched successfully
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/me", authenticateRequest, getCurrentUser);

export default router;
