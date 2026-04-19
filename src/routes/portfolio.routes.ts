import { Router } from 'express';
import {
  createPortfolio,
  getPortfolio,
  uploadPortfolio,
} from '../controllers/portfolio.controller';
import { upload } from '../middlewares/upload.middleware';

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

/**
 * @swagger
 * /portfolio/upload:
 *   post:
 *     summary: Upload portfolio file (CSV or XLSX)
 *     tags: [Portfolio]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Portfolio created from file
 */
router.post('/upload', upload.single('file'), uploadPortfolio);


export default router;