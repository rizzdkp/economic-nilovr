"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";

interface LogoutButtonProps {
  variant?: "sidebar" | "icon";
}

export function LogoutButton({ variant = "sidebar" }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        aria-label="Keluar"
        className="flex h-11 w-11 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-accent-soft hover:text-danger disabled:opacity-50"
      >
        <IconLogout size={20} stroke={1.75} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-accent-soft hover:text-danger disabled:opacity-50"
    >
      <IconLogout size={20} stroke={1.75} />
      <span className="group-data-[collapsed=true]:hidden">Keluar</span>
    </button>
  );
}
