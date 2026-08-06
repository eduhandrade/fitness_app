import { test, expect } from "@playwright/test";
import { Client } from "pg";

const OWNER_EMAIL = process.env.SEED_USER_EMAIL!;
const OWNER_PASSWORD = process.env.SEED_USER_PASSWORD!;
const INVITE_CODE = process.env.SIGNUP_INVITE_CODE!;
// An implausible weight value used only as a unique marker to prove data
// isolation between accounts — not a real body metric.
const MARKER_WEIGHT = 70.77;

// Raw `pg` (not the generated Prisma client, which is ESM-only via
// import.meta and doesn't load under Playwright's test transform) for
// direct DB fixture setup/teardown and assertions the UI alone can't make
// (e.g. "no row was created").
const db = new Client({ connectionString: process.env.DATABASE_URL });

test.beforeAll(async () => {
  await db.connect();
  const { rows } = await db.query('SELECT id FROM "User" WHERE email = $1', [OWNER_EMAIL]);
  const ownerId = rows[0].id as string;
  await db.query(
    `INSERT INTO "BodyMetric" (id, "userId", date, "weightKg", "createdAt")
     VALUES (gen_random_uuid()::text, $1, '2020-01-01T00:00:00.000Z', $2, now())
     ON CONFLICT ("userId", date) DO UPDATE SET "weightKg" = $2`,
    [ownerId, MARKER_WEIGHT]
  );
});

test.afterAll(async () => {
  await db.query('DELETE FROM "BodyMetric" WHERE "weightKg" = $1', [MARKER_WEIGHT]);
  const { rows } = await db.query('SELECT id FROM "User" WHERE email LIKE $1', ["e2e-test-%"]);
  for (const { id } of rows) {
    await db.query('DELETE FROM "Session" WHERE "userId" = $1', [id]);
  }
  await db.query('DELETE FROM "User" WHERE email LIKE $1', ["e2e-test-%"]);
  await db.end();
});

async function findUserByEmail(email: string) {
  const { rows } = await db.query('SELECT id, "passwordHash" FROM "User" WHERE email = $1', [email]);
  return rows[0] as { id: string; passwordHash: string } | undefined;
}

test("unauthenticated access to (app) routes redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong invite code is rejected on signup", async ({ page }) => {
  const email = `e2e-test-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.fill("#inviteCode", "definitely-wrong-code");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText("Código de convite inválido.")).toBeVisible();

  expect(await findUserByEmail(email)).toBeUndefined();
});

test("correct invite code creates an isolated new account", async ({ page, context }) => {
  const email = `e2e-test-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.fill("#inviteCode", INVITE_CODE);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/");

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === "trivo_session");
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");

  const created = await findUserByEmail(email);
  expect(created).toBeDefined();
  expect(created?.passwordHash).not.toBe("correcthorsebattery");
});

test("new account sees no data from the owner", async ({ page }) => {
  const email = `e2e-test-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.fill("#inviteCode", INVITE_CODE);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  await page.goto("/body");
  await expect(page.locator("body")).not.toContainText(String(MARKER_WEIGHT));
});

test("logout clears access", async ({ page }) => {
  const email = `e2e-test-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.fill("#inviteCode", INVITE_CODE);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  await page.getByLabel("More").click();
  await page.getByRole("menuitem", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("owner's existing credentials still log them into their existing data", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/");

  await page.goto("/body");
  await expect(page.locator("body")).toContainText(String(MARKER_WEIGHT));
});
