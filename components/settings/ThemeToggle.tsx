"use client";

import { useTheme } from "@/components/settings/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-300 hover:bg-primary-soft"
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1zm0 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.5-2.5a1 1 0 1 1 0-2H21a1 1 0 1 1 0 2h-1.5zM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zM4.93 6.34a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41L4.93 7.75a1 1 0 0 1 0-1.41zM16.6 16.6a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41L16.6 18a1 1 0 0 1 0-1.41zM3 12a1 1 0 0 1 1-1h1.5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm13.66-5.66a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41l1.06-1.06a1 1 0 0 1 1.41 0zM7.75 16.6a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41L6.34 16.6a1 1 0 0 1 1.41 0z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M21 14.3A8.5 8.5 0 0 1 9.7 3a7 7 0 1 0 11.3 11.3z" />
        </svg>
      )}
    </button>
  );
}
