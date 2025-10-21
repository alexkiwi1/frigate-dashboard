import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '7867079335:AAGV3LBypUquSRn4mqikaw7-t-WPuArF64A',
    chatId: process.env.TELEGRAM_CHAT_ID || '5782474820',
  },
  frigate: {
    apiUrl: process.env.FRIGATE_API_URL || 'http://10.0.20.6:5001',
    db: {
      host: process.env.FRIGATE_DB_HOST || '10.0.20.6',
      port: parseInt(process.env.FRIGATE_DB_PORT || '5433'),
      database: process.env.FRIGATE_DB_NAME || 'frigate_db',
      user: process.env.FRIGATE_DB_USER || 'frigate',
      password: process.env.FRIGATE_DB_PASS || 'frigate_secure_pass_2024',
    },
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    port: parseInt(process.env.PORT || '3000'),
  },
  autopilot: {
    enabled: process.env.AUTOPILOT_ENABLED === 'true',
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || '30000'),
    alertThreshold: parseInt(process.env.ALERT_THRESHOLD || '5'),
  },
} as const;
