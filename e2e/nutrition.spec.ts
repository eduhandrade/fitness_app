import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const OWNER_EMAIL = process.env.SEED_USER_EMAIL!;
const OWNER_PASSWORD = process.env.SEED_USER_PASSWORD!;
const INVITE_CODE = process.env.SIGNUP_INVITE_CODE!;
// Implausible weight used only as a fixture value for the owner's profile,
// distinct from any other spec's marker values.
const FIXTURE_WEIGHT_KG = 82.3;

// Raw `pg` — the generated Prisma client is ESM-only via import.meta and
// doesn't load under Playwright's test transform.
const db = new Client({ connectionString: process.env.DATABASE_URL });

async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");
}

let ownerId: string;

test.beforeAll(async () => {
  await db.connect();
  const { rows } = await db.query('SELECT id FROM "User" WHERE email = $1', [OWNER_EMAIL]);
  ownerId = rows[0].id as string;

  await db.query(
    `INSERT INTO "Profile" (id, "userId", "heightCm", "dateOfBirth", sex, "activityLevel", units, "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 180, '1990-01-01T00:00:00.000Z', 'MALE', 'MODERATE', 'metric', now())
     ON CONFLICT ("userId") DO UPDATE SET
       "heightCm" = 180, "dateOfBirth" = '1990-01-01T00:00:00.000Z',
       sex = 'MALE', "activityLevel" = 'MODERATE'`,
    [ownerId]
  );

  const today = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  await db.query(
    `INSERT INTO "BodyMetric" (id, "userId", date, "weightKg", "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, now())
     ON CONFLICT ("userId", date) DO UPDATE SET "weightKg" = $3`,
    [ownerId, today, FIXTURE_WEIGHT_KG]
  );
});

test.afterAll(async () => {
  await db.query('DELETE FROM "WeightGoal" WHERE "userId" = $1', [ownerId]);
  await db.query('DELETE FROM "FoodEntry" WHERE "userId" = $1', [ownerId]);
  const today = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  await db.query('DELETE FROM "BodyMetric" WHERE "userId" = $1 AND date = $2', [
    ownerId,
    today,
  ]);

  const { rows } = await db.query('SELECT id FROM "User" WHERE email LIKE $1', [
    "nutrition-e2e-%",
  ]);
  for (const { id } of rows) {
    await db.query('DELETE FROM "Session" WHERE "userId" = $1', [id]);
  }
  await db.query('DELETE FROM "User" WHERE email LIKE $1', ["nutrition-e2e-%"]);
  await db.end();
});

test("a fresh account without height/DOB can't create a goal", async ({ page }) => {
  const email = `nutrition-e2e-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "correcthorsebattery");
  await page.fill("#inviteCode", INVITE_CODE);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  await page.goto("/nutrition");
  await page.fill("#goalWeightKg", "70");
  await page.fill("#weeklyRateKg", "-0.3");
  await page.click('button:has-text("Set goal")');

  await expect(
    page.getByText("Complete your height and date of birth in Profile")
  ).toBeVisible();
});

test("weekly rate beyond the ±1kg/week cap is rejected", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/nutrition");

  await page.fill("#goalWeightKg", "75");
  // Bypass the input's own max="1" so the request actually reaches the
  // server, proving the zod schema (not just client-side UX) enforces the cap.
  await page.evaluate(() => {
    document.getElementById("weeklyRateKg")?.removeAttribute("max");
  });
  await page.fill("#weeklyRateKg", "5");
  await page.click('button:has-text("Set goal")');

  await expect(page.locator("p.text-danger")).toBeVisible();
  const { rows } = await db.query(
    'SELECT count(*)::int AS count FROM "WeightGoal" WHERE "userId" = $1 AND status = $2',
    [ownerId, "ACTIVE"]
  );
  expect(rows[0].count).toBe(0);
});

test("create a weight goal and see the progress chart + daily target", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/nutrition");

  await page.fill("#goalWeightKg", "75");
  await page.fill("#weeklyRateKg", "-0.3");
  await page.click('button:has-text("Set goal")');

  await expect(page.getByText("75 kg")).toBeVisible();
  await expect(page.getByText(/kcal$/).first()).toBeVisible();
  await expect(page.getByText("End goal")).toBeVisible();

  const { rows } = await db.query(
    'SELECT "dailyCalorieTarget", "targetDate" FROM "WeightGoal" WHERE "userId" = $1 AND status = $2',
    [ownerId, "ACTIVE"]
  );
  expect(rows.length).toBe(1);
  expect(rows[0].dailyCalorieTarget).toBeGreaterThan(0);
});

// The actual search UI calls Open Food Facts from the *server* (a Server
// Action's own fetch), which page.route() cannot intercept — that only
// mocks browser-initiated requests. This sandbox's outbound proxy also
// hard-blocks the real Open Food Facts hosts (confirmed during planning),
// so the live search path genuinely can't be exercised end-to-end here.
// What IS fully verifiable without network: the diary's display/grouping/
// subtotal/delete logic (seed a FoodEntry directly, as if search+log had
// already happened) and the search UI's own error handling, which this
// environment exercises for real every time (the fetch really does fail).

test("today's diary groups entries by meal with per-meal subtotals, and delete works", async ({
  page,
}) => {
  await db.query(
    `INSERT INTO "FoodEntry"
       (id, "userId", date, meal, name, brand, quantity, unit, grams, calories, "proteinG", "carbsG", "fatG", "createdAt")
     VALUES
       (gen_random_uuid()::text, $1, date_trunc('day', now()), 'LUNCH', 'Test Banana', 'TestBrand', 100, 'GRAM', 100, 89, 1.1, 22.8, 0.3, now())`,
    [ownerId]
  );

  await loginAsOwner(page);
  await page.goto("/nutrition");

  await expect(page.getByText("Lunch")).toBeVisible();
  await expect(page.getByText("Test Banana")).toBeVisible();
  await expect(page.getByText("100 g · 89 kcal · TestBrand")).toBeVisible();
  await expect(page.getByText("89 kcal", { exact: true })).toBeVisible(); // meal subtotal

  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(page.getByText("No food logged today yet")).toBeVisible();

  const { rows } = await db.query('SELECT count(*)::int AS count FROM "FoodEntry" WHERE "userId" = $1', [
    ownerId,
  ]);
  expect(rows[0].count).toBe(0);
});

test("food search surfaces a clean error when the food database is unreachable", async ({
  page,
}) => {
  await loginAsOwner(page);
  await page.goto("/nutrition");

  await page.fill("#foodSearch", "banana");
  await page.click('button:has-text("Search")');

  // This sandbox's network policy blocks Open Food Facts outright, so this
  // assertion is exercising the real failure path, not a simulated one.
  await expect(page.getByText("Couldn't reach the food database")).toBeVisible({
    timeout: 15_000,
  });
});

test("Nutrition is reachable from the \"•••\" menu and the Body page teaser", async ({
  page,
}) => {
  await loginAsOwner(page);

  await page.getByLabel("More").click();
  await page.getByRole("menuitem", { name: "Nutrition" }).click();
  await expect(page).toHaveURL("/nutrition");

  await page.goto("/body");
  await page.getByRole("link", { name: "View nutrition →" }).click();
  await expect(page).toHaveURL("/nutrition");
});
