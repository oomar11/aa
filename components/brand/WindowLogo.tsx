type WindowLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-12 w-12",
} as const;

/** ختم الوهيدي (هوية الشركة) — بنفس الاسم القديم عشان باقي الشاشات متتغيرش. */
export function WindowLogo({ className = "", size = "md" }: WindowLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/stamp.png"
      alt=""
      aria-hidden
      className={`shrink-0 rounded-full ${SIZE_MAP[size]} ${className}`}
    />
  );
}
