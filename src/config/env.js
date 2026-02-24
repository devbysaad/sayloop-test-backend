require('dotenv').config();

const required = ['DATABASE_URL', 'PORT', 'FRONTEND_URL'];

required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing env variable: ${key}`);
});

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  PORT: parseInt(process.env.PORT) || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
