"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ar } from "@/lib/i18n";

export function TopBar(props: { right?: ReactNode }) {
  const { right } = props;
  const pathname = usePathname();
  const step =
    pathname === "/"
      ? ar.steps.registration
      : pathname === "/questions"
        ? ar.steps.questions
        : pathname === "/guess"
          ? ar.steps.guessing
          : pathname === "/waiting"
            ? ar.steps.waiting
            : pathname === "/results"
              ? ar.steps.results
              : pathname === "/admin"
                ? ar.steps.admin
                : ar.steps.game;

  return (
    <div className="topbar">
      <div className="topbarInner">
        <div className="brand">
          <div className="brandTitle">{ar.appName}</div>
          <div className="brandSub">{step}</div>
        </div>
        <div className="right">{right}</div>
      </div>
    </div>
  );
}

