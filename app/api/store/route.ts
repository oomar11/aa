import { NextResponse } from "next/server";
import {
  getDatabaseEnvPresence,
  getWorkshopStoreBackend,
  isWorkshopStoreDurable,
  patchWorkshopStore,
  readWorkshopStore,
  replaceWorkshopStore,
  workshopStoreHasData,
} from "@/lib/storage/server-store";
import { SHARED_STORAGE_KEYS } from "@/lib/storage/keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** حالة المخزن — هل فيه بيانات وأي باكند مستخدم */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    if (mode === "status") {
      const snapshot = await readWorkshopStore();
      return NextResponse.json({
        ok: true,
        backend: snapshot.backend,
        durable: snapshot.durable,
        revision: snapshot.revision,
        updatedAt: snapshot.updatedAt,
        hasData: workshopStoreHasData(snapshot),
        keys: SHARED_STORAGE_KEYS,
        databaseEnv: getDatabaseEnvPresence(),
      });
    }

    const snapshot = await readWorkshopStore();
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === String(snapshot.revision)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: String(snapshot.revision),
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        revision: snapshot.revision,
        updatedAt: snapshot.updatedAt,
        backend: snapshot.backend,
        durable: snapshot.durable,
        hasData: workshopStoreHasData(snapshot),
        data: snapshot.data,
      },
      {
        headers: {
          ETag: String(snapshot.revision),
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[api/store GET]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "تعذر قراءة قاعدة بيانات الورشة",
        backend: getWorkshopStoreBackend(),
        durable: isWorkshopStoreDurable(),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: دمج مفاتيح (تحديث جزئي)
 * PUT: استبدال كامل لكل المفاتيح المشتركة
 * body: { data: Record<string, string | null> }
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      data?: Record<string, string | null>;
    };
    if (!body?.data || typeof body.data !== "object") {
      return NextResponse.json(
        { ok: false, error: "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const snapshot = await patchWorkshopStore(body.data);
    return NextResponse.json({
      ok: true,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
      backend: snapshot.backend,
      durable: snapshot.durable,
      hasData: workshopStoreHasData(snapshot),
      data: snapshot.data,
    });
  } catch (error) {
    console.error("[api/store PATCH]", error);
    return NextResponse.json(
      { ok: false, error: "تعذر حفظ بيانات الورشة" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      data?: Record<string, string | null>;
    };
    if (!body?.data || typeof body.data !== "object") {
      return NextResponse.json(
        { ok: false, error: "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const snapshot = await replaceWorkshopStore(body.data);
    return NextResponse.json({
      ok: true,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
      backend: snapshot.backend,
      durable: snapshot.durable,
      hasData: workshopStoreHasData(snapshot),
      data: snapshot.data,
    });
  } catch (error) {
    console.error("[api/store PUT]", error);
    return NextResponse.json(
      { ok: false, error: "تعذر استبدال بيانات الورشة" },
      { status: 500 }
    );
  }
}
