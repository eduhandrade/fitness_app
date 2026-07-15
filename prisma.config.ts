import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // no .env file present (e.g. in CI where env vars are injected directly)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
