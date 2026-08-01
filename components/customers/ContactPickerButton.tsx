"use client";

type Props = {
  label: string;
  loadingLabel?: string;
  picking: boolean;
  onPick: () => void;
};

export function ContactPickerButton({
  label,
  loadingLabel = "جاري الاختيار…",
  picking,
  onPick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={picking}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft text-sm font-semibold text-primary transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path
          d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5ZM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z"
          strokeLinecap="round"
        />
        <path
          d="M8.5 14h-.8C5.3 14 3 16.24 3 19v1h10v-1c0-1.4.58-2.66 1.5-3.54"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.2 14c2.5.1 4.8 2.2 4.8 5v1h-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {picking ? loadingLabel : label}
    </button>
  );
}
