import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-1 px-4 py-3 md:hidden">
          <LogoutButton variant="icon" />
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-2 md:px-8 md:pb-8 md:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
