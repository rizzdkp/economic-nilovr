"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

/** Dashboard adalah Server Component; komponen kecil ini yang memicu refresh datanya. */
export function DashboardAutoRefresh() {
  const router = useRouter();
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useAutoRefresh(refresh);
  return null;
}
