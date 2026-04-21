import { Router } from "express";
import {
  analyzePortfolio,
} from "../controllers/portfolioAnalysis.controller";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /portfolio/{id}/analyze:
 *   get:
 *     summary: Analyze an existing portfolio, persist the run, and return deterministic actions per holding
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio analyzed successfully and persisted as a new analysis run
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     portfolioId:
 *                       type: string
 *                     portfolioName:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalHoldings:
 *                           type: integer
 *                         fullyAnalyzed:
 *                           type: integer
 *                         partiallyAnalyzed:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Portfolio not found
 */
router.get("/", analyzePortfolio);

export default router;
