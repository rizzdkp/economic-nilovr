"use client";

import { IconBuildingBank, IconCash, IconDots, IconWallet } from "@tabler/icons-react";
import { formatRupiah } from "@/lib/format";
import type { TipeDompet } from "@/generated/prisma/client";

const TIPE_ICON: Record<TipeDompet, typeof IconWallet> = {
  cash: IconCash,
  bank: IconBuildingBank,
  e_wallet: IconWallet,
  lainnya: IconDots,
};

const TIPE_LABEL: Record<TipeDompet, string> = {
  cash: "Tunai",
  bank: "Rekening bank",
  e_wallet: "E-wallet",
  lainnya: "Lainnya",
};

interface DompetCardProps {
  nama: string;
  tipe: TipeDompet;
  warna: string;
  saldoBerjalan: string | number;
  diarsipkan: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DompetCard({ nama, tipe, warna, saldoBerjalan, diarsipkan, onClick, onEdit, onDelete }: DompetCardProps) {
  const IconComp = TIPE_ICON[tipe];

  return (
    <div className="surface-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <button type="button" onClick={onClick} className="flex items-center gap-3 text-left" disabled={!onClick}>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-white"
            style={{ backgroundColor: warna }}
          >
            <IconComp size={20} stroke={1.75} />
          </span>
          <span>
            <span className="block text-sm font-medium text-text-primary">{nama}</span>
            <span className="block text-xs text-text-secondary">{TIPE_LABEL[tipe]}</span>
          </span>
        </button>
        {(onEdit || onDelete) && (
          <div className="flex gap-3">
            {onEdit && (
              <button type="button" onClick={onEdit} className="text-xs font-medium text-text-secondary hover:text-accent">
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="text-xs font-medium text-text-secondary hover:text-danger">
                Hapus
              </button>
            )}
          </div>
        )}
      </div>
      <p className="tabular-nums text-xl font-semibold text-text-primary">{formatRupiah(saldoBerjalan)}</p>
      {diarsipkan && <span className="text-xs font-medium text-text-secondary">Diarsipkan</span>}
    </div>
  );
}
