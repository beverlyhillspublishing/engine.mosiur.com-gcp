import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';
import { stripeWebhookRouter } from './routes/billing.routes';
import { config } from './config';

export function createApp() {
  const app = express();

  // Security headers
  app.set('trust proxy', 1);
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: [config.appUrl, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Stripe webhook MUST come before express.json() to preserve raw body
  app.use('/api/v1', stripeWebhookRouter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API routes
  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
