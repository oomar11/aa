/**
 * جلسة باسورد الموقع المشترك — تحقق بسيط بدون قاعدة بيانات.
 * الكوكي بتخزن HMAC للباسورد مش الباسورد نفسه.
 */

export const SITE_SESSION_COOKIE = "aa_session";
const SESSION_MESSAGE = "aa-workshop-session-v1";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeSiteSessionToken(
  password: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(SESSION_MESSAGE)
  );
  return toHex(sig);
}

/** مقارنة زمن ثابت تقريبي — كافية لباسورد مشترك واحد. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  // لا نرجع بدري عند اختلاف الطول (بيسرّب طول الباسورد)
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
