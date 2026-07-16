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
    // not throw when neither var is unset, or `postinstall` breaks builds
    // that only need the generated client.
    //
    // Migrations need a *direct* (unpooled) connection — `migrate deploy`
    // takes a Postgres advisory lock, which a pooled/PgBouncer connection
    // (like Neon's default DATABASE_URL) doesn't support and will time out
    // on (P1002). Set DIRECT_URL to the unpooled connection string in
    // production; falls back to DATABASE_URL for local dev, where there's
    // usually no pooler in front of Postgres anyway.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
