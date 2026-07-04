"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DompetCard } from "@/components/dompet/DompetCard";
import { DompetFormModal } from "@/components/dompet/DompetFormModal";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import type { TipeDompet } from "@/generated/prisma/client";

interface DompetItem {
  id: string;
  nama: string;
  tipe: TipeDompet;
  warna: string;
  saldoAwal: string;
  saldoBerjalan: string;
  diarsipkan: boolean;
}

export default function DompetPage() {
  const router = useRouter();
  const [items, setItems] = useState<DompetItem[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DompetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DompetItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DompetItem | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/dompet");
    const json = await res.json();
    if (json.success) setItems(json.data);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useAutoRefresh(load);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/dompet/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok && json.hasTransactions) {
        setArchiveTarget(deleteTarget);
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    setIsBusy(true);
    try {
      await fetch(`/api/dompet/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diarsipkan: true }),
      });
      setArchiveTarget(null);
      await load();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dompet</h1>
          <p className="mt-1 text-sm text-text-secondary">Kelola sumber dana dan saldo berjalan Anda.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <IconPlus size={18} stroke={1.75} />
          <span className="hidden sm:inline">Tambah dompet</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-sm font-medium text-text-primary">Belum ada dompet</p>
          <p className="text-sm text-text-secondary">
            Tambah dompet pertama Anda — tunai, rekening bank, atau e-wallet — untuk mulai mencatat transaksi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DompetCard
              key={item.id}
              nama={item.nama}
              tipe={item.tipe}
              warna={item.warna}
              saldoBerjalan={item.saldoBerjalan}
              diarsipkan={item.diarsipkan}
              onClick={() => router.push(`/transaksi?dompetId=${item.id}`)}
              onEdit={() => {
                setEditing(item);
                setFormOpen(true);
              }}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      <DompetFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        dompet={editing}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus dompet?"
        description={`Dompet "${deleteTarget?.nama ?? ""}" tanpa transaksi akan dihapus permanen.`}
        confirmLabel="Hapus"
        danger
        isLoading={isBusy}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Dompet masih punya transaksi"
        description="Dompet ini tidak bisa dihapus permanen karena masih punya riwayat transaksi. Arsipkan alih-alih menghapus?"
        confirmLabel="Arsipkan"
        isLoading={isBusy}
      />
    </div>
  );
}
