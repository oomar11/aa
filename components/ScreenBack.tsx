import type { ComponentProps, ReactNode } from "react";
import { BackChevron } from "@/components/BackChevron";
import { NavBack } from "@/components/NavBack";

type NavBackProps = ComponentProps<typeof NavBack>;

type TextProps = NavBackProps & {
  variant?: "text";
  children: ReactNode;
};

type IconProps = Omit<NavBackProps, "children"> & {
  variant: "icon";
  "aria-label": string;
};

type Props = TextProps | IconProps;

const textClassName =
  "inline-flex items-center gap-1 text-sm font-medium text-primary";

const iconClassName =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft";

/**
 * Standard in-app back control — always aligned to inline-start (right in RTL).
 */
export function ScreenBack(props: Props) {
  if (props.variant === "icon") {
    const { className, ...rest } = props;
    return (
      <NavBack
        className={className ? `${iconClassName} ${className}` : iconClassName}
        {...rest}
      >
        <BackChevron />
      </NavBack>
    );
  }

  const { children, className, ...rest } = props;
  return (
    <NavBack
      className={className ? `${textClassName} ${className}` : textClassName}
      {...rest}
    >
      <BackChevron className="h-4 w-4 shrink-0" />
      {children}
    </NavBack>
  );
}
