import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Outlet, useLocation } from "react-router-dom";

const pageTitleMap: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/auto-shipping-config": "Auto Shipping Config",
  "/warehouse/perhitungan-selisih": "Perhitungan Selisih",
  "/warehouse/products": "Products",
  "/hpp": "HPP",
};

export default function Layout() {
  const location = useLocation();

  const pageTitle = pageTitleMap[location.pathname] ?? "Rimu";

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full min-h-svh">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/95 px-3 py-2 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8" />
            <span className="text-sm font-semibold">{pageTitle}</span>
          </div>
          <span className="text-sm font-bold text-orange-600">Rimu</span>
        </header>

        <div className="p-3 md:p-6">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
