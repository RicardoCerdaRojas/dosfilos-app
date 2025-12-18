import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Check, ChevronRight, Play, Star, 
  Sparkles, BookMarked, MessageSquare,
  ArrowRight, Menu, X, Clock, Target, Brain,
  Zap, Users, Languages, Mic, Share2,
  MessageCircle, Library, Bot, GraduationCap,
  TrendingUp, Award, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContactModal } from '@/components/contact/ContactModal';
import { useTranslation, LanguageSwitcher } from '@/i18n';

export function Landing() {
  // i18n hooks
  const { t } = useTranslation('landing');
  const { t: tNav } = useTranslation('navigation');
  const { t: tCommon } = useTranslation('common');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalType, setContactModalType] = useState<'sales' | 'scholarship' | 'support' | 'demo'>('sales');

  const openContactModal = (type: 'sales' | 'scholarship' | 'support' | 'demo') => {
    setContactModalType(type);
    setContactModalOpen(true);
  };

  const heroImages = [
    {
      src: '/sermon_generator_ui_1765598945966.png',
      alt: 'DosFilos.app - Interfaz de análisis bíblico con griego y estructura expositiva',
      title: 'Generador de Sermones'
    },
    {
      src: '/dashboard_overview_ui_1765599370568.png',
      alt: 'DosFilos.app - Dashboard pastoral con métricas y calendario de predicación',
      title: 'Dashboard Pastoral'
    },
    {
      src: '/preach_mode_ui_es_1765600946529.png',
      alt: 'DosFilos.app - Modo de predicación con timer, notas y controles útiles',
      title: 'Modo Predicación'
    }
  ];

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="light min-h-screen bg-gradient-to-b from-slate-50 to-white" style={{ colorScheme: 'light' }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">{tNav('logo')}</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                {tNav('features')}
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                {tNav('howItWorks')}
              </a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">
                {tNav('testimonials')}
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                {tNav('pricing')}
              </a>
              
              {/* Language Switcher */}
              <LanguageSwitcher variant="ghost" showLabel={false} />
              
              <Link to="/login">
                <Button variant="ghost">{tNav('login')}</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {tNav('register')}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-slate-600 hover:text-slate-900">
                {tNav('features')}
              </a>
              <a href="#how-it-works" className="block text-slate-600 hover:text-slate-900">
                {tNav('howItWorks')}
              </a>
              <a href="#testimonials" className="block text-slate-600 hover:text-slate-900">
                {tNav('testimonials')}
              </a>
              <a href="#pricing" className="block text-slate-600 hover:text-slate-900">
                {tNav('pricing')}
              </a>
              
              {/* Language Switcher in Mobile */}
              <div className="pt-2 pb-2">
                <LanguageSwitcher variant="outline" showLabel={true} className="w-full" />
              </div>
              
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">{tNav('login')}</Button>
              </Link>
              <Link to="/register" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  {tNav('register')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Enhanced with animations */}
      <section className="pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium animate-pulse"
                style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
              >
                <Sparkles className="h-4 w-4" />
                {t('hero.badge')}
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                {t('hero.title.part1')}
                <span className="block text-blue-600">{t('hero.title.part2')}</span>
              </h1>
              
              <p className="text-xl text-slate-600 leading-relaxed">
                <strong>{t('hero.subtitle.main')}</strong> 
                {t('hero.subtitle.distinction')}
                <strong> {t('hero.subtitle.methodology')}</strong>
                <span className="block mt-2 text-blue-700 font-medium">{t('hero.subtitle.tagline')}</span>
              </p>

              {/* Trust Badges with better visibility */}
              <div className="flex flex-wrap gap-3 text-sm">
                <div 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                  style={{ 
                    backgroundColor: '#dbeafe', 
                    borderColor: '#93c5fd',
                    color: '#1e3a5f'
                  }}
                >
                  <Check className="h-4 w-4" style={{ color: '#16a34a' }} />
                  <span className="font-medium">{t('hero.badges.hermeneutics')}</span>
                </div>
                <div 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                  style={{ 
                    backgroundColor: '#dbeafe', 
                    borderColor: '#93c5fd',
                    color: '#1e3a5f'
                  }}
                >
                  <Check className="h-4 w-4" style={{ color: '#16a34a' }} />
                  <span className="font-medium">{t('hero.badges.languages')}</span>
                </div>
                <div 
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                  style={{ 
                    backgroundColor: '#dbeafe', 
                    borderColor: '#93c5fd',
                    color: '#1e3a5f'
                  }}
                >
                  <Check className="h-4 w-4" style={{ color: '#16a34a' }} />
                  <span className="font-medium">{t('hero.badges.approach')}</span>
                </div>
              </div>

              {/* CTA Buttons with glow effect */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button 
                    size="lg" 
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 relative overflow-hidden group"
                    style={{
                      boxShadow: '0 0 30px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <span className="relative z-10 flex items-center">
                      {t('hero.cta.primary')}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6"
                  style={{ 
                    borderColor: '#cbd5e1', 
                    borderWidth: '2px',
                    color: '#334155'
                  }}
                >
                  <Play className="mr-2 h-5 w-5" />
                  {t('hero.cta.secondary')}
                </Button>
              </div>


              {/* Social Proof */}
              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white" />
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">{t('hero.socialProof.pastors')}</div>
                    <div className="text-slate-600">{t('hero.socialProof.trusting')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-900">{t('hero.socialProof.rating')}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image Carousel with enhanced animation */}
            <div className="relative">
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
                style={{
                  animation: 'float 6s ease-in-out infinite'
                }}
              >
                {/* Carousel Images */}
                {heroImages.map((image, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-1000 ${
                      index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0'
                    }`}
                  >
                    <img 
                      src={image.src} 
                      alt={image.alt}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
                
                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex 
                          ? 'bg-blue-600 w-8' 
                          : 'bg-white/50 hover:bg-white/75 w-2'
                      }`}
                      aria-label={`Ver imagen ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Floating Cards with animation */}
              <div 
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-slate-100"
                style={{ animation: 'floatCard 4s ease-in-out infinite' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                    <Languages className="h-5 w-5" style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t('hero.floatingCards.greekAnalysis.title')}</div>
                    <div className="text-xs text-slate-600">{t('hero.floatingCards.greekAnalysis.subtitle')}</div>
                  </div>
                </div>
              </div>
              <div 
                className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-lg border border-slate-100"
                style={{ animation: 'floatCard 4s ease-in-out infinite 1s' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#dbeafe' }}>
                    <GraduationCap className="h-5 w-5" style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t('hero.floatingCards.trainer.title')}</div>
                    <div className="text-xs text-slate-600">{t('hero.floatingCards.trainer.subtitle')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Metrics Bar */}
      <section className="py-8 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="h-6 w-6" />
                <span className="text-3xl font-bold">{t('metrics.timeSaved.value')}</span>
              </div>
              <p className="text-blue-100 text-sm">{t('metrics.timeSaved.label')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-3xl font-bold">{t('metrics.depth.value')}</span>
              </div>
              <p className="text-blue-100 text-sm">{t('metrics.depth.label')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-6 w-6" />
                <span className="text-3xl font-bold">{t('metrics.pastors.value')}</span>
              </div>
              <p className="text-blue-100 text-sm">{t('metrics.pastors.label')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="h-6 w-6" />
                <span className="text-3xl font-bold">{t('metrics.satisfaction.value')}</span>
              </div>
              <p className="text-blue-100 text-sm">{t('metrics.satisfaction.label')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After Section - PREMIUM DESIGN */}
      <section className="py-24 relative overflow-hidden">
        {/* Background gradient and decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
            >
              <Zap className="h-4 w-4" />
              {t('transformation.badge')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              {t('transformation.title.part1')}
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('transformation.title.part2')}
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('transformation.subtitle.main')} <strong>{t('transformation.subtitle.emphasis')}</strong> 
              {t('transformation.subtitle.detail')}
            </p>
          </div>

          {/* Premium Cards Container */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before Card - Glass Effect */}
            <div 
              className="relative p-1 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)' }}
            >
              <div 
                className="h-full rounded-3xl p-8 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-2xl"
                      style={{ background: 'linear-gradient(135deg, #fecaca 0%, #fee2e2 100%)' }}
                    >
                      <Clock className="h-6 w-6" style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t('transformation.before.title')}</h3>
                      <p className="text-sm text-slate-500">{t('transformation.before.subtitle')}</p>
                    </div>
                  </div>
                  <div 
                    className="px-4 py-2 rounded-full text-sm font-bold"
                    style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                  >
                    {t('transformation.before.timeLabel')}
                  </div>
                </div>

                {/* Pain Points */}
                <div className="space-y-4">
                  {(t('transformation.before.points', { returnObjects: true }) as Array<{title: string, description: string}>).map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#fef2f2' }}
                    >
                      <div 
                        className="p-1.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#fecaca' }}
                      >
                        <X className="h-4 w-4" style={{ color: '#dc2626' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* After Card - Glass Effect */}
            <div 
              className="relative p-1 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)' }}
            >
              <div 
                className="h-full rounded-3xl p-8 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-2xl"
                      style={{ background: 'linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)' }}
                    >
                      <Zap className="h-6 w-6" style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{t('transformation.after.title')}</h3>
                      <p className="text-sm text-slate-500">{t('transformation.after.subtitle')}</p>
                    </div>
                  </div>
                  <div 
                    className="px-4 py-2 rounded-full text-sm font-bold"
                    style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}
                  >
                    {t('transformation.after.timeLabel')}
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-4">
                  {(t('transformation.after.points', { returnObjects: true }) as Array<{title: string, description: string}>).map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#f0fdf4' }}
                    >
                      <div 
                        className="p-1.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#bbf7d0' }}
                      >
                        <Check className="h-4 w-4" style={{ color: '#16a34a' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trainer Analogy - Premium Card */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div 
              className="relative p-1 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)' }}
            >
              <div 
                className="rounded-3xl p-8 md:p-12"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div 
                    className="p-6 rounded-2xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
                  >
                    <GraduationCap className="h-12 w-12" style={{ color: '#d97706' }} />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      {t('transformation.analogy.emoji')} {t('transformation.analogy.title')}
                    </h3>
                    <p className="text-lg text-slate-700 leading-relaxed">
                      {t('transformation.analogy.description')} <strong className="text-amber-700">{t('transformation.analogy.emphasis')}</strong> {t('transformation.analogy.conclusion')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Not ChatGPT Section - NEW */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              {t('notChatGPT.title')}
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              {t('notChatGPT.subtitle')} <strong>{t('notChatGPT.emphasis')}</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* ChatGPT Column */}
            <div 
              className="p-8 rounded-2xl"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', borderWidth: '1px', borderStyle: 'solid' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <Bot className="h-6 w-6" style={{ color: '#ef4444' }} />
                </div>
                <h3 className="text-xl font-bold">{t('notChatGPT.generic.title')}</h3>
              </div>
              <ul className="space-y-4">
                {(t('notChatGPT.generic.points', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DosFilos Column */}
            <div 
              className="p-8 rounded-2xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e', borderWidth: '1px', borderStyle: 'solid' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
                  <GraduationCap className="h-6 w-6" style={{ color: '#22c55e' }} />
                </div>
                <h3 className="text-xl font-bold">{t('notChatGPT.dosfilos.title')}</h3>
              </div>
              <ul className="space-y-4">
                {(t('notChatGPT.dosfilos.points', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Not Just a Library Section - NEW */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {t('notLibrary.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('notLibrary.subtitle')} <strong>{t('notLibrary.question')}</strong> {t('notLibrary.capability')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            {/* Library Problem */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#fee2e2' }}>
                  <Library className="h-8 w-8" style={{ color: '#dc2626' }} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{t('notLibrary.traditional.title')}</h3>
              </div>
              <ul className="space-y-4">
                {(t('notLibrary.traditional.points', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }} />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DosFilos Solution */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#dbeafe' }}>
                  <Brain className="h-8 w-8" style={{ color: '#2563eb' }} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{t('notLibrary.assistant.title')}</h3>
              </div>
              <ul className="space-y-4">
                {(t('notLibrary.assistant.points', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#2563eb' }} />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Grammar Professor Section - NEW DIFFERENTIATOR */}
      <section className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50" />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div className="space-y-8">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}
              >
                <Languages className="h-4 w-4" />
                {t('grammarProfessor.badge')}
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                {t('grammarProfessor.title.part1')}
                <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('grammarProfessor.title.part2')}
                </span>
              </h2>
              
              <p className="text-xl text-slate-600 leading-relaxed">
                {t('grammarProfessor.subtitle')}
                <strong className="text-slate-900"> {t('grammarProfessor.emphasis')}</strong>{t('grammarProfessor.detail')}
              </p>

              {/* Comparison Points */}
              <div className="space-y-4">
                <div 
                  className="p-5 rounded-2xl border-2"
                  style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#fee2e2' }}>
                      <Library className="h-6 w-6" style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">{t('grammarProfessor.traditional.title')}</h4>
                      <p className="text-slate-600">
                        {t('grammarProfessor.traditional.description')} <strong>{t('grammarProfessor.traditional.emphasis')}</strong> {t('grammarProfessor.traditional.continuation')}
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-5 rounded-2xl border-2"
                  style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#dcfce7' }}>
                      <GraduationCap className="h-6 w-6" style={{ color: '#16a34a' }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">{t('grammarProfessor.dosfilos.title')}</h4>
                      <p className="text-slate-600">
                        {t('grammarProfessor.dosfilos.description')} <strong>{t('grammarProfessor.dosfilos.emphasis')}</strong> {t('grammarProfessor.dosfilos.explanation')} <em>{t('grammarProfessor.dosfilos.italicEmphasis')}</em>{t('grammarProfessor.dosfilos.conclusion')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Visual Demo */}
            <div className="relative">
              <div 
                className="p-1 rounded-3xl"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)' }}
              >
                <div 
                  className="rounded-3xl p-8 space-y-6"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
                >
                  <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: '#e2e8f0' }}>
                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#ede9fe' }}>
                      <Languages className="h-6 w-6" style={{ color: '#7c3aed' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{t('grammarProfessor.demo.title')}</h3>
                      <p className="text-sm text-slate-500">{t('grammarProfessor.demo.subtitle')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                      <p className="text-lg font-bold text-purple-700 mb-2">{t('grammarProfessor.demo.verse.greek')} <span className="text-indigo-600">{t('grammarProfessor.demo.verse.highlight')}</span></p>
                      <p className="text-sm text-slate-600">{t('grammarProfessor.demo.verse.translation')}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded-full mt-1" style={{ backgroundColor: '#ede9fe' }}>
                          <Check className="h-4 w-4" style={{ color: '#7c3aed' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{(t('grammarProfessor.demo.points', { returnObjects: true }) as Array<{title: string, description: string}>)?.[0]?.title}</p>
                          <p className="text-sm text-slate-600">{(t('grammarProfessor.demo.points', { returnObjects: true }) as Array<{title: string, description: string}>)?.[0]?.description}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded-full mt-1" style={{ backgroundColor: '#ede9fe' }}>
                          <Check className="h-4 w-4" style={{ color: '#7c3aed' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{(t('grammarProfessor.demo.points', { returnObjects: true }) as Array<{title: string, description: string}>)?.[1]?.title}</p>
                          <p className="text-sm text-slate-600">{(t('grammarProfessor.demo.points', { returnObjects: true }) as Array<{title: string, description: string}>)?.[1]?.description}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded-full mt-1" style={{ backgroundColor: '#ede9fe' }}>
                          <Check className="h-4 w-4" style={{ color: '#7c3aed' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Implicación para tu sermón</p>
                          <p className="text-sm text-slate-600">Enfatiza que la salvación es un regalo recibido, no un logro alcanzado</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="pt-4 border-t text-center"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <p className="text-sm text-slate-500 italic">
                      "¿Quieres que profundicemos en cómo esto conecta con el contexto de Efesios 2:1-10?"
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div 
                className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border"
                style={{ borderColor: '#e2e8f0', animation: 'floatCard 4s ease-in-out infinite' }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#dcfce7' }}>
                    <MessageCircle className="h-5 w-5" style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Pregunta lo que sea</div>
                    <div className="text-xs text-slate-600">24/7 a tu disposición</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(() => {
              const experts = t('features.experts', { returnObjects: true }) as Array<{title: string, description: string, features: string[]}>;
              const icons = [Languages, BookMarked, Mic];
              const colors = ['#8b5cf6', '#2563eb', '#16a34a'];
              
              return experts.map((expert, i) => {
                const Icon = icons[i]!;
                const color = colors[i];
                
                return (
                  <Card 
                    key={i} 
                    className="p-8 hover:shadow-xl transition-all duration-300 border-2 bg-white hover:-translate-y-1"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <div 
                      className="p-4 rounded-xl w-fit mb-6"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="h-8 w-8" style={{ color }} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{expert.title}</h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">{expert.description}</p>
                    <ul className="space-y-2">
                      {expert.features.map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 flex-shrink-0" style={{ color }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* How It Works - Improved */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {(() => {
              const steps = t('howItWorks.steps', { returnObjects: true }) as Array<{number: string, title: string, description: string}>;
              const icons = [BookOpen, Target, MessageCircle, Brain, Share2];
              const colors = ['#8b5cf6', '#2563eb', '#16a34a', '#f59e0b', '#ec4899'];
              
              return steps.map((step, i) => {
                const Icon = icons[i]!;
                const color = colors[i];
                
                return (
                  <div key={i} className="relative">
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 relative"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-7 w-7" style={{ color }} />
                        <div 
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {step.number}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                      <p className="text-sm text-slate-600">{step.description}</p>
                    </div>
                    {i < 4 && (
                      <ChevronRight className="hidden md:block absolute top-8 -right-3 h-6 w-6 text-slate-300" />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* Testimonials - HIDDEN FOR NOW
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Lo que dicen los pastores
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Pastor Juan Pérez',
                role: 'Iglesia Bautista Central',
                years: '20 años de ministerio',
                quote: 'Como pastor con experiencia, era escéptico. Pero DosFilos no escribe mis sermones - profundiza mi estudio. Es como tener un asistente de investigación teológica 24/7'
              },
              {
                name: 'Pastora María González',
                role: 'Iglesia Evangélica Vida Nueva',
                years: '15 años de ministerio',
                quote: 'Me ha permitido dedicar más tiempo al cuidado pastoral sin sacrificar la calidad de mis predicaciones. El análisis exegético es excepcional.'
              },
              {
                name: 'Pastor Carlos Rodríguez',
                role: 'Iglesia Presbiteriana',
                years: '10 años de ministerio',
                quote: 'La función de planificación de series ha transformado nuestra predicación. Ahora puedo ver meses adelante y mantener coherencia teológica.'
              }
            ].map((testimonial, i) => (
              <Card key={i} className="p-8 hover:shadow-xl transition-shadow border-2" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                    <div className="text-xs text-slate-500">{testimonial.years}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Comparison Table */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {t('comparisonTable.title')}
          </h2>
          
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border" style={{ borderColor: '#e2e8f0' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: '#1e293b' }}>
                <tr>
                  <th className="p-6 text-left text-white">{t('comparisonTable.headers.feature')}</th>
                  <th className="p-6 text-center text-white">{t('comparisonTable.headers.genericAI')}</th>
                  <th className="p-6 text-center text-white" style={{ backgroundColor: '#2563eb' }}>{t('comparisonTable.headers.dosfilos')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(t('comparisonTable.features', { returnObjects: true }) as string[]).map((feature, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 font-medium text-slate-900">{feature}</td>
                    <td className="p-6 text-center">
                      <X className="h-6 w-6 mx-auto" style={{ color: '#ef4444' }} />
                    </td>
                    <td className="p-6 text-center" style={{ backgroundColor: '#eff6ff' }}>
                      <Check className="h-6 w-6 mx-auto" style={{ color: '#16a34a' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-xl text-slate-600">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Gratis',
                price: '$0',
                period: 'para siempre',
                features: [
                  '3 sermones por mes',
                  'Funciones básicas',
                  'Análisis de texto',
                  'Soporte por email'
                ],
                cta: 'Comenzar Gratis',
                popular: false
              },
              {
                name: 'Pro',
                price: '$14',
                period: 'por mes',
                features: [
                  'Sermones ilimitados',
                  'Planes de predicación',
                  'Biblioteca de recursos',
                  'Análisis avanzado',
                  'Exportar a Word/PDF',
                  'Soporte prioritario'
                ],
                cta: 'Probar 14 días gratis',
                popular: true
              },
              {
                name: 'Iglesias',
                price: '$49',
                period: 'por mes',
                features: [
                  'Hasta 5 pastores',
                  'Todo lo de Pro',
                  'Recursos compartidos',
                  'Capacitación incluida',
                  'Gestor de cuenta dedicado',
                  'Facturación anual'
                ],
                cta: 'Contactar Ventas',
                popular: false
              }
            ].map((plan, i) => (
              <Card 
                key={i} 
                className={`p-8 relative ${plan.popular ? 'border-2 shadow-2xl scale-105' : 'border-2'}`}
                style={{ 
                  borderColor: plan.popular ? '#2563eb' : '#e2e8f0',
                  backgroundColor: 'white'
                }}
              >
                {plan.popular && (
                  <div 
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    Más Popular
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  size="lg"
                  style={{ 
                    backgroundColor: plan.popular ? '#2563eb' : '#1e293b',
                    color: 'white'
                  }}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          {/* Scholarship CTA */}
          <div 
            className="mt-12 max-w-2xl mx-auto p-8 rounded-2xl text-center"
            style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #fbbf24'
            }}
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full" style={{ backgroundColor: 'white' }}>
                <MessageSquare className="h-8 w-8" style={{ color: '#d97706' }} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              💛 ¿Por ahora no puedes pagar?
            </h3>
            <p className="text-slate-700 mb-6">
              Hablemos. Nuestro deseo es <strong>servir a la Iglesia de Cristo</strong>, 
              no crear barreras. Tenemos opciones para ti.
            </p>
            <Button 
              size="lg"
              onClick={() => openContactModal('scholarship')}
              style={{ 
                backgroundColor: '#d97706', 
                color: 'white'
              }}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Conversemos sobre tu situación
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {t('faq.title')}
          </h2>
          
          <div className="space-y-6">
            {[
              {
                q: '¿No es trampa usar IA para predicar?',
                a: 'No usas IA para predicar - la usas para estudiar mejor. Es como tener un entrenador personal: tú haces el ejercicio espiritual, la IA te guía y potencia tu estudio. Tú mantienes el control total del mensaje.'
              },
              {
                q: '¿Perderé mi voz única como predicador?',
                a: 'Al contrario. Al ahorrar tiempo en investigación básica, tienes más tiempo para oración y reflexión personal. DosFilos sugiere, pero tú decides y personalizas cada aspecto del sermón.'
              },
              {
                q: '¿Qué pasa con mi teología específica?',
                a: 'Tú configuras tu tradición interpretativa (reformada, wesleyana, pentecostal, etc.). DosFilos respeta tu marco teológico y sugiere contenido alineado con tus convicciones.'
              },
              {
                q: '¿Puedo cancelar en cualquier momento?',
                a: 'Sí, sin preguntas. Cancela cuando quieras y mantén acceso hasta el final de tu período de facturación.'
              },
              {
                q: '¿Mis sermones son privados?',
                a: 'Absolutamente. Tus sermones son 100% privados y nunca se comparten. Cumplimos con todas las regulaciones de privacidad de datos.'
              }
            ].map((faq, i) => (
              <Card key={i} className="p-6 border-2" style={{ borderColor: '#e2e8f0', backgroundColor: 'white' }}>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600 leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section 
        className="py-20 text-white"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            {t('finalCta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('finalCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                style={{ 
                  backgroundColor: 'white', 
                  color: '#2563eb',
                  boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)'
                }}
              >
                {t('finalCta.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => openContactModal('sales')}
              style={{ 
                borderColor: 'white', 
                borderWidth: '2px',
                color: 'white',
                backgroundColor: 'transparent'
              }}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Hablar con Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a' }} className="text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6" style={{ color: '#60a5fa' }} />
                <span className="text-white font-bold">DosFilos.Preach</span>
              </div>
              <p className="text-sm">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.product.title')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">{t('footer.product.features')}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t('footer.product.pricing')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.product.howItWorks')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.resources.title')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.resources.blog')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.resources.documentation')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.resources.support')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.company.title')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.company.about')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.company.contact')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.company.privacy')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2025 DosFilos.Preach. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
      `}</style>

      {/* Contact Modal */}
      <ContactModal 
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        defaultType={contactModalType}
      />
    </div>
  );
}
