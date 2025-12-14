import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { toast } from 'sonner';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'sales' | 'scholarship' | 'support' | 'demo';
  defaultMessage?: string;
}

export function ContactModal({ 
  isOpen, 
  onClose, 
  defaultType = 'sales',
  defaultMessage = ''
}: ContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    church: '',
    type: defaultType,
    message: defaultMessage,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Por favor completa tu nombre y email');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'contact_leads'), {
        ...formData,
        createdAt: serverTimestamp(),
        status: 'new',
        source: 'landing_page',
      });

      toast.success('¡Mensaje enviado! Te contactaremos pronto.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        church: '',
        type: defaultType,
        message: '',
      });
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Error al enviar el mensaje. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'white' }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white'
          }}
        >
          <div>
            <h2 className="text-xl font-bold">Contáctanos</h2>
            <p className="text-blue-100 text-sm">Te responderemos en menos de 24 horas</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">Nombre *</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700">Teléfono (opcional)</Label>
              <Input
                id="phone"
                placeholder="+56 9 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church" className="text-slate-700">Iglesia (opcional)</Label>
              <Input
                id="church"
                placeholder="Nombre de tu iglesia"
                value={formData.church}
                onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-700">¿En qué podemos ayudarte?</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'sales' | 'scholarship' | 'support' | 'demo') => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger style={{ borderColor: '#e2e8f0' }}>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">💼 Información de Ventas</SelectItem>
                <SelectItem value="scholarship">💛 Solicitud de Beca/Descuento</SelectItem>
                <SelectItem value="demo">🎬 Solicitar Demo Personalizado</SelectItem>
                <SelectItem value="support">🛠️ Soporte Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Cuéntanos más sobre tu situación ministerial o cómo podemos ayudarte..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            size="lg"
            disabled={isSubmitting}
            style={{ 
              backgroundColor: '#2563eb',
              color: 'white'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Enviar Mensaje
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Al enviar este formulario, aceptas que te contactemos por email. 
            Nunca compartiremos tu información.
          </p>
        </form>
      </div>
    </div>
  );
}
