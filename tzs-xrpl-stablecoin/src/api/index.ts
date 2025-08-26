const express = require('express');
import authRoutes from './routes/auth.routes';
import tokenRoutes from './routes/token.routes';
import pspRoutes from './routes/psp.routes';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/token', tokenRoutes);
router.use('/psp', pspRoutes);

export default router;
