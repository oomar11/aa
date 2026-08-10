/**
 * Server-only outbound store bridge credentials.
 * Never import this module from Client Components.
 */

export const DEFAULT_STORE_URL = "https://store-system-rho.vercel.app";

const REVOKED_BRIDGE_SECRETS = new Set([
  "windoor-workshop-bridge-2026-rho",
]);

/**
 * Company production fallback so الورشة تفضل مربوطة بدون لصق مفتاح في المتصفح.
 * Override with WORKSHOP_BRIDGE_SECRET on Vercel when rotating.
 * Must stay server-only (API routes).
 */
const PRODUCTION_BRIDGE_SECRET_FALLBACK =
  "1b4b74a2b87fe142393377766ee5f1cf371e0296a3991e69";

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
  source: "env" | "fallback" | "none";
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

  const fallback = sanitizeSecret(PRODUCTION_BRIDGE_SECRET_FALLBACK);
  if (fallback) {
    return {
      configured: true,
      storeUrl,
      secret: fallback,
      source: "fallback",
    };
  }

  return { configured: false, storeUrl, secret: "", source: "none" };
}
