"use client";

import { useEffect, useRef } from "react";

/**
 * Muat ulang data saat tab kembali fokus + polling ringan saat tab terlihat,
 * supaya perangkat lain (pemakai kedua) melihat perubahan tanpa reload manual.
 */
export function useAutoRefresh(refresh: () => void, intervalMs = 30000) {
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip refresh on initial mount — prevents flash when navigating between pages
    mountedRef.current = false;
    const initTimer = setTimeout(() => {
      mountedRef.current = true;
    }, 500);

    function onVisible() {
      if (document.visibilityState === "visible" && mountedRef.current) {
        refresh();
      }
    }

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        refresh();
      }
    }, intervalMs);

    return () => {
      clearTimeout(initTimer);
      mountedRef.current = false;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [refresh, intervalMs]);
}
