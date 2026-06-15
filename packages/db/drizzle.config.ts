import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env — load the repo-root one so `generate`/`migrate`
// get DATABASE_URL without the caller exporting it. No-op if absent (CI/prod inject env).
try {
  process.loadEnvFile('../../.env');
} catch {
  // .env not present — rely on the ambient environment.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
