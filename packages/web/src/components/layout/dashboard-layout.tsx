import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleButtons } from '@/components/theme-toggle-buttons';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher';

import { useSmartTriggers } from '@/hooks/useSmartTriggers';

export function DashboardLayout() {
  const location = useLocation();
  const isPlanner = location.pathname.startsWith('/planner');
  const isGenerator = location.pathname.includes('/sermons/generate');

  // Initialize Smart Triggers
  useSmartTriggers();

  // Track dashboard visits for "Stuck User" trigger
  useEffect(() => {
    if (location.pathname === '/dashboard') {
        const visits = parseInt(localStorage.getItem('dashboard_visits') || '0');
        localStorage.setItem('dashboard_visits', (visits + 1).toString());
    }
  }, [location.pathname]);

  // DEBUG: Log location changes
  useEffect(() => {
    console.log('[DashboardLayout] Location changed to:', location.pathname);
    console.log('[DashboardLayout] isGenerator:', isGenerator);
  }, [location.pathname, isGenerator]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with toggle button */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher variant="ghost" showLabel={false} />
            <ThemeToggleButtons />
          </div>
        </header>
        
        {/* Main content */}
        <main className={cn(
          "flex-1",
          // Generator needs fixed height with no scroll (scroll is internal)
          isGenerator ? "overflow-hidden h-[calc(100vh-4rem)]" : "overflow-y-auto",
          !isPlanner && !isGenerator && "bg-muted/40 p-4 md:p-2"
        )}>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
