require('dotenv').config();

// ── Env validation ────────────────────────────────────────────────────────────
// In production: throw immediately on any missing required var.
// In development: warn so the server still starts (useful when DB is down
//   locally but you want to test unprotected routes).
const isProd = process.env.NODE_ENV === 'production';

const required = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'PORT', 'FRONTEND_URL'];

required.forEach((key) => {
  if (!process.env[key]) {
    const msg = `[env] Missing required env variable: ${key}`;
    if (isProd) {
      throw new Error(msg);
    } else {
      console.warn(`⚠️  ${msg} — server will start but some features will fail`);
    }
  }
});

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  PORT: parseInt(process.env.PORT) || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
