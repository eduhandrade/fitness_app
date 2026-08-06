import { test, expect } from "@playwright/test";
import { Client } from "pg";

const OWNER_EMAIL = process.env.SEED_USER_EMAIL!;
const OWNER_PASSWORD = process.env.SEED_USER_PASSWORD!;
const INVITE_CODE = process.env.SIGNUP_INVITE_CODE!;

const db = new Client({ connectionString: process.env.DATABASE_URL });

test.beforeAll(async () => {
  await db.connect();
});

test.afterAll(async () => {
  const { rows } = await db.query('SELECT id FROM "User" WHERE email LIKE $1', ["invite-e2e-%"]);
  for (const { id } of rows) {
    await db.query('DELETE FROM "Session" WHERE "userId" = $1', [id]);
  }
  await db.query('DELETE FROM "User" WHERE email LIKE $1', ["invite-e2e-%"]);
  await db.end();
});

test("Invite a friend copies a signup link that pre-fills the invite code", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  await page.goto("/profile");
  await page.getByRole("button", { name: "Invite a friend", exact: true }).click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(`http://localhost:3000/signup?code=${encodeURIComponent(INVITE_CODE)}`);

  // Follow the exact link as a logged-out visitor and confirm it pre-fills
  // the invite code and completes signup with no typing required.
  await context.clearCookies();
  await page.goto(clipboard);
  await expect(page.locator("#inviteCode")).toHaveValue(INVITE_CODE);

  const email = `invite-e2e-${Date.now()}@example.com`;
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");
});
