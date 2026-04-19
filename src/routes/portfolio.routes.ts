import { Router } from 'express';
import {
  createPortfolio,
  getPortfolio,
  uploadPortfolio,
} from '../controllers/portfolio.controller';
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
 */
router.post('/', createPortfolio);

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
 *       400:
 *         description: Bad request
 */
router.post('/upload', upload.single('file'), uploadPortfolio);
router.use('/:id/analyze', portfolioAnalysisRoutes);

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
 *     responses:
 *       200:
 *         description: Portfolio fetched successfully
 *       404:
 *         description: Portfolio not found
 */
router.get('/:id', getPortfolio);


export default router;
