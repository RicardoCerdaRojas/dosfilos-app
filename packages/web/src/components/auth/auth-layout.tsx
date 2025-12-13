import { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center items-center p-12 text-primary-foreground">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-12 w-12" />
            <h1 className="text-4xl font-bold">DosFilos.Preach</h1>
          </div>
          <p className="text-xl opacity-90">
            Herramientas para el Ministerio Pastoral
          </p>
          <p className="text-lg opacity-75">
            Gestiona tus sermones y genera contenido con IA para potenciar tu ministerio
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">DosFilos.Preach</span>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  );
}
