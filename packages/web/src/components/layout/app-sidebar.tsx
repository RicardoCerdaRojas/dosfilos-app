import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Home, FileText, Sparkles, Settings, LogOut, 
  BookOpen, BookMarked, Library, ChevronUp, User2, Bell, Users, CreditCard, Database, GraduationCap, BarChart3 
} from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';
import { authService } from '../../../../application/src/services/AuthService';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggleMenu } from '@/components/theme-toggle';
import { useTranslation } from '@/i18n';
import { doc, getDoc } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { t } = useTranslation('navigation');
  const { subscription } = useSubscription();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Get plan display info
  const getPlanBadge = () => {
    if (!subscription) return null;
    
    const planColors = {
      free: 'bg-gray-100 text-gray-700 border-gray-200',
      pro: 'bg-blue-100 text-blue-700 border-blue-200',
      team: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    
    const planNames = {
      free: 'Free',
      pro: 'Pro',
      team: 'Team'
    };
    
    const planId = subscription.planId || 'free';
    const colorClass = planColors[planId as keyof typeof planColors] || planColors.free;
    const planName = planNames[planId as keyof typeof planNames] || 'Free';
    
    return { colorClass, planName };
  };

  const planBadge = getPlanBadge();

  // Check if user is super admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.role === 'super_admin');
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user]);

  const navigationGroups = [
    // Group 1: Main
    [
      { name: t('menu.dashboard'), href: '/dashboard', icon: Home },
      { name: t('menu.greekTutor'), href: '/dashboard/greek-tutor', icon: GraduationCap },
      { name: t('menu.sermons'), href: '/dashboard/sermons', icon: FileText },
    ],
    // Group 2: Planning
    [
      { name: t('menu.plans'), href: '/dashboard/plans', icon: BookMarked },
      { name: t('menu.generateSermon'), href: '/dashboard/generate-sermon', icon: Sparkles },
    ],
    // Group 3: Resources
    [
      { name: t('menu.library'), href: '/dashboard/library', icon: Library },
      { name: t('menu.settings'), href: '/dashboard/settings', icon: Settings },
      { name: t('menu.subscription'), href: '/dashboard/subscription', icon: CreditCard },
    ],
  ];

  const adminNavigation = [
    { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
    { name: 'Gestión de Usuarios', href: '/dashboard/admin/users', icon: Users },
    { name: t('menu.contactLeads'), href: '/admin/leads', icon: Users },
    { name: 'Biblioteca Core', href: '/dashboard/admin/core-library', icon: Database },
  ];

  // Subscribe to new leads count for admin
  useEffect(() => {
    if (!user || !isAdmin) return;

    const q = query(
      collection(db, 'contact_leads'),
      where('status', '==', 'new')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNewLeadsCount(snapshot.size);
    }, (error) => {
      console.error('Error counting new leads:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success(t('user.sessionClosed'));
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || t('errors.logoutError'));
    }
  };

  const getUserInitials = () => {
    if (!user?.displayName) return 'U';
    return user.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-1 py-3 relative">
          <div className="relative">
            <div className="p-1 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            {/* Badge - Always visible, positioned over icon */}
            {planBadge && (
              <Badge 
                variant="outline" 
                className={`absolute -top-1 -right-1 text-[10px] font-semibold px-1 py-0 h-4 ${planBadge.colorClass}`}
              >
                {planBadge.planName}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
            <span className="text-xl font-bold">DosFilos.Preach</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {navigationGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.href}>
                            <item.icon className="h-5 w-5" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {/* Add separator between groups (except after last group) */}
            {groupIndex < navigationGroups.length - 1 && <SidebarSeparator />}
          </div>
        ))}

        {/* Admin Section - Only visible for admin users */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <div className="px-2 py-1 text-xs font-semibold text-amber-600 group-data-[collapsible=icon]:hidden">
                    ⚡ Admin
                  </div>
                  {adminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const isLeadsItem = item.href === '/admin/leads';
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.href} className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <item.icon className="h-5 w-5" />
                              <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                            </div>
                            {isLeadsItem && newLeadsCount > 0 && (
                              <span 
                                className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full group-data-[collapsible=icon]:hidden"
                                style={{ 
                                  backgroundColor: '#ef4444', 
                                  color: 'white',
                                  minWidth: '20px',
                                  textAlign: 'center'
                                }}
                              >
                                {newLeadsCount > 99 ? '99+' : newLeadsCount}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer with User Menu */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full h-12 px-2 hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden flex-1">
                    <span className="text-sm font-medium truncate w-full">
                      {user?.displayName || t('user.defaultName')}
                    </span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || t('user.defaultName')}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Theme Submenu */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {t('user.appearance')}
                </DropdownMenuLabel>
                <ThemeToggleMenu />
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem>
                  <User2 className="mr-2 h-4 w-4" />
                  {t('user.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  {t('user.notifications')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('user.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="text-xs text-muted-foreground text-center py-2 group-data-[collapsible=icon]:hidden">
          DosFilos.Preach v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
