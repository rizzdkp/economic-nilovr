"use client";

import {
  IconToolsKitchen2, IconCar, IconFileInvoice, IconShoppingBag, IconHeartbeat,
  IconMovie, IconBook, IconDots, IconWallet, IconGift, IconBriefcase, IconChartLine,
  IconHome, IconPaw, IconPlane, IconDeviceGamepad2,
  type Icon,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

export const ICON_OPTIONS: { name: string; icon: Icon }[] = [
  { name: "IconToolsKitchen2", icon: IconToolsKitchen2 },
  { name: "IconCar", icon: IconCar },
  { name: "IconFileInvoice", icon: IconFileInvoice },
  { name: "IconShoppingBag", icon: IconShoppingBag },
  { name: "IconHeartbeat", icon: IconHeartbeat },
  { name: "IconMovie", icon: IconMovie },
  { name: "IconBook", icon: IconBook },
  { name: "IconWallet", icon: IconWallet },
  { name: "IconGift", icon: IconGift },
  { name: "IconBriefcase", icon: IconBriefcase },
  { name: "IconChartLine", icon: IconChartLine },
  { name: "IconHome", icon: IconHome },
  { name: "IconPaw", icon: IconPaw },
  { name: "IconPlane", icon: IconPlane },
  { name: "IconDeviceGamepad2", icon: IconDeviceGamepad2 },
  { name: "IconDots", icon: IconDots },
];

export function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ICON_OPTIONS.map(({ name, icon: IconComp }) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-label={name}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-control border transition-colors duration-150",
            value === name
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-text-secondary hover:bg-accent-soft",
          )}
        >
          <IconComp size={20} stroke={1.75} />
        </button>
      ))}
    </div>
  );
}
