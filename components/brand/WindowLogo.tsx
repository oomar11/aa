type WindowLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4", radius: "rounded-md" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", radius: "rounded-lg" },
  lg: { box: "h-12 w-12", icon: "h-7 w-7", radius: "rounded-xl" },
} as const;

/** Brand mark: blue tile + twin window panes (matches PWA icons). */
export function WindowLogo({ className = "", size = "md" }: WindowLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-primary shadow-sm ${s.box} ${s.radius} ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={`${s.icon} text-primary-foreground`}
        fill="none"
      >
        <rect x="4" y="3" width="7" height="18" rx="1.5" fill="currentColor" />
        <rect x="13" y="3" width="7" height="18" rx="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}
