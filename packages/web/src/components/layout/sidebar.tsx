import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, FileText, Sparkles, Home, Settings, LogOut, Bell, Calendar, BookMarked, Languages, CreditCard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirebase } from '@/context/firebase-context';
import { authService } from '../../../../application/src/services/AuthService';
import { toast } from 'sonner';

const navigationGroups = [
  // Group 1: Main
  [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Entrenador Griego', href: '/dashboard/greek-tutor', icon: Languages },
    { name: 'Sermones', href: '/dashboard/sermons', icon: FileText },
  ],
  // Group 2: Planning
  [
    { name: 'Planes de Predicación', href: '/dashboard/plans', icon: Calendar },
    { name: 'Generar Sermón', href: '/dashboard/generate-sermon', icon: Sparkles },
  ],
  // Group 3: Resources
  [
    { name: 'Biblioteca', href: '/dashboard/library', icon: BookMarked },
    { name: 'Mi Suscripción', href: '/dashboard/subscription', icon: CreditCard },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ],
];

export function Sidebar() {
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
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <BookOpen className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">DosFilos.Preach</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link 
                    key={item.name} 
                    to={item.href}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start gap-3',
                        isActive && 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
              {/* Separator between groups (except after last group) */}
              {groupIndex < navigationGroups.length - 1 && (
                <div className="my-2 border-t" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User Menu Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative flex-shrink-0">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">
                    {user?.displayName || 'Usuario'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {user?.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configuración</DropdownMenuItem>
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
        </div>
        
        <div className="text-xs text-muted-foreground text-center mt-2">
          DosFilos.Preach v0.1.0
        </div>
      </div>
    </div>
  );
}
