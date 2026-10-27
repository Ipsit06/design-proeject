import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';

const envFile = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'backend', '.env')].find(existsSync);
if (envFile) {
  loadEnvFile(envFile);
}

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DB_PATH: z.string().default('data/signbridge.db'),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  DB_PATH: process.env.DB_PATH,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
});
