import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, FileText, Sparkles, Settings, LogOut, 
  BookOpen, BookMarked, Library, ChevronUp, User2, Bell 
} from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';
import { authService } from '../../../../application/src/services/AuthService';
import { toast } from 'sonner';
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

const navigationGroups = [
  // Group 1: Main
  [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Sermones', href: '/dashboard/sermons', icon: FileText },
  ],
  // Group 2: Planning
  [
    { name: 'Planes de Predicación', href: '/dashboard/plans', icon: BookMarked },
    { name: 'Generar Sermón', href: '/dashboard/generate-sermon', icon: Sparkles },
  ],
  // Group 3: Resources
  [
    { name: 'Biblioteca', href: '/dashboard/library', icon: Library },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ],
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useFirebase();

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Sesión cerrada');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Error al cerrar sesión');
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
    <Sidebar collapsible="offcanvas" className="peer border-0">
      {/* Header */}
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">DosFilos.Preach</span>
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
                            <span>{item.name}</span>
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
                      {user?.displayName || 'Usuario'}
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
                      {user?.displayName || 'Usuario'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Theme Submenu */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Apariencia
                </DropdownMenuLabel>
                <ThemeToggleMenu />
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem>
                  <User2 className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Notificaciones
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="text-xs text-muted-foreground text-center py-2">
          DosFilos.Preach v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
