/**
 * اختيار جهة اتصال من دفتر الهاتف عبر Contact Picker API
 * (مدعوم أساساً على Chrome Android في سياق آمن HTTPS).
 */

export type PickedContact = {
  name: string;
  phone: string;
  address?: string;
};

type ContactAddressLike = {
  addressLine?: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

type ContactInfoLike = {
  name?: string[];
  tel?: string[];
  address?: ContactAddressLike[];
};

type ContactsManagerLike = {
  select: (
    properties: string[],
    options?: { multiple?: boolean }
  ) => Promise<ContactInfoLike[]>;
  getProperties?: () => Promise<string[]>;
};

type NavigatorWithContacts = Navigator & {
  contacts?: ContactsManagerLike;
};

function getContactsManager(): ContactsManagerLike | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }
  const nav = navigator as NavigatorWithContacts;
  if (!nav.contacts || typeof nav.contacts.select !== "function") {
    return null;
  }
  return nav.contacts;
}

/** هل يدعم المتصفح اختيار جهات الاتصال؟ */
export function isContactPickerSupported(): boolean {
  return getContactsManager() !== null;
}

/** تنظيف رقم الهاتف من رموز وفراغات مع الإبقاء على + في البداية إن وُجد */
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

function pickBestPhone(tels: string[] | undefined): string {
  if (!tels?.length) return "";
  const normalized = tels
    .map((t) => normalizePhoneNumber(t))
    .filter(Boolean);
  if (!normalized.length) return "";

  // تفضيل أرقام الموبايل المصرية (01…) أو الدولية +20…
  const mobile = normalized.find(
    (n) =>
      /^01\d{8,9}$/.test(n) ||
      /^\+201\d{8,9}$/.test(n) ||
      /^201\d{8,9}$/.test(n)
  );
  return mobile ?? normalized[0];
}

function formatAddress(addr: ContactAddressLike | undefined): string | undefined {
  if (!addr) return undefined;
  const parts = [
    ...(addr.addressLine ?? []),
    addr.city,
    addr.region,
    addr.postalCode,
    addr.country,
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  return parts.join("، ");
}

export type PickContactResult =
  | { ok: true; contact: PickedContact }
  | { ok: false; reason: "unsupported" | "cancelled" | "empty" | "failed"; message: string };

/**
 * يفتح نافذة اختيار جهة اتصال ويملأ الاسم والهاتف (والعنوان إن وُجد).
 */
export async function pickContactFromDevice(): Promise<PickContactResult> {
  const contacts = getContactsManager();
  if (!contacts) {
    return {
      ok: false,
      reason: "unsupported",
      message:
        "اختيار جهات الاتصال غير متاح على هذا المتصفح. جرّب Chrome على أندرويد.",
    };
  }

  try {
    let properties = ["name", "tel"];
    if (typeof contacts.getProperties === "function") {
      try {
        const available = await contacts.getProperties();
        properties = ["name", "tel"].filter((p) => available.includes(p));
        if (available.includes("address")) properties.push("address");
      } catch {
        /* نستخدم الخصائص الافتراضية */
      }
    }

    if (!properties.includes("name") || !properties.includes("tel")) {
      return {
        ok: false,
        reason: "unsupported",
        message: "المتصفح لا يدعم قراءة الاسم ورقم الهاتف من جهات الاتصال.",
      };
    }

    const selected = await contacts.select(properties, { multiple: false });
    if (!selected?.length) {
      return {
        ok: false,
        reason: "cancelled",
        message: "لم يتم اختيار جهة اتصال",
      };
    }

    const entry = selected[0];
    const name = (entry.name ?? []).map((n) => n.trim()).filter(Boolean).join(" ");
    const phone = pickBestPhone(entry.tel);
    const address = formatAddress(entry.address?.[0]);

    if (!name && !phone) {
      return {
        ok: false,
        reason: "empty",
        message: "جهة الاتصال لا تحتوي على اسم أو رقم هاتف",
      };
    }

    return {
      ok: true,
      contact: {
        name: name || "بدون اسم",
        phone,
        address,
      },
    };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: unknown }).name)
        : "";
    if (name === "AbortError" || name === "NotAllowedError") {
      return {
        ok: false,
        reason: "cancelled",
        message: "تم إلغاء اختيار جهة الاتصال",
      };
    }
    return {
      ok: false,
      reason: "failed",
      message: "تعذر فتح جهات الاتصال. تأكد أن الصفحة تعمل عبر HTTPS.",
    };
  }
}
