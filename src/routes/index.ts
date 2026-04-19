import { Router } from 'express';
import portfolioRoutes from './portfolio.routes';

const router = Router();

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
  });
});

router.use('/portfolio', portfolioRoutes);

export default router;