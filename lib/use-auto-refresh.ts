"use client";

import { useEffect } from "react";

/**
 * Muat ulang data saat tab kembali fokus + polling ringan saat tab terlihat,
 * supaya perangkat lain (pemakai kedua) melihat perubahan tanpa reload manual.
 */
export function useAutoRefresh(refresh: () => void, intervalMs = 30000) {
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [refresh, intervalMs]);
}
