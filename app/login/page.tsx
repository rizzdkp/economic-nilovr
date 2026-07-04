"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IconEye, IconEyeOff, IconLock, IconWallet } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message ?? "Password salah, coba lagi.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-accent text-white">
            <IconWallet size={24} stroke={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Catatan Keuangan</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Masukkan password untuk mengakses dompet dan transaksi Anda
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-secondary">
              <IconLock size={18} stroke={1.75} />
            </span>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoFocus
              required
              className="pl-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-4 flex items-center text-text-secondary hover:text-text-primary"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <IconEyeOff size={18} stroke={1.75} />
              ) : (
                <IconEye size={18} stroke={1.75} />
              )}
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={isSubmitting || password.length === 0}>
            {isSubmitting ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </div>
    </main>
  );
}
