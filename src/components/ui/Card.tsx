import type { PropsWithChildren } from "react";

export function Card(
  props: PropsWithChildren<{ className?: string; tone?: "default" | "soft" }>
) {
  const { className, children, tone = "default" } = props;
  const base = tone === "soft" ? "cardSoft" : "card";
  return <div className={[base, className].filter(Boolean).join(" ")}>{children}</div>;
}

