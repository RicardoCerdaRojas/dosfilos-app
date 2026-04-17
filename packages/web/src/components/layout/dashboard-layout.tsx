import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggleButtons } from '@/components/theme-toggle-buttons';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/i18n/components/LanguageSwitcher';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/context/firebase-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { useSmartTriggers } from '@/hooks/useSmartTriggers';

export function DashboardLayout() {
  const location = useLocation();
  const { user } = useFirebase();
  const isPlanner = location.pathname.includes('/planner');
  const isGenerator = location.pathname.includes('/sermons/generate');
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // Initialize Smart Triggers
  useSmartTriggers();

  // Load user's current plan
  useEffect(() => {
    const loadUserPlan = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const planId = userData?.subscription?.planId || 'free';
          setCurrentPlan(planId);
        }
      } catch (error) {
        console.error('Error loading user plan:', error);
        setCurrentPlan('free');
      }
    };

    loadUserPlan();
  }, [user]);

  // Get plan badge styles
  const getPlanBadgeStyles = () => {
    const styles = {
      free: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', name: 'Free' },
      pro: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', name: 'Pro' },
      team: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', name: 'Team' }
    };
    
    return styles[currentPlan as keyof typeof styles] || styles.free;
  };

  const planStyles = getPlanBadgeStyles();

  // Track dashboard visits for "Stuck User" trigger
  useEffect(() => {
    if (location.pathname === '/dashboard') {
        const visits = parseInt(localStorage.getItem('dashboard_visits') || '0');
        localStorage.setItem('dashboard_visits', (visits + 1).toString());
    }
  }, [location.pathname]);

  const isBible = location.pathname.includes('/bible');
  const isSermonDetail = location.pathname.startsWith('/dashboard/sermons/') && location.pathname !== '/dashboard/sermons';
  const isFullScreen = isPlanner || isGenerator || isSermonDetail || isBible;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={cn(
        isFullScreen ? "h-svh overflow-hidden print:h-auto print:overflow-visible" : "min-h-svh print:h-auto", 
        isFullScreen && "md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:rounded-none"
      )}>
        {/* Header with toggle button */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          
          {/* Plan Badge */}
          <Badge 
            variant="outline" 
            className={`${planStyles.bg} ${planStyles.text} ${planStyles.border} text-xs font-semibold`}
          >
            Plan {planStyles.name}
          </Badge>
          
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher variant="ghost" showLabel={false} />
            <ThemeToggleButtons />
          </div>
        </header>
        
        {/* Main content */}
        <main className={cn(
          "flex-1 flex flex-col print:block print:overflow-visible print:h-auto",
          // Apps that need full height control (no parent scroll, no parent padding)
          isFullScreen ? "overflow-hidden h-full" : "overflow-y-auto bg-muted/40 p-4 md:p-2"
        )}>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
