import { test, expect } from "@playwright/test";
import { Client } from "pg";

const OWNER_EMAIL = process.env.SEED_USER_EMAIL!;
const OWNER_PASSWORD = process.env.SEED_USER_PASSWORD!;

const db = new Client({ connectionString: process.env.DATABASE_URL });

test.beforeAll(async () => {
  await db.connect();
});

test.afterAll(async () => {
  await db.end();
});

test("/setup recovers the owner's account and lets them log in", async ({ page }) => {
  // Simulate the exact lockout scenario: the stored passwordHash no longer
  // matches SEED_USER_PASSWORD (e.g. the env var was changed on the host
  // without re-running the seed). Login should fail beforehand...
  await db.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [
    "not-a-real-bcrypt-hash",
    OWNER_EMAIL,
  ]);

  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // ...and /setup, reachable from the login page, fixes it without a
  // terminal or DB access.
  await page.goto("/login");
  await page.getByRole("link", { name: "Recuperar acesso" }).click();
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByRole("button", { name: "Criar / redefinir minha conta" }).click();
  await expect(page.getByText(/pronta/)).toBeVisible({ timeout: 10_000 });

  await page.getByRole("link", { name: "Ir para o login" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");
});
