import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // no .env file present (e.g. in CI where env vars are injected directly)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // `prisma generate` doesn't need a real connection string, only commands
    // that touch the database (migrate, db seed, studio) do — so this must
    // not throw when DATABASE_URL is unset, or `postinstall` breaks builds
    // that only need the generated client.
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
