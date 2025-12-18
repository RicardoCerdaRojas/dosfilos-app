import { ReactNode } from 'react';
import { BookOpen, Check, Sparkles, Brain, Clock } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useTranslation('auth');
  
  const benefits = [
    { icon: Clock, text: t('layout.benefits.0') },
    { icon: Brain, text: t('layout.benefits.1') },
    { icon: Sparkles, text: t('layout.benefits.2') },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Enhanced Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)' 
        }}
      >
        {/* Decorative elements */}
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #a5b4fc 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <BookOpen className="h-8 w-8" />
            </div>
            <span className="text-2xl font-bold">DosFilos.Preach</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-md">
          {/* Main Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              {t('layout.tagline')}
            </h1>
            <p className="text-xl text-blue-100">
              {t('layout.subtitle')}
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <span className="text-blue-100">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Trust indicator */}
          <div 
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((n) => (
                <div 
                  key={n}
                  className="w-8 h-8 rounded-full border-2 border-white/30"
                  style={{ 
                    background: `linear-gradient(135deg, hsl(${n * 60}, 70%, 60%) 0%, hsl(${n * 60 + 30}, 70%, 50%) 100%)` 
                  }}
                />
              ))}
            </div>
            <div>
              <div className="font-semibold">{t('layout.social.count')}</div>
              <div className="text-sm text-blue-200">{t('layout.social.description')}</div>
            </div>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 pt-8 border-t border-white/20">
          <blockquote className="text-blue-100 italic">
            "{t('layout.quote')}"
          </blockquote>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
            <div>
              <div className="font-semibold">{t('layout.quoteAuthor')}</div>
              <div className="text-sm text-blue-200">{t('layout.quoteRole')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            >
              <BookOpen className="h-8 w-8 text-white" />
            </div>
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
