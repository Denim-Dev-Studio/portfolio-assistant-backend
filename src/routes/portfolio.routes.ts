import { Router } from 'express';
import {
  createPortfolio,
  getHoldingDetail,
  getPortfolio,
  getPortfolioHoldings,
  getPortfolioSummary,
  listPortfolios,
  uploadPortfolio,
} from '../controllers/portfolio.controller';
import { getLatestAnalysis } from '../controllers/portfolioAnalysis.controller';
import { upload } from '../middlewares/upload.middleware';
import portfolioAnalysisRoutes from './portfolioAnalysis.routes';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Portfolio
 *   description: Portfolio management APIs
 */

/**
 * @swagger
 * /portfolio:
 *   get:
 *     summary: List frontend-ready portfolio cards
 *     tags: [Portfolio]
 *     responses:
 *       200:
 *         description: Portfolio cards fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       lastAnalyzedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       holdingCount:
 *                         type: integer
 *                       latestSummary:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           totalHoldings:
 *                             type: integer
 *                           fullyAnalyzed:
 *                             type: integer
 *                           partiallyAnalyzed:
 *                             type: integer
 *                           failed:
 *                             type: integer
 *   post:
 *     summary: Create a new portfolio
 *     tags: [Portfolio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - items
 *             properties:
 *               name:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     symbol:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     avgPrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: Portfolio created successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           symbol:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           isin:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           avgPrice:
 *                             type: number
 *                           currentPrice:
 *                             type: number
 *                             nullable: true
 */
router.post('/', createPortfolio);
router.get('/', listPortfolios);

/**
 * @swagger
 * /portfolio/upload:
 *   post:
 *     summary: Upload portfolio file and create portfolio
 *     tags: [Portfolio]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Portfolio file (CSV/XLSX)
 *               name:
 *                 type: string
 *                 example: Long Term Portfolio
 *                 description: Name of the portfolio
 *     responses:
 *       201:
 *         description: Portfolio created successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           symbol:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           isin:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           avgPrice:
 *                             type: number
 *                           currentPrice:
 *                             type: number
 *                             nullable: true
 *       400:
 *         description: Bad request
 */
router.post('/upload', upload.single('file'), uploadPortfolio);
router.use('/:id/analyze', portfolioAnalysisRoutes);

/**
 * @swagger
 * /portfolio/{id}/analysis/latest:
 *   get:
 *     summary: Get the latest persisted analysis for a portfolio
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest persisted analysis fetched successfully
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
 *                     analysisRunId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [completed, partial, failed]
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
 *                         properties:
 *                           portfolioItemId:
 *                             type: string
 *                             format: uuid
 *                           symbol:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           action:
 *                             type: string
 *                             enum: [BUY_MORE, HOLD, WATCH, SELL]
 *                           score:
 *                             type: integer
 *                           confidence:
 *                             type: integer
 *                           reasoning:
 *                             type: array
 *                             items:
 *                               type: string
 *                           signals:
 *                             type: object
 *       404:
 *         description: Portfolio or persisted analysis not found
 */
router.get('/:id/analysis/latest', getLatestAnalysis);

/**
 * @swagger
 * /portfolio/{id}/summary:
 *   get:
 *     summary: Get frontend-ready portfolio summary and latest analysis metadata
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Portfolio summary fetched successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     latestAnalysis:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         runId:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           enum: [completed, partial, failed]
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         summary:
 *                           type: object
 *                           properties:
 *                             totalHoldings:
 *                               type: integer
 *                             fullyAnalyzed:
 *                               type: integer
 *                             partiallyAnalyzed:
 *                               type: integer
 *                             failed:
 *                               type: integer
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Portfolio not found
 */
router.get('/:id/summary', getPortfolioSummary);

/**
 * @swagger
 * /portfolio/{id}/holdings/{symbol}:
 *   get:
 *     summary: Get one holding detail from the latest persisted portfolio analysis
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Holding detail fetched successfully
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
 *                       format: uuid
 *                     symbol:
 *                       type: string
 *                     portfolioItem:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         displayName:
 *                           type: string
 *                         isin:
 *                           type: string
 *                         quantity:
 *                           type: number
 *                         avgPrice:
 *                           type: number
 *                         currentPrice:
 *                           type: number
 *                           nullable: true
 *                     latestAnalysis:
 *                       type: object
 *                       properties:
 *                         runId:
 *                           type: string
 *                           format: uuid
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *                           enum: [completed, partial, failed]
 *                         action:
 *                           type: string
 *                           enum: [BUY_MORE, HOLD, WATCH, SELL]
 *                         score:
 *                           type: integer
 *                         confidence:
 *                           type: integer
 *                         reasoning:
 *                           type: array
 *                           items:
 *                             type: string
 *                         signals:
 *                           type: object
 *                         hasMissingData:
 *                           type: boolean
 *       404:
 *         description: Portfolio, holding, or persisted analysis not found
 */
router.get('/:id/holdings/:symbol', getHoldingDetail);

/**
 * @swagger
 * /portfolio/{id}/holdings:
 *   get:
 *     summary: List holding rows from the latest persisted portfolio analysis
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [BUY_MORE, HOLD, WATCH, SELL]
 *       - in: query
 *         name: minConfidence
 *         schema:
 *           type: number
 *       - in: query
 *         name: hasMissingData
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Holding rows fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       avgPrice:
 *                         type: number
 *                       currentPrice:
 *                         type: number
 *                         nullable: true
 *                       action:
 *                         type: string
 *                         enum: [BUY_MORE, HOLD, WATCH, SELL]
 *                       score:
 *                         type: integer
 *                       confidence:
 *                         type: integer
 *                       signals:
 *                         type: object
 *                       hasMissingData:
 *                         type: boolean
 *       400:
 *         description: Invalid filter values supplied
 *       404:
 *         description: Portfolio or persisted analysis not found
 */
router.get('/:id/holdings', getPortfolioHoldings);

/**
 * @swagger
 * /portfolio/{id}:
 *   get:
 *     summary: Get portfolio by ID
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Portfolio fetched successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Portfolio not found
 */
router.get('/:id', getPortfolio);


export default router;
