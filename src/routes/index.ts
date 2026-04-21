import { Router } from 'express';
import authRoutes from './auth.routes';
import portfolioRoutes from './portfolio.routes';
import userRoutes from './user.routes';

const router = Router();

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
  });
});

router.use('/auth', authRoutes);
router.use('/', userRoutes);
router.use('/portfolio', portfolioRoutes);

export default router;
