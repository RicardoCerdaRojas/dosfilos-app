import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleButtons } from '@/components/theme-toggle-buttons';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden flex flex-col transition-[margin-left] duration-300 ease-in-out md:ml-[var(--sidebar-width)] md:peer-data-[state=collapsed]:ml-0">
        {/* Header with toggle button */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <ThemeToggleButtons />
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/40 p-4 pl-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
