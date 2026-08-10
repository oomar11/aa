import { NextResponse } from "next/server";
import { getOutboundStoreBridge } from "@/lib/store-bridge-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** هل جسر المتجر مضبوط على السيرفر؟ (بدون كشف المفتاح) */
export async function GET() {
  const bridge = getOutboundStoreBridge();
  return NextResponse.json({
    ok: true,
    configured: bridge.configured,
    mode: bridge.configured ? "server" : "manual",
    storeUrl: bridge.storeUrl,
    source: bridge.source,
  });
}
