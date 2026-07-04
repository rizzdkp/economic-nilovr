"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  TransaksiFilterBar,
  type TransaksiFilterState,
} from "@/components/transaksi/TransaksiFilterBar";
import {
  TransaksiFormModal,
  type TransaksiFormValue,
} from "@/components/transaksi/TransaksiFormModal";
import { TransaksiTable, type TransaksiRow } from "@/components/transaksi/TransaksiTable";
import { Pagination } from "@/components/transaksi/Pagination";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

const PAGE_SIZE = 20;

interface DompetOption {
  id: string;
  nama: string;
}

interface KategoriOption {
  id: string;
  nama: string;
  jenis: "income" | "expense";
  disembunyikan: boolean;
}

function TransaksiPageInner() {
  const searchParams = useSearchParams();
  const dompetIdParam = searchParams.get("dompetId");

  const [filter, setFilter] = useState<TransaksiFilterState>({
    dariTanggal: "",
    sampaiTanggal: "",
    jenis: "",
    dompetId: dompetIdParam ? [dompetIdParam] : [],
    kategoriId: [],
    cari: "",
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TransaksiRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [dompetOptions, setDompetOptions] = useState<DompetOption[]>([]);
  const [kategori, setKategori] = useState<KategoriOption[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransaksiFormValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransaksiRow | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadOptions = useCallback(async () => {
    const [dompetRes, kategoriRes] = await Promise.all([fetch("/api/dompet"), fetch("/api/kategori")]);
    const dompetJson = await dompetRes.json();
    const kategoriJson = await kategoriRes.json();
    if (dompetJson.success) {
      setDompetOptions(
        (dompetJson.data as (DompetOption & { diarsipkan: boolean })[]).filter((d) => !d.diarsipkan),
      );
    }
    if (kategoriJson.success) setKategori(kategoriJson.data);
  }, []);

  const loadTransaksi = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filter.dariTanggal) qs.set("dariTanggal", filter.dariTanggal);
    if (filter.sampaiTanggal) qs.set("sampaiTanggal", `${filter.sampaiTanggal}T23:59:59.999`);
    if (filter.jenis) qs.set("jenis", filter.jenis);
    if (filter.dompetId.length) qs.set("dompetId", filter.dompetId.join(","));
    if (filter.kategoriId.length) qs.set("kategoriId", filter.kategoriId.join(","));
    if (filter.cari) qs.set("cari", filter.cari);
    qs.set("page", String(page));
    qs.set("pageSize", String(PAGE_SIZE));

    const res = await fetch(`/api/transaksi?${qs.toString()}`);
    const json = await res.json();
    if (json.success) {
      setRows(json.data);
      setTotal(json.total);
    }
  }, [filter, page]);

  useEffect(() => {
    (async () => {
      await loadOptions();
    })();
  }, [loadOptions]);

  useEffect(() => {
    (async () => {
      await loadTransaksi();
    })();
  }, [loadTransaksi]);

  useAutoRefresh(loadTransaksi);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsBusy(true);
    try {
      await fetch(`/api/transaksi/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadTransaksi();
    } finally {
      setIsBusy(false);
    }
  }

  const kategoriIncome = kategori.filter((k) => k.jenis === "income" && !k.disembunyikan);
  const kategoriExpense = kategori.filter((k) => k.jenis === "expense" && !k.disembunyikan);
  const dompetChipOptions = dompetOptions.map((d) => ({ value: d.id, label: d.nama }));
  const kategoriChipOptions = [...kategoriExpense, ...kategoriIncome].map((k) => ({
    value: k.id,
    label: k.nama,
  }));

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transaksi</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Semua pemasukan, pengeluaran, dan transfer Anda.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={dompetOptions.length === 0}
        >
          <IconPlus size={18} stroke={1.75} />
          <span className="hidden sm:inline">Tambah transaksi</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      <TransaksiFilterBar
        filter={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
        dompetOptions={dompetChipOptions}
        kategoriOptions={kategoriChipOptions}
        onKategoriChanged={loadOptions}
      />

      {rows === null ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <TransaksiTable
            rows={rows}
            onEdit={(row) => {
              setEditing(row);
              setFormOpen(true);
            }}
            onDelete={(row) => setDeleteTarget(row)}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <TransaksiFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadTransaksi}
        dompetOptions={dompetOptions}
        kategoriIncomeOptions={kategoriIncome}
        kategoriExpenseOptions={kategoriExpense}
        transaksi={editing}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus transaksi?"
        description="Transaksi yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus"
        danger
        isLoading={isBusy}
      />
    </div>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <TransaksiPageInner />
    </Suspense>
  );
}
