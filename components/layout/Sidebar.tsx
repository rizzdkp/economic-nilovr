"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconWallet } from "@tabler/icons-react";
import { navItems } from "./nav-items";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="group sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-surface/60 py-6 transition-[width] duration-200 md:flex md:w-16 md:hover:w-60 lg:w-60">
      <div className="flex items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-white">
          <IconWallet size={20} stroke={1.75} />
        </div>
        <span className="hidden whitespace-nowrap text-base font-semibold text-text-primary md:group-hover:inline lg:inline">
          Catatan Keuangan
        </span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-accent-soft hover:text-text-primary",
              )}
            >
              <item.icon size={20} stroke={1.75} className="shrink-0" />
              <span className="hidden whitespace-nowrap md:group-hover:inline lg:inline">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-1 px-3">
        <div className="hidden md:group-hover:block lg:block">
          <LogoutButton />
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
