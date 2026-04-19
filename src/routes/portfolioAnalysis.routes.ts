import { Router } from "express";
import { analyzePortfolio } from "../controllers/portfolioAnalysis.controller";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /portfolio/{id}/analyze:
 *   get:
 *     summary: Analyze an existing portfolio and return deterministic actions per holding
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio analyzed successfully
 *       404:
 *         description: Portfolio not found
 */
router.get("/", analyzePortfolio);

export default router;
