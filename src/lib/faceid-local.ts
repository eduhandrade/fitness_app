/**
 * Whether *this specific browser* has ever completed passkey registration,
 * and whether it's dismissed the "enable Face ID" prompt. Both are
 * per-device by nature (a passkey lives on the device that created it), so
 * localStorage — not the server — is the right place to track them. This
 * is what lets /login only offer "Entrar com Face ID" on a device that can
 * actually complete the ceremony, instead of triggering the browser's
 * confusing generic "no passkeys saved" fallback dialog on a device that
 * was never enrolled.
 */
const ENABLED_KEY = "trivo_faceid_enabled";
const DISMISSED_KEY = "trivo_faceid_prompt_dismissed";

export function isFaceIdEnabledLocally(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function markFaceIdEnabledLocally(): void {
  localStorage.setItem(ENABLED_KEY, "1");
}

export function clearFaceIdEnabledLocally(): void {
  localStorage.removeItem(ENABLED_KEY);
}

export function isFaceIdPromptDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

export function dismissFaceIdPromptLocally(): void {
  localStorage.setItem(DISMISSED_KEY, "1");
}
