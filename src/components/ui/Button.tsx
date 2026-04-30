"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "danger" | "success";

export function Button(
  props: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: Variant;
      fullWidth?: boolean;
    }
  >
) {
  const {
    variant = "secondary",
    fullWidth,
    className,
    children,
    ...rest
  } = props;

  const variantClass =
    variant === "primary"
      ? "btnPrimary"
      : variant === "danger"
        ? "btnDanger"
        : variant === "success"
          ? "btnSuccess"
          : "btnSecondary";

  return (
    <button
      className={[
        variantClass,
        fullWidth ? "wFull" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

