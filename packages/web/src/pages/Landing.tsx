import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Check, ChevronRight, Play, Star, Users, 
  Clock, Shield, Sparkles, BookMarked, MessageSquare,
  ArrowRight, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">DosFilos.app</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Características
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">
                Cómo Funciona
              </a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">
                Testimonios
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Precios
              </a>
              <Link to="/login">
                <Button variant="ghost">Iniciar Sesión</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Comenzar Gratis
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
                Características
              </a>
              <a href="#how-it-works" className="block text-slate-600 hover:text-slate-900">
                Cómo Funciona
              </a>
              <a href="#testimonials" className="block text-slate-600 hover:text-slate-900">
                Testimonios
              </a>
              <a href="#pricing" className="block text-slate-600 hover:text-slate-900">
                Precios
              </a>
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full">Iniciar Sesión</Button>
              </Link>
              <Link to="/register" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Comenzar Gratis
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Herramienta de Estudio Bíblico Profesional
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Estudia más profundo.
                <span className="block text-blue-600">Predica con confianza.</span>
              </h1>
              
              <p className="text-xl text-slate-600 leading-relaxed">
                La herramienta de estudio bíblico que respeta tu teología y multiplica 
                tu tiempo de preparación. No reemplazamos tu estudio, lo potenciamos.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                    Comienza Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  <Play className="mr-2 h-5 w-5" />
                  Ver Demo (2 min)
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white" />
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">500+ pastores</div>
                    <div className="text-slate-600">confiando en nosotros</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-900">4.8/5</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                  <div className="text-center p-8">
                    <BookOpen className="h-32 w-32 text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Demo Screenshot Placeholder</p>
                  </div>
                </div>
              </div>
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Análisis Completo</div>
                    <div className="text-xs text-slate-600">Efesios 2:1-10</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Ahorra 4 horas</div>
                    <div className="text-xs text-slate-600">por sermón</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Sabemos que preparar sermones fieles a la Escritura requiere tiempo
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-left mt-12">
              {[
                'Horas de estudio del texto original',
                'Consultar múltiples comentarios',
                'Estructurar ideas coherentemente',
                'Aplicar con relevancia cultural'
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                  <span className="text-lg text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xl text-blue-300 pt-8">
              ¿Y si pudieras hacer todo esto en la mitad del tiempo, sin sacrificar profundidad?
            </p>
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              No es IA genérica. Es tu asistente de estudio bíblico.
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Diseñado específicamente para pastores que valoran la profundidad teológica
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookMarked,
                title: 'Fundamento Académico',
                description: 'Basado en principios de homilética clásica. Integra comentarios de eruditos reformados y evangélicos.',
                features: ['Haddon Robinson', 'Bryan Chapell', 'Análisis exegético']
              },
              {
                icon: Shield,
                title: 'Respeta tu Teología',
                description: 'Entrenado en literatura teológica específica. Tú configuras tu tradición interpretativa.',
                features: ['Personalizable', 'Contextual', 'Fiel al texto']
              },
              {
                icon: Clock,
                title: 'Multiplica tu Tiempo',
                description: 'De 8 horas de preparación a 4 horas. Más tiempo para oración y cuidado pastoral.',
                features: ['Ahorra 50%', 'Automatiza investigación', 'Enfócate en lo importante']
              }
            ].map((feature, i) => (
              <Card key={i} className="p-8 hover:shadow-xl transition-shadow border-2 border-slate-100">
                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-6">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Cómo Funciona
            </h2>
            <p className="text-xl text-slate-600">
              Transparencia total en cada paso del proceso
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Selecciona tu Pasaje',
                description: 'Análisis contextual automático, estructura del texto, palabras clave en original'
              },
              {
                step: '2',
                title: 'Elige tu Enfoque',
                description: 'Expositivo, textual o temático. Basado en metodologías probadas'
              },
              {
                step: '3',
                title: 'Desarrolla con Asistencia',
                description: 'Sugerencias de bosquejo, ilustraciones contextuales, aplicaciones prácticas'
              },
              {
                step: '4',
                title: 'Refina y Personaliza',
                description: '100% editable. Tu voz, tu teología, tu mensaje'
              }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
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
              <Card key={i} className="p-8 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
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

      {/* Comparison Table */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            ¿Por qué DosFilos.app?
          </h2>
          
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-6 text-left">Característica</th>
                  <th className="p-6 text-center">Otras IA Genéricas</th>
                  <th className="p-6 text-center bg-blue-600">DosFilos.app</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  ['Análisis exegético profundo', false, true],
                  ['Respeta tu tradición teológica', false, true],
                  ['Enfoque en predicación', false, true],
                  ['Planificación de series', false, true],
                  ['Fuentes académicas verificadas', false, true],
                  ['Personalización completa', false, true]
                ].map(([feature, generic, dosfilos], i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-6 font-medium text-slate-900">{feature as string}</td>
                    <td className="p-6 text-center">
                      {generic ? (
                        <Check className="h-6 w-6 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-6 w-6 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="p-6 text-center bg-blue-50">
                      {dosfilos ? (
                        <Check className="h-6 w-6 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-6 w-6 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Precios Transparentes
            </h2>
            <p className="text-xl text-slate-600">
              Comienza gratis, actualiza cuando estés listo
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
                price: '$15',
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
                price: '$99',
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
                className={`p-8 relative ${plan.popular ? 'border-2 border-blue-600 shadow-2xl scale-105' : 'border-2 border-slate-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
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
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-center text-slate-600 mt-8">
            💡 Becas disponibles para pastores en países en desarrollo
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            Preguntas Frecuentes
          </h2>
          
          <div className="space-y-6">
            {[
              {
                q: '¿No es trampa usar IA para predicar?',
                a: 'No usas IA para predicar - la usas para estudiar mejor. Es como usar un comentario bíblico digital en lugar de impreso. La IA te ayuda en la investigación, pero tú mantienes el control total del mensaje.'
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
              <Card key={i} className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Únete a 500+ pastores que estudian más profundo
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Primer sermón listo en 30 minutos o... bueno, es gratis 😊
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100 text-lg px-8 py-6">
                Comenzar Gratis - Sin Tarjeta
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
              <MessageSquare className="mr-2 h-5 w-5" />
              Hablar con Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-blue-400" />
                <span className="text-white font-bold">DosFilos.app</span>
              </div>
              <p className="text-sm">
                Herramienta de estudio bíblico profesional para pastores.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Características</a></li>
                <li><a href="#pricing" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Tutoriales</a></li>
                <li><a href="#" className="hover:text-white">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2025 DosFilos.app. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
