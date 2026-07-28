import Link from "next/link";

function DesignIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-hidden>
      <path d="M28 8l8 4-16 30-9-4.5L28 8z" fill="currentColor" />
      <path d="M36 12l5 11-6-3 1-8z" fill="currentColor" opacity="0.65" />
      <rect
        x="6"
        y="34"
        width="26"
        height="7"
        rx="1.5"
        transform="rotate(-28 6 34)"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M10 38.5l2.5-1.4M14 36.3l2.5-1.4M18 34.1l2.5-1.4"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-hidden>
      <rect x="11" y="8" width="20" height="28" rx="3" fill="currentColor" />
      <path
        d="M16 16h10M16 21h8M16 26h6"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="30" cy="32" r="9" fill="currentColor" />
      <circle
        cx="30"
        cy="32"
        r="4.5"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="2.2"
      />
      <path
        d="M33.8 35.8L37 39"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-hidden>
      <rect x="8" y="10" width="12" height="28" rx="2.5" fill="currentColor" />
      <rect
        x="28"
        y="10"
        width="12"
        height="28"
        rx="2.5"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M20 16h8M20 24h8M20 32h8"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const baseCard =
  "flex min-h-[176px] flex-col items-center justify-center gap-4 rounded-2xl p-5 text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]";

export function HomeActions() {
  return (
    <section className="grid grid-cols-2 gap-3 px-4 pt-2">
      <Link
        href="/design"
        className={`${baseCard} bg-[#E8956F] shadow-[0_6px_20px_rgba(232,149,111,0.35)]`}
      >
        <DesignIcon />
        <span className="text-base font-semibold">بدء التصميم</span>
      </Link>

      <Link
        href="/orders"
        className={`${baseCard} bg-[#6B8AD8] shadow-[0_6px_20px_rgba(107,138,216,0.35)]`}
      >
        <OrdersIcon />
        <span className="text-base font-semibold">الطلبات</span>
      </Link>

      <Link
        href="/materials"
        className={`${baseCard} col-span-2 min-h-[132px] flex-row gap-5 bg-[#5A9B8E] shadow-[0_6px_20px_rgba(90,155,142,0.35)] sm:min-h-[148px]`}
      >
        <MaterialsIcon />
        <div className="text-right">
          <span className="block text-base font-semibold">خامات</span>
          <span className="mt-0.5 block text-xs font-medium text-white/80">
            قطاعات · اكسسوار · زجاج · حديد
          </span>
        </div>
      </Link>
    </section>
  );
}
