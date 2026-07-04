"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ganti mode gelap/terang"
      className="flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-accent-soft hover:text-text-primary"
    >
      <IconSun size={20} stroke={1.75} className="hidden dark:block" />
      <IconMoon size={20} stroke={1.75} className="dark:hidden" />
    </button>
  );
}
