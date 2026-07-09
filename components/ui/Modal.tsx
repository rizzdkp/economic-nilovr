"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync open → visible with mount
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Use requestAnimationFrame to batch with the DOM update
      requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => {
        setMounted(false);
      }, 200);
    }
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:items-center",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "glass-card modal-panel max-h-[85vh] w-full overflow-y-auto p-6 shadow-xl transition-transform duration-200 md:max-w-md",
          visible ? "translate-y-0 md:opacity-100" : "translate-y-full md:translate-y-4 md:opacity-0",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 items-center justify-center rounded-control text-text-secondary transition-colors duration-150 hover:bg-accent-soft hover:text-text-primary"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
