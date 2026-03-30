export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  trackingBaseUrl: process.env.TRACKING_BASE_URL || 'http://localhost:3001',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-here',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      starter: process.env.STRIPE_PRICE_ID_STARTER || '',
      growth: process.env.STRIPE_PRICE_ID_GROWTH || '',
      pro: process.env.STRIPE_PRICE_ID_PRO || '',
    },
  },

  gcs: {
    projectId: process.env.GCS_PROJECT_ID || '',
    bucketName: process.env.GCS_BUCKET_NAME || '',
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  },

  smtp: {
    host: process.env.SYSTEM_SMTP_HOST || '',
    port: parseInt(process.env.SYSTEM_SMTP_PORT || '587', 10),
    user: process.env.SYSTEM_SMTP_USER || '',
    pass: process.env.SYSTEM_SMTP_PASS || '',
    fromEmail: process.env.SYSTEM_FROM_EMAIL || 'noreply@techypark.com',
  },

  plans: {
    starter: { emailsPerMonth: 1000, price: 9 },
    growth: { emailsPerMonth: 25000, price: 29 },
    pro: { emailsPerMonth: 250000, price: 79 },
  },
};
