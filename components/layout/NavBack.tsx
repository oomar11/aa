"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

type LinkProps = Omit<ComponentProps<typeof Link>, "href" | "replace" | "onClick">;

type Props = LinkProps & {
  /** Parent / fallback URL when leaving this screen. */
  href: string;
  children: ReactNode;
  /**
   * - `replace` (default): hierarchical “up” — swaps the current entry so
   *   browser Back cannot bounce between parent and child.
   * - `back`: use real history when available, otherwise fall back to `href`.
   */
  mode?: "replace" | "back";
};

/**
 * In-app “رجوع” control that does not push a new history entry.
 * Prefer this over a plain Link whenever the label means “go up / go back”.
 */
export function NavBack({
  href,
  children,
  mode = "replace",
  ...rest
}: Props) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    e.preventDefault();

    if (mode === "back" && typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(href);
  }

  return (
    <Link href={href} replace onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
