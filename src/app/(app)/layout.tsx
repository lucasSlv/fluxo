import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { LookupsProvider } from "@/components/layout/lookups";
import { QuickAddProvider } from "@/components/layout/quick-add";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/modules/auth/dal";
import { getLookups } from "@/modules/shared/lookups";
import { alertCount } from "@/modules/dashboard/alerts";
import { serialize } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [lookups, alerts] = await Promise.all([getLookups(user.id), alertCount(user.id, user.preferences)]);
  return (
    <ToastProvider>
      <LookupsProvider value={serialize(lookups)}>
        <QuickAddProvider>
          <Sidebar />
          <div className="min-h-dvh p-3 pb-24 md:py-4 md:pl-[108px] md:pr-4 md:pb-4">
            <main className="mx-auto min-h-[calc(100dvh-2rem)] max-w-[1400px] rounded-[28px] bg-surface p-4 shadow-soft sm:p-6 lg:p-8">
              <Topbar name={user.name} alerts={alerts} />
              <div>{children}</div>
            </main>
          </div>
          <MobileNav />
        </QuickAddProvider>
      </LookupsProvider>
    </ToastProvider>
  );
}
