import { ROUTES } from "@/lib/routes";

const cls = "h-8 w-8";

export function MaterialHubIcon({ id }: { id: string }) {
  if (id === "profiles") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect x="6" y="8" width="10" height="24" rx="2" fill="currentColor" />
        <rect
          x="24"
          y="8"
          width="10"
          height="24"
          rx="2"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M16 12h8M16 20h8M16 28h8"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (id === "accessories") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <circle cx="20" cy="14" r="6" fill="currentColor" />
        <rect x="17" y="18" width="6" height="14" rx="2" fill="currentColor" />
        <circle cx="20" cy="14" r="2.5" fill="rgba(0,0,0,0.2)" />
      </svg>
    );
  }
  if (id === "glass") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect
          x="8"
          y="6"
          width="24"
          height="28"
          rx="3"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M12 10l16 20"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "mesh") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect
          x="7"
          y="7"
          width="26"
          height="26"
          rx="3"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M10 13h20M10 20h20M10 27h20M13 10v20M20 10v20M27 10v20"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
      <rect x="7" y="18" width="26" height="8" rx="1.5" fill="currentColor" />
      <rect
        x="10"
        y="10"
        width="6"
        height="20"
        rx="1"
        fill="currentColor"
        opacity="0.75"
      />
      <rect
        x="24"
        y="10"
        width="6"
        height="20"
        rx="1"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

/** روابط بطاقات صفحة الخامات */
export { ROUTES };
