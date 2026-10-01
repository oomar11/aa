import { NextRequest, NextResponse } from "next/server";
import {
  SITE_SESSION_COOKIE,
  computeSiteSessionToken,
  timingSafeEqualStr,
} from "@/lib/site-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/api/login") {
    return NextResponse.next();
  }

  const password = process.env.AA_SITE_PASSWORD;
  if (!password) {
    // Fail closed: بدون باسورد مضبوط، امنع كل شيء بدل ما تسمح بالمرور.
    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          error: "الموقع غير مضبوط: أضف AA_SITE_PASSWORD في إعدادات السيرفر",
        },
        { status: 503 }
      );
    }
    if (pathname === "/login") return NextResponse.next();
    return new NextResponse(
      "الموقع غير مضبوط: أضف متغيّر AA_SITE_PASSWORD في إعدادات السيرفر.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const expected = await computeSiteSessionToken(password);
  const cookieValue = request.cookies.get(SITE_SESSION_COOKIE)?.value || "";
  const authorized =
    cookieValue.length > 0 && timingSafeEqualStr(cookieValue, expected);

  if (authorized) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      { ok: false, error: "يجب تسجيل الدخول" },
      { status: 401 }
    );
  }

  if (pathname === "/login") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|brand/|manifest\\.webmanifest|manifest\\.json|sw\\.js|favicon\\.ico|icon\\.png|apple-icon\\.png).*)",
  ],
};
