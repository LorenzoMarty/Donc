import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke do treinador cognitivo. Sobe backend (sqlite + seed demo) e frontend automaticamente.
 * Pré-requisito único: `npm run test:e2e:install` (baixa o Chromium) uma vez.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Backend FastAPI FRESCO na 8001 (sqlite isolado + seed demo), para não depender do dev local.
      command: ".venv\\Scripts\\python.exe -m uvicorn src.main:app --port 8001",
      cwd: "../backend",
      port: 8001,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: "sqlite:///./e2e_test.db",
        OPENAI_API_KEY: "",
        SEED_DEMO_DATA: "true",
        JWT_SECRET_KEY: "e2e-secret",
        FRONTEND_ORIGIN: "http://localhost:3100",
      },
    },
    {
      // Build de produção + start em porta isolada (evita o lock de instância única do `next dev`).
      command: "npm run build && npx next start --port 3100",
      port: 3100,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:8001/api/v1",
        NEXT_DISABLE_STANDALONE: "1",
      },
    },
  ],
});
