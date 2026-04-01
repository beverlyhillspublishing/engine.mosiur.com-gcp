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

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
  },

  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    // Stored as base64 in env to avoid newline issues; decoded here
    privateKey: process.env.APPLE_PRIVATE_KEY
      ? Buffer.from(process.env.APPLE_PRIVATE_KEY, 'base64').toString('utf8')
      : '',
    redirectUri: process.env.APPLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/apple/callback',
  },

  webauthn: {
    rpId: process.env.RP_ID || 'localhost',
    rpName: process.env.RP_NAME || 'TechyPark',
    origin: process.env.RP_ORIGIN || 'http://localhost:3000',
  },

  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    inboundDomain: process.env.INBOUND_EMAIL_DOMAIN || 'icloud.mosiur.com',
    inboundWebhookSecret: process.env.INBOUND_WEBHOOK_SECRET || '',
    mailgunSigningKey: process.env.MAILGUN_INBOUND_SIGNING_KEY || '',
  },

  mailSync: {
    intervalMs: parseInt(process.env.MAIL_SYNC_INTERVAL_MS || '900000', 10),
  },
};
