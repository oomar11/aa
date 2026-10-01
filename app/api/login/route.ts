import { NextRequest, NextResponse } from "next/server";
import {
  SITE_SESSION_COOKIE,
  computeSiteSessionToken,
  timingSafeEqualStr,
} from "@/lib/site-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Best-effort brute-force throttle (per server instance; serverless instances
// don't share memory, so this slows attacks but is not a hard guarantee).
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; first: number }>();

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

function isLimited(key: string): boolean {
  const entry = fails.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    fails.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILS;
}

function recordFail(key: string) {
  const entry = fails.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    fails.set(key, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  if (isLimited(key)) {
    return NextResponse.json(
      { ok: false, error: "محاولات كتير — حاول بعد ١٥ دقيقة" },
      { status: 429 }
    );
  }
  const password = process.env.AA_SITE_PASSWORD;
  if (!password) {
    return NextResponse.json(
      {
        ok: false,
        error: "الموقع غير مضبوط: أضف AA_SITE_PASSWORD في إعدادات السيرفر",
      },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "طلب غير صالح" },
      { status: 400 }
    );
  }

  const submitted = String(body?.password || "");
  if (!submitted || !timingSafeEqualStr(submitted, password)) {
    recordFail(key);
    return NextResponse.json(
      { ok: false, error: "الباسورد غير صحيح" },
      { status: 401 }
    );
  }

  const token = await computeSiteSessionToken(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
