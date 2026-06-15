// Loads the repo-root .env into process.env for the standalone db scripts (e.g. `tsx seed`).
// Imported FIRST — before ./client — so DATABASE_URL is set before the pg Pool is created.
// No-op if the file is absent (CI/prod inject env directly).
try {
  process.loadEnvFile('../../.env');
} catch {
  // .env not present — rely on the ambient environment.
}

export {};
