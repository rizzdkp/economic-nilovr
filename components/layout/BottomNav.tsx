"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 backdrop-blur-sm md:hidden">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
              active ? "text-accent" : "text-text-secondary",
            )}
          >
            <item.icon size={22} stroke={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
