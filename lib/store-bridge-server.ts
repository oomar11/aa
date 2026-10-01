/**
 * Server-only outbound store bridge credentials.
 * Never import this module from Client Components.
 */

export const DEFAULT_STORE_URL = "https://store-system-rho.vercel.app";

/** Known leaked secrets — never accept even if still present in env. */
const REVOKED_BRIDGE_SECRETS = new Set([
  "windoor-workshop-bridge-2026-rho",
  "1b4b74a2b87fe142393377766ee5f1cf371e0296a3991e69",
]);

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function sanitizeSecret(raw: string): string {
  const secret = raw.trim();
  if (!secret || REVOKED_BRIDGE_SECRETS.has(secret)) return "";
  return secret;
}

export type OutboundStoreBridge = {
  configured: boolean;
  storeUrl: string;
  secret: string;
  source: "env" | "none";
};

export function getOutboundStoreBridge(): OutboundStoreBridge {
  const storeUrl = normalizeBaseUrl(
    process.env.STORE_URL ||
      process.env.NEXT_PUBLIC_STORE_URL ||
      DEFAULT_STORE_URL
  );

  const fromEnv = sanitizeSecret(
    process.env.WORKSHOP_BRIDGE_SECRET ||
      process.env.STORE_BRIDGE_SECRET ||
      process.env.STORE_WORKSHOP_BRIDGE_SECRET ||
      ""
  );
  if (fromEnv) {
    return { configured: true, storeUrl, secret: fromEnv, source: "env" };
  }

  return { configured: false, storeUrl, secret: "", source: "none" };
}
