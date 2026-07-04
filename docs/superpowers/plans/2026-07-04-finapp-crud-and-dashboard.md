# FinApp — CRUD, Dashboard & Laporan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the personal finance tracker per `AGENT/01-PROJECT-SPEC.md` — Kategori management, Dompet CRUD, Transaksi CRUD with filters, a live Dashboard, and a Laporan page with charts — so the app is feature-complete and passes `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

**Architecture:** Next.js 16 App Router. Server Components fetch read data directly via Prisma (dashboard, laporan, initial page loads). Client Components handle forms/interactivity and call REST Route Handlers (`app/api/dompet`, `app/api/kategori`, `app/api/transaksi`) for mutations, per the contract in `AGENT/03-TECH-ARCHITECTURE.md` section 5. `proxy.ts` (already implemented) gates every route except `/login` and the two auth routes — no further session wiring needed. Wallet running balance is always computed on read via `groupBy` aggregation, never stored.

**Tech Stack:** Next.js 16.2.10 (App Router, Route Handlers, Server Actions), TypeScript strict, Prisma 7 (`@/generated/prisma/client`), PostgreSQL, Zod 4, Recharts 3, Tabler Icons, Tailwind CSS 4.

## Global Constraints

- All text UI is in Bahasa Indonesia (existing convention — keep it).
- Money formatting: always `formatRupiah()` from `lib/format.ts` (already exists) — never format currency inline.
- Every write endpoint validates with Zod server-side before touching Prisma (spec §7). Never trust client validation alone.
- No new nav pages beyond Dashboard/Transaksi/Dompet/Laporan (design system §5 fixes bottom nav to exactly 4 icons). Kategori management is a modal launched from the Transaksi page, not a new route.
- Spacing scale: Tailwind's default 4px scale only (4/8/12/16/24/32/48). Border radius: `rounded-card` (16px) for cards, `rounded-control` (9px) for buttons/inputs — both already defined in `app/globals.css`. Reuse them, don't invent new radii.
- Glassmorphism (`.glass-card`) only for summary/dashboard cards and modals — never on the transaction table/list (design system §2). Tables/lists use `.surface-card`.
- One accent color only (`--accent`, already `#3B7A57`) — don't introduce a second non-semantic color. `--danger`/`--success` are semantic (expense/income) and already defined.
- Scope lock (brief §"Scope lock"): no multi-user/registration, no bank/payment integration, no email/push notifications, no AI/prediction features.
- Deployment (`AGENT/04-DEPLOYMENT-VPS.md`) is out of scope for this plan — it requires a live VPS/domain the user controls. Flag it as a follow-up once this plan's build gate is green.

---

## File Structure

```
lib/
  validation/
    dompet.ts          # Zod schemas: create/update
    kategori.ts         # Zod schemas: create/update
    transaksi.ts        # Zod schemas: create/update/filter (discriminated union by jenis)
  dompet-saldo.ts        # getSaldoMap(), getDompetDenganSaldo(), getTotalSaldoGabungan()
  transaksi-query.ts      # buildTransaksiWhere() shared between API route and dashboard/laporan aggregation
  laporan-data.ts         # getTrendBulanan(), getBreakdownKategori(), getBreakdownDompet()
  actions/
    laporan.ts            # "use server" wrappers around laporan-data for client range-switching

components/
  ui/
    Modal.tsx             # center dialog (desktop) / bottom sheet (mobile)
    ConfirmDialog.tsx      # built on Modal, yes/no confirmation
    Select.tsx             # styled native <select>
    MultiSelectChips.tsx    # checkbox-chip multi-select (dompet/kategori filters)
    Skeleton.tsx            # loading placeholder blocks
  kategori/
    KategoriManagerModal.tsx  # list + inline add/edit/delete, opened from Transaksi page
    IconPicker.tsx             # small fixed Tabler icon picker for category icon field
  dompet/
    DompetCard.tsx
    DompetFormModal.tsx
  transaksi/
    TransaksiFilterBar.tsx
    TransaksiFormModal.tsx    # add/edit, handles income/expense/transfer field switching
    TransaksiTable.tsx         # table on md+, card list on mobile
    Pagination.tsx
  dashboard/
    SummaryCards.tsx
    RecentTransactionsList.tsx
  chart/
    TrendChart.tsx           # grouped bar chart, income vs expense
    CategoryDonutChart.tsx    # pie/donut + legend + %
    WalletBarChart.tsx        # optional saldo per dompet

app/api/
  dompet/route.ts
  dompet/[id]/route.ts
  kategori/route.ts
  kategori/[id]/route.ts
  transaksi/route.ts
  transaksi/[id]/route.ts

app/(dashboard)/
  page.tsx                  # dashboard (Server Component, real data)
  dompet/page.tsx            # Server Component shell + client list
  transaksi/page.tsx          # Server Component shell + client filter/table
  laporan/page.tsx             # Server Component shell + client chart range switch
```

---

## Task 1: Zod validation schemas (Dompet, Kategori, Transaksi)

**Files:**
- Create: `lib/validation/dompet.ts`
- Create: `lib/validation/kategori.ts`
- Create: `lib/validation/transaksi.ts`

**Interfaces:**
- Produces: `dompetCreateSchema`, `dompetUpdateSchema`, `tipeDompetEnum` (dompet.ts)
- Produces: `kategoriCreateSchema`, `kategoriUpdateSchema`, `jenisKategoriEnum` (kategori.ts)
- Produces: `transaksiCreateSchema`, `transaksiUpdateSchema`, `transaksiFilterSchema` (transaksi.ts)

- [ ] **Step 1: Write `lib/validation/dompet.ts`**

```ts
import { z } from "zod";

export const tipeDompetEnum = z.enum(["cash", "bank", "e_wallet", "lainnya"]);

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex, contoh #3B7A57");

export const dompetCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama dompet wajib diisi").max(50),
  tipe: tipeDompetEnum,
  saldoAwal: z.coerce.number().finite().default(0),
  warna: hexColor.default("#3B7A57"),
});

export const dompetUpdateSchema = z.object({
  nama: z.string().trim().min(1, "Nama dompet wajib diisi").max(50).optional(),
  tipe: tipeDompetEnum.optional(),
  saldoAwal: z.coerce.number().finite().optional(),
  warna: hexColor.optional(),
  diarsipkan: z.boolean().optional(),
});
```

- [ ] **Step 2: Write `lib/validation/kategori.ts`**

```ts
import { z } from "zod";

export const jenisKategoriEnum = z.enum(["income", "expense"]);

export const kategoriCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi").max(40),
  jenis: jenisKategoriEnum,
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex"),
  ikon: z.string().min(1, "Ikon wajib dipilih"),
});

export const kategoriUpdateSchema = z.object({
  nama: z.string().trim().min(1).max(40).optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ikon: z.string().min(1).optional(),
  disembunyikan: z.boolean().optional(),
});
```

- [ ] **Step 3: Write `lib/validation/transaksi.ts`**

```ts
import { z } from "zod";

export const jenisTransaksiEnum = z.enum(["income", "expense", "transfer"]);

const catatanField = z.string().trim().max(280).optional().nullable();

export const transaksiCreateSchema = z
  .discriminatedUnion("jenis", [
    z.object({
      jenis: z.literal("income"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetId: z.string().min(1, "Dompet wajib dipilih"),
      kategoriId: z.string().min(1, "Kategori wajib dipilih"),
    }),
    z.object({
      jenis: z.literal("expense"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetId: z.string().min(1, "Dompet wajib dipilih"),
      kategoriId: z.string().min(1, "Kategori wajib dipilih"),
    }),
    z.object({
      jenis: z.literal("transfer"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetAsalId: z.string().min(1, "Dompet asal wajib dipilih"),
      dompetTujuanId: z.string().min(1, "Dompet tujuan wajib dipilih"),
    }),
  ])
  .refine(
    (data) => data.jenis !== "transfer" || data.dompetAsalId !== data.dompetTujuanId,
    { message: "Dompet asal dan tujuan tidak boleh sama", path: ["dompetTujuanId"] },
  );

export const transaksiUpdateSchema = transaksiCreateSchema;

export const transaksiFilterSchema = z.object({
  dariTanggal: z.coerce.date().optional(),
  sampaiTanggal: z.coerce.date().optional(),
  dompetId: z.array(z.string()).optional(),
  kategoriId: z.array(z.string()).optional(),
  jenis: jenisTransaksiEnum.optional(),
  cari: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

- [ ] **Step 4: Verify with typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing these three files.

- [ ] **Step 5: Commit**

```bash
git add lib/validation/dompet.ts lib/validation/kategori.ts lib/validation/transaksi.ts
git commit -m "feat: add zod validation schemas for dompet, kategori, transaksi"
```

---

## Task 2: Saldo aggregation + transaksi query helpers

**Files:**
- Create: `lib/dompet-saldo.ts`
- Create: `lib/transaksi-query.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `Prisma`, `Dompet`, `JenisTransaksi` types from `@/generated/prisma/client`
- Consumes: `transaksiFilterSchema` output type from Task 1 (`z.infer<typeof transaksiFilterSchema>`)
- Produces: `getSaldoMap(): Promise<Map<string, Prisma.Decimal>>`, `getDompetDenganSaldo(): Promise<(Dompet & { saldoBerjalan: Prisma.Decimal })[]>`, `getTotalSaldoGabungan(): Promise<Prisma.Decimal>` — used by Task 4 (dompet API), Task 8 (dashboard), Task 9 (laporan)
- Produces: `buildTransaksiWhere(filter: TransaksiFilter): Prisma.TransaksiWhereInput` — used by Task 6 (transaksi API) and Task 9 (laporan aggregation)

- [ ] **Step 1: Write `lib/dompet-saldo.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function getSaldoMap(): Promise<Map<string, Prisma.Decimal>> {
  const [income, expense, transferOut, transferIn] = await Promise.all([
    prisma.transaksi.groupBy({ by: ["dompetId"], where: { jenis: "income" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetId"], where: { jenis: "expense" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetAsalId"], where: { jenis: "transfer" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetTujuanId"], where: { jenis: "transfer" }, _sum: { jumlah: true } }),
  ]);

  const map = new Map<string, Prisma.Decimal>();
  const apply = (id: string | null, amount: Prisma.Decimal | null, sign: 1 | -1) => {
    if (!id || !amount) return;
    const current = map.get(id) ?? new Prisma.Decimal(0);
    map.set(id, sign === 1 ? current.plus(amount) : current.minus(amount));
  };

  income.forEach((r) => apply(r.dompetId, r._sum.jumlah, 1));
  expense.forEach((r) => apply(r.dompetId, r._sum.jumlah, -1));
  transferOut.forEach((r) => apply(r.dompetAsalId, r._sum.jumlah, -1));
  transferIn.forEach((r) => apply(r.dompetTujuanId, r._sum.jumlah, 1));

  return map;
}

export async function getDompetDenganSaldo() {
  const [dompetList, saldoMap] = await Promise.all([
    prisma.dompet.findMany({ orderBy: { dibuatPada: "asc" } }),
    getSaldoMap(),
  ]);

  return dompetList.map((d) => ({
    ...d,
    saldoBerjalan: d.saldoAwal.plus(saldoMap.get(d.id) ?? new Prisma.Decimal(0)),
  }));
}

export async function getTotalSaldoGabungan(): Promise<Prisma.Decimal> {
  const dompetDenganSaldo = await getDompetDenganSaldo();
  return dompetDenganSaldo
    .filter((d) => !d.diarsipkan)
    .reduce((total, d) => total.plus(d.saldoBerjalan), new Prisma.Decimal(0));
}
```

- [ ] **Step 2: Write `lib/transaksi-query.ts`**

```ts
import { Prisma } from "@/generated/prisma/client";
import type { transaksiFilterSchema } from "@/lib/validation/transaksi";
import type { z } from "zod";

export type TransaksiFilter = z.infer<typeof transaksiFilterSchema>;

export function buildTransaksiWhere(filter: TransaksiFilter): Prisma.TransaksiWhereInput {
  const where: Prisma.TransaksiWhereInput = {};

  if (filter.dariTanggal || filter.sampaiTanggal) {
    where.tanggal = {
      ...(filter.dariTanggal ? { gte: filter.dariTanggal } : {}),
      ...(filter.sampaiTanggal ? { lte: filter.sampaiTanggal } : {}),
    };
  }

  if (filter.jenis) {
    where.jenis = filter.jenis;
  }

  if (filter.dompetId && filter.dompetId.length > 0) {
    where.OR = [
      { dompetId: { in: filter.dompetId } },
      { dompetAsalId: { in: filter.dompetId } },
      { dompetTujuanId: { in: filter.dompetId } },
    ];
  }

  if (filter.kategoriId && filter.kategoriId.length > 0) {
    where.kategoriId = { in: filter.kategoriId };
  }

  if (filter.cari) {
    where.catatan = { contains: filter.cari, mode: "insensitive" };
  }

  return where;
}
```

- [ ] **Step 3: Verify with typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `Prisma.Decimal` or `groupBy` typing mismatches appear, check the actual generated types under `generated/prisma/client` and adjust (Prisma 7's `prisma-client` generator output can differ slightly from classic `prisma-client-js`).

- [ ] **Step 4: Commit**

```bash
git add lib/dompet-saldo.ts lib/transaksi-query.ts
git commit -m "feat: add saldo aggregation and transaksi filter query helpers"
```

---

## Task 3: Shared UI primitives (Modal, ConfirmDialog, Select, MultiSelectChips, Skeleton)

**Files:**
- Create: `components/ui/Modal.tsx`
- Create: `components/ui/ConfirmDialog.tsx`
- Create: `components/ui/Select.tsx`
- Create: `components/ui/MultiSelectChips.tsx`
- Create: `components/ui/Skeleton.tsx`

**Interfaces:**
- Produces: `<Modal open onClose title>` — used by every FormModal task (4, 5, 6)
- Produces: `<ConfirmDialog open onClose onConfirm title description confirmLabel danger?>` — used by dompet/kategori/transaksi delete flows
- Produces: `<Select>` (styled native select, extends `SelectHTMLAttributes`) — used by dompet tipe, kategori jenis, transaksi jenis/dompet/kategori pickers
- Produces: `<MultiSelectChips options value onChange>` where `options: {value:string; label:string}[]` — used by Task 7 filter bar
- Produces: `<Skeleton className>` — used by Task 8/9 loading states

- [ ] **Step 1: Write `components/ui/Modal.tsx`**

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timeout = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:items-center",
        open ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "surface-card max-h-[85vh] w-full overflow-y-auto rounded-b-none p-6 shadow-xl transition-transform duration-200 md:max-w-md md:rounded-card",
          open ? "translate-y-0 md:opacity-100" : "translate-y-full md:translate-y-4 md:opacity-0",
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
```

- [ ] **Step 2: Write `components/ui/ConfirmDialog.tsx`**

```tsx
"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  danger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button
          type="button"
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Memproses..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Write `components/ui/Select.tsx`**

```tsx
import { SelectHTMLAttributes, forwardRef } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "min-h-11 w-full appearance-none rounded-control border border-border bg-surface px-4 pr-10 text-base text-text-primary outline-none transition-colors duration-150 focus:border-accent",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          size={16}
          stroke={1.75}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>
    );
  },
);

Select.displayName = "Select";
```

- [ ] **Step 4: Write `components/ui/MultiSelectChips.tsx`**

```tsx
"use client";

import { cn } from "@/lib/cn";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectChipsProps {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
}

export function MultiSelectChips({ options, value, onChange }: MultiSelectChipsProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "min-h-9 rounded-control border px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-text-secondary hover:bg-accent-soft",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Write `components/ui/Skeleton.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-accent-soft/60", className)} />;
}
```

- [ ] **Step 6: Verify with typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/ui/Modal.tsx components/ui/ConfirmDialog.tsx components/ui/Select.tsx components/ui/MultiSelectChips.tsx components/ui/Skeleton.tsx
git commit -m "feat: add shared modal, confirm dialog, select, chips, skeleton primitives"
```

---

## Task 4: Kategori API routes + KategoriManagerModal

**Files:**
- Create: `app/api/kategori/route.ts`
- Create: `app/api/kategori/[id]/route.ts`
- Create: `components/kategori/IconPicker.tsx`
- Create: `components/kategori/KategoriManagerModal.tsx`

**Interfaces:**
- Consumes: `kategoriCreateSchema`, `kategoriUpdateSchema` (Task 1); `Modal`, `ConfirmDialog`, `Select` (Task 3); `prisma` (`@/lib/prisma`)
- Produces: `<KategoriManagerModal open onClose />` — mounted from Task 7's Transaksi page behind a "Kelola kategori" button; also usable from the Transaksi form's category picker as an "+ Tambah kategori" shortcut

- [ ] **Step 1: Write `app/api/kategori/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kategoriCreateSchema } from "@/lib/validation/kategori";

export async function GET(request: NextRequest) {
  const jenis = request.nextUrl.searchParams.get("jenis");
  const kategori = await prisma.kategori.findMany({
    where: jenis === "income" || jenis === "expense" ? { jenis } : undefined,
    orderBy: [{ isDefault: "desc" }, { nama: "asc" }],
  });
  return NextResponse.json({ success: true, data: kategori });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = kategoriCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const kategori = await prisma.kategori.create({ data: { ...parsed.data, isDefault: false } });
    return NextResponse.json({ success: true, data: kategori }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Kategori dengan nama & jenis ini sudah ada." },
        { status: 409 },
      );
    }
    throw error;
  }
}
```

- [ ] **Step 2: Write `app/api/kategori/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kategoriUpdateSchema } from "@/lib/validation/kategori";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/kategori/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = kategoriUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const existing = await prisma.kategori.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Kategori tidak ditemukan." }, { status: 404 });
  }

  const { nama, warna, ikon, disembunyikan } = parsed.data;
  if (existing.isDefault && (nama !== undefined || warna !== undefined || ikon !== undefined)) {
    return NextResponse.json(
      { success: false, message: "Kategori default tidak bisa diubah nama/warna/ikon, hanya bisa disembunyikan." },
      { status: 400 },
    );
  }

  const kategori = await prisma.kategori.update({
    where: { id },
    data: { nama, warna, ikon, disembunyikan },
  });
  return NextResponse.json({ success: true, data: kategori });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/kategori/[id]">) {
  const { id } = await ctx.params;
  const existing = await prisma.kategori.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Kategori tidak ditemukan." }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json(
      { success: false, message: "Kategori default tidak bisa dihapus." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    const lainnya = await tx.kategori.findFirst({
      where: { jenis: existing.jenis, nama: "Lainnya" },
    });
    if (lainnya) {
      await tx.transaksi.updateMany({
        where: { kategoriId: id },
        data: { kategoriId: lainnya.id },
      });
    }
    await tx.kategori.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Write `components/kategori/IconPicker.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `components/kategori/KategoriManagerModal.tsx`**

Full CRUD list UI: fetches `/api/kategori` on open, split into two columns/tabs (Pemasukan/Pengeluaran), each row shows icon+color swatch+name, "Sembunyikan" toggle for default categories, edit/delete buttons for custom ones, and an inline "+ Tambah kategori" form (name, jenis, color swatch picker reusing existing default palette colors, `IconPicker`). Delete goes through `ConfirmDialog` explaining the reassign-to-"Lainnya" behavior for categories still in use.

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import * as TablerIcons from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { IconPicker } from "@/components/kategori/IconPicker";
import { cn } from "@/lib/cn";

interface Kategori {
  id: string;
  nama: string;
  jenis: "income" | "expense";
  warna: string;
  ikon: string;
  isDefault: boolean;
  disembunyikan: boolean;
}

const PALET_WARNA = ["#3B7A57", "#E07A5F", "#457B9D", "#E76F51", "#9B5DE5", "#2A9D8F", "#F4A261", "#264653", "#E63946", "#6D6875"];

export function KategoriManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [formNama, setFormNama] = useState("");
  const [formWarna, setFormWarna] = useState(PALET_WARNA[0]);
  const [formIkon, setFormIkon] = useState("IconDots");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/kategori");
    const json = await res.json();
    if (json.success) setKategori(json.data);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function resetForm() {
    setFormNama("");
    setFormWarna(PALET_WARNA[0]);
    setFormIkon("IconDots");
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const res = editingId
        ? await fetch(`/api/kategori/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama: formNama, warna: formWarna, ikon: formIkon }),
          })
        : await fetch("/api/kategori", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama: formNama, jenis: tab, warna: formWarna, ikon: formIkon }),
          });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan kategori.");
        return;
      }
      resetForm();
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleHidden(k: Kategori) {
    await fetch(`/api/kategori/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disembunyikan: !k.disembunyikan }),
    });
    await load();
  }

  async function handleDelete() {
    if (!deletingId) return;
    setIsSaving(true);
    try {
      await fetch(`/api/kategori/${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = kategori.filter((k) => k.jenis === tab);

  return (
    <Modal open={open} onClose={onClose} title="Kelola kategori">
      <div className="mb-4 flex gap-2 rounded-control border border-border p-1">
        {(["expense", "income"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-control py-2 text-sm font-medium transition-colors duration-150",
              tab === value ? "bg-accent-soft text-accent" : "text-text-secondary",
            )}
          >
            {value === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((k) => {
          const IconComp = (TablerIcons as unknown as Record<string, TablerIcons.Icon>)[k.ikon] ?? TablerIcons.IconDots;
          return (
            <li key={k.id} className="flex items-center gap-3 rounded-control border border-border px-3 py-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-white"
                style={{ backgroundColor: k.warna }}
              >
                <IconComp size={18} stroke={1.75} />
              </span>
              <span className={cn("flex-1 text-sm text-text-primary", k.disembunyikan && "text-text-secondary line-through")}>
                {k.nama}
              </span>
              {k.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleToggleHidden(k)}
                  className="text-xs font-medium text-text-secondary hover:text-accent"
                >
                  {k.disembunyikan ? "Tampilkan" : "Sembunyikan"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(k.id);
                      setFormNama(k.nama);
                      setFormWarna(k.warna);
                      setFormIkon(k.ikon);
                    }}
                    className="text-xs font-medium text-text-secondary hover:text-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(k.id)}
                    className="text-xs font-medium text-text-secondary hover:text-danger"
                  >
                    Hapus
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <Input
          placeholder="Nama kategori baru"
          value={formNama}
          onChange={(e) => setFormNama(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {PALET_WARNA.map((warna) => (
            <button
              key={warna}
              type="button"
              onClick={() => setFormWarna(warna)}
              aria-label={warna}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform duration-150",
                formWarna === warna ? "scale-110 border-text-primary" : "border-transparent",
              )}
              style={{ backgroundColor: warna }}
            />
          ))}
        </div>
        <IconPicker value={formIkon} onChange={setFormIkon} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Batal edit
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || formNama.trim().length === 0}
            className="flex-1"
          >
            {editingId ? "Simpan perubahan" : "Tambah kategori"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Hapus kategori?"
        description="Transaksi yang masih memakai kategori ini akan dipindahkan ke kategori 'Lainnya'. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        isLoading={isSaving}
      />
    </Modal>
  );
}
```

- [ ] **Step 5: Verify — start dev server and exercise the API directly**

Run: `npm run dev` (background), then in another shell:
```bash
curl -s -X POST http://localhost:3000/api/kategori -H "Content-Type: application/json" \
  -d '{"nama":"Zakat","jenis":"expense","warna":"#3B7A57","ikon":"IconGift"}' -b "finapp_session=<valid_cookie>"
```
Expected: `401` without a valid session cookie (proxy gate working), and `201` with a valid one obtained from logging in through the browser first. Confirm `GET /api/kategori` returns the seeded defaults plus the new entry.

- [ ] **Step 6: Commit**

```bash
git add app/api/kategori components/kategori
git commit -m "feat: add kategori CRUD API and management modal"
```

---

## Task 5: Dompet API routes

**Files:**
- Create: `app/api/dompet/route.ts`
- Create: `app/api/dompet/[id]/route.ts`

**Interfaces:**
- Consumes: `dompetCreateSchema`, `dompetUpdateSchema` (Task 1); `getDompetDenganSaldo` (Task 2)
- Produces: `GET /api/dompet` → `{ success, data: (Dompet & { saldoBerjalan })[] }`; `POST /api/dompet` → created `Dompet`; `PATCH /api/dompet/[id]`; `DELETE /api/dompet/[id]` → `409 { hasTransactions: true }` when blocked — consumed by Task 6's `DompetFormModal`/`DompetCard`

- [ ] **Step 1: Write `app/api/dompet/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dompetCreateSchema } from "@/lib/validation/dompet";
import { getDompetDenganSaldo } from "@/lib/dompet-saldo";

export async function GET() {
  const dompet = await getDompetDenganSaldo();
  return NextResponse.json({ success: true, data: dompet });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = dompetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const dompet = await prisma.dompet.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: dompet }, { status: 201 });
}
```

- [ ] **Step 2: Write `app/api/dompet/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dompetUpdateSchema } from "@/lib/validation/dompet";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/dompet/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = dompetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const dompet = await prisma.dompet.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: dompet });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/dompet/[id]">) {
  const { id } = await ctx.params;

  const transaksiCount = await prisma.transaksi.count({
    where: { OR: [{ dompetId: id }, { dompetAsalId: id }, { dompetTujuanId: id }] },
  });

  if (transaksiCount > 0) {
    return NextResponse.json(
      {
        success: false,
        hasTransactions: true,
        message: "Dompet ini masih punya transaksi. Arsipkan dompet ini alih-alih menghapusnya.",
      },
      { status: 409 },
    );
  }

  await prisma.dompet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`. Then with the dev server running and a logged-in browser session cookie, exercise create → list → patch → delete-with-transactions (expect 409) → archive via PATCH `{ "diarsipkan": true }` → delete-without-transactions (expect 200).

- [ ] **Step 4: Commit**

```bash
git add app/api/dompet
git commit -m "feat: add dompet CRUD API with dynamic saldo and archive-on-delete guard"
```

---

## Task 6: Dompet page UI (cards, form modal, archive/delete flow)

**Files:**
- Create: `components/dompet/DompetCard.tsx`
- Create: `components/dompet/DompetFormModal.tsx`
- Modify: `app/(dashboard)/dompet/page.tsx`

**Interfaces:**
- Consumes: `Modal`, `ConfirmDialog`, `Select`, `Skeleton` (Task 3); `formatRupiah` (`@/lib/format.ts`); `GET/POST/PATCH/DELETE /api/dompet` (Task 5)
- Produces: `<DompetCard dompet onClick onEdit onDelete />`, `<DompetFormModal open onClose onSaved dompet? />` (reused by Task 8 dashboard's wallet list, if it renders `DompetCard`)

- [ ] **Step 1: Write `components/dompet/DompetCard.tsx`**

```tsx
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
  id: string;
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
        <button type="button" onClick={onClick} className="flex items-center gap-3 text-left">
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
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="text-xs font-medium text-text-secondary hover:text-accent">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="text-xs font-medium text-text-secondary hover:text-danger">
            Hapus
          </button>
        </div>
      </div>
      <p className="tabular-nums text-xl font-semibold text-text-primary">{formatRupiah(saldoBerjalan)}</p>
      {diarsipkan && <span className="text-xs font-medium text-text-secondary">Diarsipkan</span>}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/dompet/DompetFormModal.tsx`**

Form fields: `nama` (Input), `tipe` (Select: cash/bank/e_wallet/lainnya), `saldoAwal` (Input type=number), `warna` (same swatch picker pattern as `KategoriManagerModal`). On submit: POST if no `dompet` prop, PATCH if editing. Calls `onSaved()` then `onClose()`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { TipeDompet } from "@/generated/prisma/client";

const PALET_WARNA = ["#3B7A57", "#457B9D", "#E07A5F", "#9B5DE5", "#2A9D8F", "#E76F51"];

interface DompetFormValue {
  id: string;
  nama: string;
  tipe: TipeDompet;
  saldoAwal: string | number;
  warna: string;
}

interface DompetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  dompet?: DompetFormValue | null;
}

export function DompetFormModal({ open, onClose, onSaved, dompet }: DompetFormModalProps) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<TipeDompet>("cash");
  const [saldoAwal, setSaldoAwal] = useState("0");
  const [warna, setWarna] = useState(PALET_WARNA[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNama(dompet?.nama ?? "");
    setTipe(dompet?.tipe ?? "cash");
    setSaldoAwal(String(dompet?.saldoAwal ?? "0"));
    setWarna(dompet?.warna ?? PALET_WARNA[0]);
    setError(null);
  }, [open, dompet]);

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({ nama, tipe, saldoAwal: Number(saldoAwal), warna });
      const res = dompet
        ? await fetch(`/api/dompet/${dompet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
        : await fetch("/api/dompet", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan dompet.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={dompet ? "Edit dompet" : "Tambah dompet"}>
      <div className="flex flex-col gap-4">
        <Input placeholder="Nama dompet" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
        <Select value={tipe} onChange={(e) => setTipe(e.target.value as TipeDompet)}>
          <option value="cash">Tunai</option>
          <option value="bank">Rekening bank</option>
          <option value="e_wallet">E-wallet</option>
          <option value="lainnya">Lainnya</option>
        </Select>
        <Input
          type="number"
          placeholder="Saldo awal"
          value={saldoAwal}
          onChange={(e) => setSaldoAwal(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {PALET_WARNA.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWarna(w)}
              aria-label={w}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform duration-150",
                warna === w ? "scale-110 border-text-primary" : "border-transparent",
              )}
              style={{ backgroundColor: w }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="button" onClick={handleSubmit} disabled={isSaving || nama.trim().length === 0}>
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Rewrite `app/(dashboard)/dompet/page.tsx`**

Client component (page itself becomes `"use client"` since it needs interactive state — acceptable here as it has no SEO/first-paint requirement behind the password gate): fetches `/api/dompet` on mount, renders a responsive grid of `DompetCard`, a "+ Tambah dompet" button opening `DompetFormModal`, edit wiring, and delete flow: click Hapus → `DELETE /api/dompet/[id]` → if response has `hasTransactions: true`, open a `ConfirmDialog` offering "Arsipkan" which does `PATCH { diarsipkan: true }`; otherwise just refresh the list. Clicking a card navigates to `/transaksi?dompetId=<id>` (satisfies spec's "klik untuk lihat detail transaksi dompet itu").

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DompetCard } from "@/components/dompet/DompetCard";
import { DompetFormModal } from "@/components/dompet/DompetFormModal";
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
    load();
  }, [load]);

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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
          Tambah dompet
        </Button>
      </div>

      {items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DompetCard
              key={item.id}
              {...item}
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
        description="Dompet tanpa transaksi akan dihapus permanen."
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
```

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, log in, go to `/dompet`. Confirm: add dompet appears immediately, edit updates in place, delete on an empty wallet removes it, delete on a wallet with transactions offers archive, archived wallet shows the "Diarsipkan" tag, card click navigates to `/transaksi?dompetId=...`.

- [ ] **Step 5: Commit**

```bash
git add components/dompet app/\(dashboard\)/dompet/page.tsx
git commit -m "feat: build dompet page with cards, form modal, and archive/delete flow"
```

---

## Task 7: Transaksi API routes

**Files:**
- Create: `app/api/transaksi/route.ts`
- Create: `app/api/transaksi/[id]/route.ts`

**Interfaces:**
- Consumes: `transaksiCreateSchema`, `transaksiUpdateSchema`, `transaksiFilterSchema` (Task 1); `buildTransaksiWhere` (Task 2)
- Produces: `GET /api/transaksi?dariTanggal=&sampaiTanggal=&dompetId=a,b&kategoriId=c,d&jenis=&cari=&page=&pageSize=` → `{ success, data: Transaksi[], total, page, pageSize }`; `POST`; `PATCH /api/transaksi/[id]`; `DELETE /api/transaksi/[id]` — consumed by Task 8 filter bar/table/form

- [ ] **Step 1: Write `app/api/transaksi/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transaksiCreateSchema, transaksiFilterSchema } from "@/lib/validation/transaksi";
import { buildTransaksiWhere } from "@/lib/transaksi-query";

function splitParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").filter(Boolean);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = transaksiFilterSchema.safeParse({
    dariTanggal: params.get("dariTanggal") ?? undefined,
    sampaiTanggal: params.get("sampaiTanggal") ?? undefined,
    dompetId: splitParam(params.get("dompetId")),
    kategoriId: splitParam(params.get("kategoriId")),
    jenis: params.get("jenis") ?? undefined,
    cari: params.get("cari") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Filter tidak valid" },
      { status: 400 },
    );
  }

  const where = buildTransaksiWhere(parsed.data);
  const { page, pageSize } = parsed.data;

  const [data, total] = await Promise.all([
    prisma.transaksi.findMany({
      where,
      include: { dompet: true, dompetAsal: true, dompetTujuan: true, kategori: true },
      orderBy: { tanggal: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaksi.count({ where }),
  ]);

  return NextResponse.json({ success: true, data, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = transaksiCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { jenis, tanggal, jumlah, catatan } = parsed.data;
  const data =
    jenis === "transfer"
      ? { jenis, tanggal, jumlah, catatan, dompetAsalId: parsed.data.dompetAsalId, dompetTujuanId: parsed.data.dompetTujuanId }
      : { jenis, tanggal, jumlah, catatan, dompetId: parsed.data.dompetId, kategoriId: parsed.data.kategoriId };

  const transaksi = await prisma.transaksi.create({ data });
  return NextResponse.json({ success: true, data: transaksi }, { status: 201 });
}
```

- [ ] **Step 2: Write `app/api/transaksi/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transaksiUpdateSchema } from "@/lib/validation/transaksi";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/transaksi/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = transaksiUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { jenis, tanggal, jumlah, catatan } = parsed.data;
  const data =
    jenis === "transfer"
      ? {
          jenis, tanggal, jumlah, catatan,
          dompetAsalId: parsed.data.dompetAsalId,
          dompetTujuanId: parsed.data.dompetTujuanId,
          dompetId: null,
          kategoriId: null,
        }
      : {
          jenis, tanggal, jumlah, catatan,
          dompetId: parsed.data.dompetId,
          kategoriId: parsed.data.kategoriId,
          dompetAsalId: null,
          dompetTujuanId: null,
        };

  const transaksi = await prisma.transaksi.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: transaksi });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/transaksi/[id]">) {
  const { id } = await ctx.params;
  await prisma.transaksi.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`. With a logged-in session cookie, create one income, one expense, one transfer via curl; confirm `GET /api/transaksi` returns all three with `dompet`/`kategori` included and correct `total`; confirm filtering by `jenis=transfer` and by `dompetId` narrows results.

- [ ] **Step 4: Commit**

```bash
git add app/api/transaksi
git commit -m "feat: add transaksi CRUD API with filters and pagination"
```

---

## Task 8: Transaksi page UI (filters, table/list, form modal, pagination)

**Files:**
- Create: `components/transaksi/TransaksiFilterBar.tsx`
- Create: `components/transaksi/TransaksiFormModal.tsx`
- Create: `components/transaksi/TransaksiTable.tsx`
- Create: `components/transaksi/Pagination.tsx`
- Modify: `app/(dashboard)/transaksi/page.tsx`

**Interfaces:**
- Consumes: `MultiSelectChips`, `Select`, `Modal`, `ConfirmDialog`, `Skeleton` (Task 3); `KategoriManagerModal` (Task 4); `formatRupiah`, `formatTanggal` (`@/lib/format.ts`); `GET/POST/PATCH/DELETE /api/transaksi` (Task 7); `GET /api/dompet`, `GET /api/kategori` (Tasks 4/5, for picker options)
- Produces: full `/transaksi` page reading `?dompetId=` from the URL (set by Task 6's `DompetCard` navigation) as the initial filter

- [ ] **Step 1: Write `components/transaksi/TransaksiFilterBar.tsx`**

Renders: date-range preset buttons ("Bulan ini", "Bulan lalu", "3 bulan terakhir", custom date inputs), a jenis `Select` (Semua/Pemasukan/Pengeluaran/Transfer), `MultiSelectChips` for dompet and kategori (options passed as props, fetched by the parent page), a text `Input` for `cari`, and a "Kelola kategori" button that opens `KategoriManagerModal`. All controls are controlled by a `filter` object prop and call `onChange(next)`; presets compute dates with `awalBulan`/`akhirBulan`/`tambahBulan` from `lib/format.ts`.

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { MultiSelectChips } from "@/components/ui/MultiSelectChips";
import { KategoriManagerModal } from "@/components/kategori/KategoriManagerModal";
import { awalBulan, akhirBulan, tambahBulan } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface TransaksiFilterState {
  dariTanggal: string;
  sampaiTanggal: string;
  jenis: "" | "income" | "expense" | "transfer";
  dompetId: string[];
  kategoriId: string[];
  cari: string;
}

interface TransaksiFilterBarProps {
  filter: TransaksiFilterState;
  onChange: (next: TransaksiFilterState) => void;
  dompetOptions: { value: string; label: string }[];
  kategoriOptions: { value: string; label: string }[];
  onKategoriChanged: () => void;
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function TransaksiFilterBar({ filter, onChange, dompetOptions, kategoriOptions, onKategoriChanged }: TransaksiFilterBarProps) {
  const [kategoriModalOpen, setKategoriModalOpen] = useState(false);

  function applyPreset(preset: "bulanIni" | "bulanLalu" | "tigaBulan") {
    const now = new Date();
    if (preset === "bulanIni") {
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(now)), sampaiTanggal: toDateInput(akhirBulan(now)) });
    } else if (preset === "bulanLalu") {
      const lalu = tambahBulan(now, -1);
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(lalu)), sampaiTanggal: toDateInput(akhirBulan(lalu)) });
    } else {
      const tigaBulanLalu = tambahBulan(now, -2);
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(tigaBulanLalu)), sampaiTanggal: toDateInput(akhirBulan(now)) });
    }
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "bulanIni" as const, label: "Bulan ini" },
          { key: "bulanLalu" as const, label: "Bulan lalu" },
          { key: "tigaBulan" as const, label: "3 bulan terakhir" },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className="min-h-9 rounded-control border border-border px-3 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-accent-soft"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input type="date" value={filter.dariTanggal} onChange={(e) => onChange({ ...filter, dariTanggal: e.target.value })} />
        <Input type="date" value={filter.sampaiTanggal} onChange={(e) => onChange({ ...filter, sampaiTanggal: e.target.value })} />
        <Select value={filter.jenis} onChange={(e) => onChange({ ...filter, jenis: e.target.value as TransaksiFilterState["jenis"] })}>
          <option value="">Semua jenis</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
          <option value="transfer">Transfer</option>
        </Select>
        <Input placeholder="Cari catatan..." value={filter.cari} onChange={(e) => onChange({ ...filter, cari: e.target.value })} />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-text-secondary">Dompet</p>
        <MultiSelectChips options={dompetOptions} value={filter.dompetId} onChange={(v) => onChange({ ...filter, dompetId: v })} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary">Kategori</p>
          <button
            type="button"
            onClick={() => setKategoriModalOpen(true)}
            className={cn("text-xs font-medium text-accent hover:underline")}
          >
            Kelola kategori
          </button>
        </div>
        <MultiSelectChips options={kategoriOptions} value={filter.kategoriId} onChange={(v) => onChange({ ...filter, kategoriId: v })} />
      </div>

      <KategoriManagerModal
        open={kategoriModalOpen}
        onClose={() => {
          setKategoriModalOpen(false);
          onKategoriChanged();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `components/transaksi/Pagination.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-text-secondary">
        Halaman {page} dari {totalPages} · {total} transaksi
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </Button>
        <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/transaksi/TransaksiFormModal.tsx`**

Fields: `jenis` (Select: Pemasukan/Pengeluaran/Transfer, switches the rest of the form), `tanggal` (Input type=date, default today), `jumlah` (Input type=number), `catatan` (Input, optional), then either `dompetId`+`kategoriId` (Select, `kategoriId` options filtered to match `jenis`) or `dompetAsalId`+`dompetTujuanId` (two Selects excluding each other's current pick client-side, refined server-side too). POST when no `transaksi` prop, PATCH when editing.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Option {
  id: string;
  nama: string;
}

interface TransaksiFormValue {
  id: string;
  jenis: "income" | "expense" | "transfer";
  tanggal: string;
  jumlah: string | number;
  catatan: string | null;
  dompetId: string | null;
  kategoriId: string | null;
  dompetAsalId: string | null;
  dompetTujuanId: string | null;
}

interface TransaksiFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  dompetOptions: Option[];
  kategoriIncomeOptions: Option[];
  kategoriExpenseOptions: Option[];
  transaksi?: TransaksiFormValue | null;
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransaksiFormModal({
  open, onClose, onSaved, dompetOptions, kategoriIncomeOptions, kategoriExpenseOptions, transaksi,
}: TransaksiFormModalProps) {
  const [jenis, setJenis] = useState<"income" | "expense" | "transfer">("expense");
  const [tanggal, setTanggal] = useState(todayInput());
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [dompetId, setDompetId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [dompetAsalId, setDompetAsalId] = useState("");
  const [dompetTujuanId, setDompetTujuanId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setJenis(transaksi?.jenis ?? "expense");
    setTanggal(transaksi?.tanggal ?? todayInput());
    setJumlah(String(transaksi?.jumlah ?? ""));
    setCatatan(transaksi?.catatan ?? "");
    setDompetId(transaksi?.dompetId ?? dompetOptions[0]?.id ?? "");
    setKategoriId(transaksi?.kategoriId ?? "");
    setDompetAsalId(transaksi?.dompetAsalId ?? dompetOptions[0]?.id ?? "");
    setDompetTujuanId(transaksi?.dompetTujuanId ?? dompetOptions[1]?.id ?? "");
    setError(null);
  }, [open, transaksi, dompetOptions]);

  const kategoriOptions = jenis === "income" ? kategoriIncomeOptions : kategoriExpenseOptions;

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const payload =
        jenis === "transfer"
          ? { jenis, tanggal, jumlah: Number(jumlah), catatan: catatan || null, dompetAsalId, dompetTujuanId }
          : { jenis, tanggal, jumlah: Number(jumlah), catatan: catatan || null, dompetId, kategoriId };

      const res = transaksi
        ? await fetch(`/api/transaksi/${transaksi.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/transaksi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan transaksi.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={transaksi ? "Edit transaksi" : "Tambah transaksi"}>
      <div className="flex flex-col gap-4">
        <Select value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </Select>
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        <Input type="number" placeholder="Jumlah (Rp)" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />

        {jenis === "transfer" ? (
          <>
            <Select value={dompetAsalId} onChange={(e) => setDompetAsalId(e.target.value)}>
              {dompetOptions.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </Select>
            <Select value={dompetTujuanId} onChange={(e) => setDompetTujuanId(e.target.value)}>
              {dompetOptions.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </Select>
          </>
        ) : (
          <>
            <Select value={dompetId} onChange={(e) => setDompetId(e.target.value)}>
              {dompetOptions.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </Select>
            <Select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
              <option value="">Pilih kategori</option>
              {kategoriOptions.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </Select>
          </>
        )}

        <Input placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || jumlah.trim().length === 0 || (jenis !== "transfer" && kategoriId === "")}
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Write `components/transaksi/TransaksiTable.tsx`**

Desktop (`md:` and up): a `<table>` inside `.surface-card` with columns Tanggal/Keterangan (kategori icon+nama or "Transfer: A → B")/Dompet/Jumlah (colored green/red with +/-)/Aksi (Edit, Hapus). Mobile (below `md`): the same data rendered as a vertical stack of bordered rows (design system §5 — no horizontal-scroll tables on mobile), toggled with Tailwind's `hidden md:table`/`md:hidden` pair, not JS.

```tsx
"use client";

import { formatRupiah, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/cn";

interface TransaksiRow {
  id: string;
  tanggal: string;
  jumlah: string | number;
  jenis: "income" | "expense" | "transfer";
  catatan: string | null;
  dompet: { nama: string } | null;
  dompetAsal: { nama: string } | null;
  dompetTujuan: { nama: string } | null;
  kategori: { nama: string } | null;
}

function keterangan(row: TransaksiRow): string {
  if (row.jenis === "transfer") return `Transfer: ${row.dompetAsal?.nama ?? "-"} -> ${row.dompetTujuan?.nama ?? "-"}`;
  return row.kategori?.nama ?? "-";
}

function jumlahClass(jenis: TransaksiRow["jenis"]): string {
  if (jenis === "income") return "text-success";
  if (jenis === "expense") return "text-danger";
  return "text-text-primary";
}

function jumlahPrefix(jenis: TransaksiRow["jenis"]): string {
  if (jenis === "income") return "+";
  if (jenis === "expense") return "-";
  return "";
}

interface TransaksiTableProps {
  rows: TransaksiRow[];
  onEdit: (row: TransaksiRow) => void;
  onDelete: (row: TransaksiRow) => void;
}

export function TransaksiTable({ rows, onEdit, onDelete }: TransaksiTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-text-secondary">
            <th className="px-4 py-3">Tanggal</th>
            <th className="px-4 py-3">Keterangan</th>
            <th className="px-4 py-3">Dompet</th>
            <th className="px-4 py-3 text-right">Jumlah</th>
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-sm text-text-secondary">{formatTanggal(row.tanggal)}</td>
              <td className="px-4 py-3 text-sm text-text-primary">
                {keterangan(row)}
                {row.catatan && <span className="block text-xs text-text-secondary">{row.catatan}</span>}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.dompet?.nama ?? "-"}</td>
              <td className={cn("px-4 py-3 text-right text-sm font-medium tabular-nums", jumlahClass(row.jenis))}>
                {jumlahPrefix(row.jenis)}{formatRupiah(row.jumlah)}
              </td>
              <td className="px-4 py-3 text-right text-xs">
                <button type="button" onClick={() => onEdit(row)} className="mr-3 font-medium text-text-secondary hover:text-accent">Edit</button>
                <button type="button" onClick={() => onDelete(row)} className="font-medium text-text-secondary hover:text-danger">Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col divide-y divide-border md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{keterangan(row)}</span>
              <span className={cn("text-sm font-medium tabular-nums", jumlahClass(row.jenis))}>
                {jumlahPrefix(row.jenis)}{formatRupiah(row.jumlah)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{formatTanggal(row.tanggal)} · {row.dompet?.nama ?? "-"}</span>
              <span className="flex gap-3">
                <button type="button" onClick={() => onEdit(row)} className="font-medium hover:text-accent">Edit</button>
                <button type="button" onClick={() => onDelete(row)} className="font-medium hover:text-danger">Hapus</button>
              </span>
            </div>
            {row.catatan && <span className="text-xs text-text-secondary">{row.catatan}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `app/(dashboard)/transaksi/page.tsx`**

Client component. On mount, fetches `/api/dompet` and `/api/kategori` once for picker options; reads `dompetId` from `useSearchParams()` to seed the initial filter; keeps `filter` + `page` in state; refetches `/api/transaksi` whenever either changes (via `useEffect`); renders `TransaksiFilterBar`, "+ Tambah transaksi" button opening `TransaksiFormModal`, `TransaksiTable`, `Pagination`, and a `ConfirmDialog` for delete.

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TransaksiFilterBar, type TransaksiFilterState } from "@/components/transaksi/TransaksiFilterBar";
import { TransaksiFormModal } from "@/components/transaksi/TransaksiFormModal";
import { TransaksiTable } from "@/components/transaksi/TransaksiTable";
import { Pagination } from "@/components/transaksi/Pagination";

const PAGE_SIZE = 20;

const EMPTY_FILTER: TransaksiFilterState = {
  dariTanggal: "",
  sampaiTanggal: "",
  jenis: "",
  dompetId: [],
  kategoriId: [],
  cari: "",
};

export default function TransaksiPage() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<TransaksiFilterState>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [dompetOptions, setDompetOptions] = useState<{ id: string; nama: string }[]>([]);
  const [kategoriIncome, setKategoriIncome] = useState<{ id: string; nama: string }[]>([]);
  const [kategoriExpense, setKategoriExpense] = useState<{ id: string; nama: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadOptions = useCallback(async () => {
    const [dompetRes, kategoriRes] = await Promise.all([fetch("/api/dompet"), fetch("/api/kategori")]);
    const dompetJson = await dompetRes.json();
    const kategoriJson = await kategoriRes.json();
    if (dompetJson.success) setDompetOptions(dompetJson.data.map((d: any) => ({ id: d.id, nama: d.nama })));
    if (kategoriJson.success) {
      setKategoriIncome(kategoriJson.data.filter((k: any) => k.jenis === "income" && !k.disembunyikan));
      setKategoriExpense(kategoriJson.data.filter((k: any) => k.jenis === "expense" && !k.disembunyikan));
    }
  }, []);

  const loadTransaksi = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filter.dariTanggal) qs.set("dariTanggal", filter.dariTanggal);
    if (filter.sampaiTanggal) qs.set("sampaiTanggal", filter.sampaiTanggal);
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
    const dompetId = searchParams.get("dompetId");
    if (dompetId) setFilter((f) => ({ ...f, dompetId: [dompetId] }));
    loadOptions();
  }, [searchParams, loadOptions]);

  useEffect(() => {
    loadTransaksi();
  }, [loadTransaksi]);

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

  const dompetChipOptions = dompetOptions.map((d) => ({ value: d.id, label: d.nama }));
  const kategoriChipOptions = [...kategoriExpense, ...kategoriIncome].map((k) => ({ value: k.id, label: k.nama }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transaksi</h1>
          <p className="mt-1 text-sm text-text-secondary">Semua pemasukan, pengeluaran, dan transfer Anda.</p>
        </div>
        <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <IconPlus size={18} stroke={1.75} />
          Tambah transaksi
        </Button>
      </div>

      <TransaksiFilterBar
        filter={filter}
        onChange={(next) => { setFilter(next); setPage(1); }}
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
            onEdit={(row) => { setEditing(row); setFormOpen(true); }}
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
```

- [ ] **Step 6: Manual browser verification**

Log in, go to `/transaksi`. Confirm: add income/expense/transfer all save and appear at top of the list; date-range presets narrow results; dompet/kategori chip filters narrow results; search box filters by catatan; edit opens the modal pre-filled and updates in place; delete removes the row; resize to a mobile width and confirm the table becomes a card list, not a horizontally-scrolling table; navigating from a dompet card on `/dompet` pre-fills the dompet filter here.

- [ ] **Step 7: Commit**

```bash
git add components/transaksi app/\(dashboard\)/transaksi/page.tsx
git commit -m "feat: build transaksi page with filters, table/card list, pagination, and form modal"
```

---

## Task 9: Dashboard data + UI

**Files:**
- Create: `lib/dashboard-data.ts`
- Create: `components/dashboard/SummaryCards.tsx`
- Create: `components/dashboard/RecentTransactionsList.tsx`
- Create: `components/chart/TrendChart.tsx`
- Create: `components/chart/CategoryDonutChart.tsx`
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `getTotalSaldoGabungan`, `getDompetDenganSaldo` (Task 2); `buildTransaksiWhere` (Task 2, reused for month-range aggregation); `prisma`
- Produces: `getDashboardData(): Promise<DashboardData>` where
  ```ts
  interface DashboardData {
    totalSaldo: string;
    pemasukanBulanIni: string;
    pengeluaranBulanIni: string;
    persenPemasukanVsBulanLalu: number | null;
    persenPengeluaranVsBulanLalu: number | null;
    dompet: { id: string; nama: string; warna: string; tipe: string; saldoBerjalan: string }[];
    trend6Bulan: { bulan: string; pemasukan: number; pengeluaran: number }[];
    topKategoriBulanIni: { nama: string; warna: string; total: number; persen: number }[];
    transaksiTerbaru: TransaksiRow[]; // same shape as Task 8's TransaksiRow
  }
  ```
  consumed directly by `app/(dashboard)/page.tsx` (Server Component, no client fetch needed)

- [ ] **Step 1: Write `lib/dashboard-data.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { getDompetDenganSaldo, getTotalSaldoGabungan } from "@/lib/dompet-saldo";
import { awalBulan, akhirBulan, tambahBulan, formatBulan } from "@/lib/format";

async function sumJenis(jenis: "income" | "expense", dari: Date, sampai: Date): Promise<number> {
  const result = await prisma.transaksi.aggregate({
    where: { jenis, tanggal: { gte: dari, lte: sampai } },
    _sum: { jumlah: true },
  });
  return Number(result._sum.jumlah ?? 0);
}

function persenPerubahan(sekarang: number, lalu: number): number | null {
  if (lalu === 0) return null;
  return ((sekarang - lalu) / lalu) * 100;
}

export async function getDashboardData() {
  const now = new Date();
  const bulanIniAwal = awalBulan(now);
  const bulanIniAkhir = akhirBulan(now);
  const bulanLalu = tambahBulan(now, -1);
  const bulanLaluAwal = awalBulan(bulanLalu);
  const bulanLaluAkhir = akhirBulan(bulanLalu);

  const [
    totalSaldo,
    dompetDenganSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    pemasukanBulanLalu,
    pengeluaranBulanLalu,
    transaksiTerbaru,
  ] = await Promise.all([
    getTotalSaldoGabungan(),
    getDompetDenganSaldo(),
    sumJenis("income", bulanIniAwal, bulanIniAkhir),
    sumJenis("expense", bulanIniAwal, bulanIniAkhir),
    sumJenis("income", bulanLaluAwal, bulanLaluAkhir),
    sumJenis("expense", bulanLaluAwal, bulanLaluAkhir),
    prisma.transaksi.findMany({
      include: { dompet: true, dompetAsal: true, dompetTujuan: true, kategori: true },
      orderBy: { tanggal: "desc" },
      take: 5,
    }),
  ]);

  const trend6Bulan = [];
  for (let i = 5; i >= 0; i--) {
    const bulan = tambahBulan(now, -i);
    const [pemasukan, pengeluaran] = await Promise.all([
      sumJenis("income", awalBulan(bulan), akhirBulan(bulan)),
      sumJenis("expense", awalBulan(bulan), akhirBulan(bulan)),
    ]);
    trend6Bulan.push({ bulan: formatBulan(bulan), pemasukan, pengeluaran });
  }

  const breakdownRaw = await prisma.transaksi.groupBy({
    by: ["kategoriId"],
    where: { jenis: "expense", tanggal: { gte: bulanIniAwal, lte: bulanIniAkhir }, kategoriId: { not: null } },
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: "desc" } },
    take: 5,
  });
  const kategoriIds = breakdownRaw.map((r) => r.kategoriId).filter((id): id is string => id !== null);
  const kategoriList = await prisma.kategori.findMany({ where: { id: { in: kategoriIds } } });
  const totalPengeluaranBulanIni = pengeluaranBulanIni || 1;
  const topKategoriBulanIni = breakdownRaw.map((r) => {
    const kategori = kategoriList.find((k) => k.id === r.kategoriId);
    const total = Number(r._sum.jumlah ?? 0);
    return {
      nama: kategori?.nama ?? "Lainnya",
      warna: kategori?.warna ?? "#6B6A64",
      total,
      persen: (total / totalPengeluaranBulanIni) * 100,
    };
  });

  return {
    totalSaldo: totalSaldo.toString(),
    pemasukanBulanIni: String(pemasukanBulanIni),
    pengeluaranBulanIni: String(pengeluaranBulanIni),
    persenPemasukanVsBulanLalu: persenPerubahan(pemasukanBulanIni, pemasukanBulanLalu),
    persenPengeluaranVsBulanLalu: persenPerubahan(pengeluaranBulanIni, pengeluaranBulanLalu),
    dompet: dompetDenganSaldo.map((d) => ({
      id: d.id, nama: d.nama, warna: d.warna, tipe: d.tipe, saldoBerjalan: d.saldoBerjalan.toString(),
    })),
    trend6Bulan,
    topKategoriBulanIni,
    transaksiTerbaru,
  };
}
```

- [ ] **Step 2: Write `components/chart/TrendChart.tsx`**

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";

interface TrendChartProps {
  data: { bulan: string; pemasukan: number; pengeluaran: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(value)}
        />
        <Tooltip
          formatter={(value: number) => formatRupiah(value)}
          contentStyle={{ borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)" }}
        />
        <Bar dataKey="pemasukan" name="Pemasukan" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Write `components/chart/CategoryDonutChart.tsx`**

```tsx
"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/format";

interface CategoryDonutChartProps {
  data: { nama: string; warna: string; total: number; persen: number }[];
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">Belum ada pengeluaran periode ini.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="nama" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.nama} fill={entry.warna} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatRupiah(value)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((entry) => (
          <li key={entry.nama} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text-primary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.warna }} />
              {entry.nama}
            </span>
            <span className="text-text-secondary">{entry.persen.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Write `components/dashboard/SummaryCards.tsx`**

```tsx
import { IconArrowDownRight, IconArrowUpRight, IconWallet } from "@tabler/icons-react";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

interface SummaryCardsProps {
  totalSaldo: string;
  pemasukanBulanIni: string;
  pengeluaranBulanIni: string;
  persenPemasukanVsBulanLalu: number | null;
  persenPengeluaranVsBulanLalu: number | null;
}

function PerubahanBadge({ persen, positifBaik }: { persen: number | null; positifBaik: boolean }) {
  if (persen === null) return null;
  const naik = persen >= 0;
  const baik = naik === positifBaik;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", baik ? "text-success" : "text-danger")}>
      {naik ? <IconArrowUpRight size={14} stroke={2} /> : <IconArrowDownRight size={14} stroke={2} />}
      {Math.abs(persen).toFixed(0)}% dari bulan lalu
    </span>
  );
}

export function SummaryCards({ totalSaldo, pemasukanBulanIni, pengeluaranBulanIni, persenPemasukanVsBulanLalu, persenPengeluaranVsBulanLalu }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="glass-card p-6 sm:col-span-1">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-accent text-white">
          <IconWallet size={20} stroke={1.75} />
        </div>
        <p className="text-xs font-medium text-text-secondary">Total saldo gabungan</p>
        <p className="tabular-nums mt-1 text-2xl font-semibold text-text-primary sm:text-3xl">{formatRupiah(totalSaldo)}</p>
      </div>
      <div className="glass-card p-6">
        <p className="text-xs font-medium text-text-secondary">Pemasukan bulan ini</p>
        <p className="tabular-nums mt-1 text-xl font-semibold text-success">{formatRupiah(pemasukanBulanIni)}</p>
        <div className="mt-2">
          <PerubahanBadge persen={persenPemasukanVsBulanLalu} positifBaik />
        </div>
      </div>
      <div className="glass-card p-6">
        <p className="text-xs font-medium text-text-secondary">Pengeluaran bulan ini</p>
        <p className="tabular-nums mt-1 text-xl font-semibold text-danger">{formatRupiah(pengeluaranBulanIni)}</p>
        <div className="mt-2">
          <PerubahanBadge persen={persenPengeluaranVsBulanLalu} positifBaik={false} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `components/dashboard/RecentTransactionsList.tsx`**

```tsx
import Link from "next/link";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Row {
  id: string;
  tanggal: Date | string;
  jumlah: string | number;
  jenis: "income" | "expense" | "transfer";
  catatan: string | null;
  dompet: { nama: string } | null;
  dompetAsal: { nama: string } | null;
  dompetTujuan: { nama: string } | null;
  kategori: { nama: string } | null;
}

export function RecentTransactionsList({ rows }: { rows: Row[] }) {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Transaksi terbaru</h2>
        <Link href="/transaksi" className="text-xs font-medium text-accent hover:underline">
          Lihat semua
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {rows.length === 0 && <li className="py-4 text-sm text-text-secondary">Belum ada transaksi.</li>}
        {rows.map((row) => {
          const keterangan = row.jenis === "transfer"
            ? `Transfer: ${row.dompetAsal?.nama ?? "-"} -> ${row.dompetTujuan?.nama ?? "-"}`
            : row.kategori?.nama ?? "-";
          const jumlahClass = row.jenis === "income" ? "text-success" : row.jenis === "expense" ? "text-danger" : "text-text-primary";
          const prefix = row.jenis === "income" ? "+" : row.jenis === "expense" ? "-" : "";
          return (
            <li key={row.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="block text-text-primary">{keterangan}</span>
                <span className="block text-xs text-text-secondary">{formatTanggal(row.tanggal)} · {row.dompet?.nama ?? "-"}</span>
              </span>
              <span className={cn("tabular-nums font-medium", jumlahClass)}>{prefix}{formatRupiah(row.jumlah)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `app/(dashboard)/page.tsx`**

Server Component (no `"use client"`), `async function`, calls `getDashboardData()` directly, renders `SummaryCards`, a `DompetCard`-based wallet strip (reuse Task 6's `DompetCard` in read-only mode by omitting `onEdit`/`onDelete`), `TrendChart` inside a `.surface-card` titled "Tren 6 bulan terakhir", `CategoryDonutChart` inside a `.surface-card` titled "Pengeluaran per kategori bulan ini", and `RecentTransactionsList`.

```tsx
import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard-data";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactionsList } from "@/components/dashboard/RecentTransactionsList";
import { DompetCard } from "@/components/dompet/DompetCard";
import { TrendChart } from "@/components/chart/TrendChart";
import { CategoryDonutChart } from "@/components/chart/CategoryDonutChart";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Ringkasan bulan ini</h1>
        <p className="mt-1 text-sm text-text-secondary">Saldo, tren, dan aktivitas terbaru semua dompet Anda.</p>
      </div>

      <SummaryCards
        totalSaldo={data.totalSaldo}
        pemasukanBulanIni={data.pemasukanBulanIni}
        pengeluaranBulanIni={data.pengeluaranBulanIni}
        persenPemasukanVsBulanLalu={data.persenPemasukanVsBulanLalu}
        persenPengeluaranVsBulanLalu={data.persenPengeluaranVsBulanLalu}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Dompet</h2>
          <Link href="/dompet" className="text-xs font-medium text-accent hover:underline">Kelola dompet</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.dompet.map((d) => (
            <DompetCard key={d.id} id={d.id} nama={d.nama} tipe={d.tipe as any} warna={d.warna} saldoBerjalan={d.saldoBerjalan} diarsipkan={false} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Tren 6 bulan terakhir</h2>
          <TrendChart data={data.trend6Bulan} />
        </div>
        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Pengeluaran per kategori bulan ini</h2>
          <CategoryDonutChart data={data.topKategoriBulanIni} />
        </div>
      </div>

      <RecentTransactionsList rows={data.transaksiTerbaru} />
    </div>
  );
}
```

- [ ] **Step 7: Manual browser verification**

Log in, land on `/`. Confirm all real numbers show (not the old "segera hadir" placeholder), the bar chart renders 6 months, the donut chart renders current month's expense categories with percentages, wallet cards match `/dompet`, and the 5 most recent transactions match `/transaksi`'s first page ordering.

- [ ] **Step 8: Commit**

```bash
git add lib/dashboard-data.ts components/dashboard components/chart app/\(dashboard\)/page.tsx
git commit -m "feat: build live dashboard with summary cards, wallet list, trend and category charts"
```

---

## Task 10: Laporan page (range-switchable charts + optional per-wallet chart)

**Files:**
- Create: `lib/laporan-data.ts`
- Create: `lib/actions/laporan.ts`
- Create: `components/chart/WalletBarChart.tsx`
- Modify: `app/(dashboard)/laporan/page.tsx`

**Interfaces:**
- Consumes: `buildTransaksiWhere`, `getDompetDenganSaldo` (Task 2); `TrendChart`, `CategoryDonutChart` (Task 9)
- Produces: `getTrendData(bulanRange: 3 | 6 | 12): Promise<{bulan:string; pemasukan:number; pengeluaran:number}[]>`, `getBreakdownKategori(dari: Date, sampai: Date): Promise<{nama:string; warna:string; total:number; persen:number}[]>` (`lib/laporan-data.ts`)
- Produces: `"use server"` actions `fetchTrend(bulanRange)` and `fetchBreakdown(dari, sampai)` in `lib/actions/laporan.ts`, wrapping the above for client-side range switching without adding new REST routes (keeps the API contract in `AGENT/03-TECH-ARCHITECTURE.md` §5 exact — dashboard/laporan reads don't need REST endpoints)

- [ ] **Step 1: Write `lib/laporan-data.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { getDompetDenganSaldo } from "@/lib/dompet-saldo";
import { awalBulan, akhirBulan, tambahBulan, formatBulan } from "@/lib/format";

async function sumJenis(jenis: "income" | "expense", dari: Date, sampai: Date): Promise<number> {
  const result = await prisma.transaksi.aggregate({
    where: { jenis, tanggal: { gte: dari, lte: sampai } },
    _sum: { jumlah: true },
  });
  return Number(result._sum.jumlah ?? 0);
}

export async function getTrendData(bulanRange: 3 | 6 | 12) {
  const now = new Date();
  const trend = [];
  for (let i = bulanRange - 1; i >= 0; i--) {
    const bulan = tambahBulan(now, -i);
    const [pemasukan, pengeluaran] = await Promise.all([
      sumJenis("income", awalBulan(bulan), akhirBulan(bulan)),
      sumJenis("expense", awalBulan(bulan), akhirBulan(bulan)),
    ]);
    trend.push({ bulan: formatBulan(bulan), pemasukan, pengeluaran });
  }
  return trend;
}

export async function getBreakdownKategori(dari: Date, sampai: Date) {
  const breakdownRaw = await prisma.transaksi.groupBy({
    by: ["kategoriId"],
    where: { jenis: "expense", tanggal: { gte: dari, lte: sampai }, kategoriId: { not: null } },
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: "desc" } },
  });

  const kategoriIds = breakdownRaw.map((r) => r.kategoriId).filter((id): id is string => id !== null);
  const kategoriList = await prisma.kategori.findMany({ where: { id: { in: kategoriIds } } });
  const totalPengeluaran = breakdownRaw.reduce((sum, r) => sum + Number(r._sum.jumlah ?? 0), 0) || 1;

  return breakdownRaw.map((r) => {
    const kategori = kategoriList.find((k) => k.id === r.kategoriId);
    const total = Number(r._sum.jumlah ?? 0);
    return {
      nama: kategori?.nama ?? "Lainnya",
      warna: kategori?.warna ?? "#6B6A64",
      total,
      persen: (total / totalPengeluaran) * 100,
    };
  });
}

export async function getBreakdownDompet() {
  const dompetDenganSaldo = await getDompetDenganSaldo();
  return dompetDenganSaldo
    .filter((d) => !d.diarsipkan)
    .map((d) => ({ nama: d.nama, warna: d.warna, saldo: Number(d.saldoBerjalan) }));
}
```

- [ ] **Step 2: Write `lib/actions/laporan.ts`**

```ts
"use server";

import { getTrendData, getBreakdownKategori } from "@/lib/laporan-data";
import { awalBulan, akhirBulan } from "@/lib/format";

export async function fetchTrend(bulanRange: 3 | 6 | 12) {
  return getTrendData(bulanRange);
}

export async function fetchBreakdownBulanIni() {
  const now = new Date();
  return getBreakdownKategori(awalBulan(now), akhirBulan(now));
}
```

- [ ] **Step 3: Write `components/chart/WalletBarChart.tsx`**

```tsx
"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";

interface WalletBarChartProps {
  data: { nama: string; warna: string; saldo: number }[];
}

export function WalletBarChart({ data }: WalletBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nama"
          width={100}
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(value: number) => formatRupiah(value)} />
        <Bar dataKey="saldo" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.nama} fill={entry.warna} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Rewrite `app/(dashboard)/laporan/page.tsx`**

Client component (needs range-switch interactivity). On mount and whenever `bulanRange` changes, calls the `fetchTrend` server action; breakdown period is fixed to bulan berjalan per spec §6 default (loaded once via `fetchBreakdownBulanIni`). Wallet chart data is fetched once through a tiny inline `getBreakdownDompet` call — since that one has no interactive range, expose it the same way (`fetchBreakdownDompet` action) for consistency.

- [ ] **Step 4a: Add `fetchBreakdownDompet` to `lib/actions/laporan.ts`**

```ts
export async function fetchBreakdownDompet() {
  const { getBreakdownDompet } = await import("@/lib/laporan-data");
  return getBreakdownDompet();
}
```

- [ ] **Step 4b: Write the page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendChart } from "@/components/chart/TrendChart";
import { CategoryDonutChart } from "@/components/chart/CategoryDonutChart";
import { WalletBarChart } from "@/components/chart/WalletBarChart";
import { fetchTrend, fetchBreakdownBulanIni, fetchBreakdownDompet } from "@/lib/actions/laporan";
import { cn } from "@/lib/cn";

type TrendPoint = { bulan: string; pemasukan: number; pengeluaran: number };
type BreakdownPoint = { nama: string; warna: string; total: number; persen: number };
type WalletPoint = { nama: string; warna: string; saldo: number };

export default function LaporanPage() {
  const [bulanRange, setBulanRange] = useState<3 | 6 | 12>(6);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownPoint[] | null>(null);
  const [walletChart, setWalletChart] = useState<WalletPoint[] | null>(null);

  useEffect(() => {
    fetchTrend(bulanRange).then(setTrend);
  }, [bulanRange]);

  useEffect(() => {
    fetchBreakdownBulanIni().then(setBreakdown);
    fetchBreakdownDompet().then(setWalletChart);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Laporan</h1>
        <p className="mt-1 text-sm text-text-secondary">Tren dan rincian keuangan Anda dari waktu ke waktu.</p>
      </div>

      <div className="surface-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Tren pemasukan vs pengeluaran</h2>
          <div className="flex gap-1 rounded-control border border-border p-1">
            {[3, 6, 12].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBulanRange(value as 3 | 6 | 12)}
                className={cn(
                  "min-h-8 rounded-control px-3 text-xs font-medium transition-colors duration-150",
                  bulanRange === value ? "bg-accent-soft text-accent" : "text-text-secondary",
                )}
              >
                {value} bulan
              </button>
            ))}
          </div>
        </div>
        {trend === null ? <Skeleton className="h-64" /> : <TrendChart data={trend} />}
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Pengeluaran per kategori (bulan ini)</h2>
        {breakdown === null ? <Skeleton className="h-48" /> : <CategoryDonutChart data={breakdown} />}
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Perbandingan saldo antar dompet</h2>
        {walletChart === null ? <Skeleton className="h-48" /> : <WalletBarChart data={walletChart} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Manual browser verification**

Log in, go to `/laporan`. Confirm switching 3/6/12 bulan re-renders the bar chart with the right number of bars, the donut chart shows this month's expense categories with legend percentages, and the wallet bar chart lists all non-archived wallets. Resize to mobile width and confirm no chart overflows horizontally (Recharts `ResponsiveContainer` should already handle this — visually confirm).

- [ ] **Step 6: Commit**

```bash
git add lib/laporan-data.ts lib/actions/laporan.ts components/chart/WalletBarChart.tsx app/\(dashboard\)/laporan/page.tsx
git commit -m "feat: build laporan page with range-switchable trend, category, and wallet charts"
```

---

## Task 11: Final quality gate

**Files:** none created — verification only, fixing whatever the commands surface.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors. Fix any and re-run until clean.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors, in particular around `Prisma.Decimal` usage in `lib/dompet-saldo.ts`/`lib/dashboard-data.ts` and the `RouteContext<...>` typed route params in every `app/api/**/[id]/route.ts` file. Fix any and re-run until clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds with zero errors (per `AGENT/00-AGENT-BRIEF.md` §"Definisi selesai tanpa error").

- [ ] **Step 4: Full manual pass**

With `npm run dev` running, walk every page front-to-back once more: login → dashboard → dompet (add/edit/archive/delete) → transaksi (all three jenis, all filters, edit, delete, pagination if you have >20 rows) → laporan (all three range buttons) → logout. Open browser DevTools console throughout and confirm zero console errors, matching the brief's definition of done.

- [ ] **Step 5: Commit** (only if Steps 1-3 required fixes)

```bash
git add -A
git commit -m "fix: resolve lint/typecheck/build issues from full feature pass"
```

---

## Not in this plan (flag to user, don't implement silently)

- **Deployment to the user's VPS** (`AGENT/04-DEPLOYMENT-VPS.md`) — needs real SSH access, a real domain, and DNS changes the agent shouldn't perform unattended. Revisit once Task 11 is green.
- Anything from the brief's scope lock (multi-user/registration, bank/payment integration, email/push notifications, AI/prediction) — explicitly out of scope.
