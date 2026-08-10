import { NextRequest, NextResponse } from "next/server";
import { getOutboundStoreBridge } from "@/lib/store-bridge-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_PREFIXES = [
  "workshop/safes",
  "workshop/safe-movement",
  "workshop/invoices",
  "workshop/products",
  "workshop/issue",
  "workshop/parties/",
  "workshop/purchases",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

function sameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  // Same-origin fetch from older browsers may omit Origin; allow missing both.
  return true;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bridge = getOutboundStoreBridge();
  if (!bridge.configured) {
    return NextResponse.json(
      {
        error:
          "جسر المتجر غير مضبوط على السيرفر — أضف WORKSHOP_BRIDGE_SECRET و STORE_URL",
      },
      { status: 503 }
    );
  }

  const { path: parts } = await context.params;
  const subPath = (parts || []).join("/");
  if (!subPath || subPath.includes("..") || !isAllowedPath(subPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = `${bridge.storeUrl}/api/${subPath}${incoming.search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${bridge.secret}`,
    "x-workshop-bridge-secret": bridge.secret,
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/store-bridge proxy]", err);
    return NextResponse.json(
      { error: "تعذر الاتصال بالمتجر" },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxy(request, context);
}
