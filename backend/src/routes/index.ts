/**
 * @module Routes
 * @description Main router that combines all API routes
 *
 * @requires express
 * @requires ./transcription.routes
 * @requires ./auth.routes
 * @requires ./webhook.routes
 *
 * @example
 * import routes from './routes';
 * app.use('/api', routes);
 *
 * @exports {Router} default - Combined Express router
 */

import express from 'express';
import transcriptionRoutes from './transcription.routes';
import authRoutes from './auth.routes';

const router = express.Router();

// API v1 routes
router.use('/v1', transcriptionRoutes);
router.use('/v1', authRoutes);

// API version info
router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      apiVersion: 'v1',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
