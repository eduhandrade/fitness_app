import { test, expect } from "@playwright/test";
import { Client } from "pg";

const OWNER_EMAIL = process.env.SEED_USER_EMAIL!;
const OWNER_PASSWORD = process.env.SEED_USER_PASSWORD!;

const db = new Client({ connectionString: process.env.DATABASE_URL });

test.beforeAll(async () => {
  await db.connect();
});

test.afterAll(async () => {
  await db.query(
    'DELETE FROM "Passkey" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)',
    [OWNER_EMAIL]
  );
  await db.query('DELETE FROM "Session" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)', [
    OWNER_EMAIL,
  ]);
  await db.end();
});

async function ownerPasskeyCount(): Promise<number> {
  const { rows } = await db.query(
    'SELECT count(*)::int AS count FROM "Passkey" p JOIN "User" u ON u.id = p."userId" WHERE u.email = $1',
    [OWNER_EMAIL]
  );
  return rows[0].count as number;
}

test("register a passkey, log out, and log back in with it", async ({ page, context }) => {
  // Chrome's virtual authenticator stands in for a real Face ID sensor —
  // there's no biometric hardware in this sandbox, but the WebAuthn
  // ceremony (challenge/signature/counter) is real end to end.
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  // Log in normally first — enrolling a passkey requires an existing session.
  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  const before = await ownerPasskeyCount();

  await page.goto("/settings");
  await expect(page.getByText("Face ID/biometria não está disponível")).toHaveCount(0, {
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Adicionar Face ID neste dispositivo" }).click();

  await expect(page.getByText(/Adicionado em/)).toBeVisible({ timeout: 10_000 });
  expect(await ownerPasskeyCount()).toBe(before + 1);

  // Log out, then log back in using only the passkey — no password typed.
  await page.getByLabel("More").click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("button", { name: "Entrar com Face ID" }).click();
  await expect(page).toHaveURL("/", { timeout: 10_000 });

  // Confirm it's a real, working session on the owner's own account/data by
  // navigating to an authenticated page.
  await page.goto("/settings");
  await expect(page).toHaveURL("/settings");

  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});

test("home page offers to enable Face ID right after a password login", async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto("/login");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/");

  const before = await ownerPasskeyCount();

  await expect(page.getByText("Ativar Face ID neste dispositivo")).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Ativar Face ID" }).click();
  await expect(page.getByText("Face ID ativado!")).toBeVisible({ timeout: 10_000 });
  expect(await ownerPasskeyCount()).toBe(before + 1);

  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});

test("a device that never registered a passkey never sees the Face ID login button", async ({
  page,
}) => {
  // No localStorage flag set, no virtual authenticator wired up — this
  // simulates a brand-new device/browser. Even if the account has passkeys
  // registered elsewhere, this device shouldn't offer a button that would
  // only trigger the browser's confusing "no passkeys here" fallback sheet.
  await page.goto("/login");
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: "Entrar com Face ID" })).toHaveCount(0);
});
