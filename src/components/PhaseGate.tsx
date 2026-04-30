"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { GamePhase } from "@/lib/types";
import { phaseToPath } from "@/lib/routing";

export function PhaseGate(props: { phase: GamePhase; allow: GamePhase[] }) {
  const { phase, allow } = props;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (allow.includes(phase)) return;
    const target = phaseToPath(phase);
    if (pathname !== target) router.replace(target);
  }, [phase, allow, router, pathname]);

  return null;
}

