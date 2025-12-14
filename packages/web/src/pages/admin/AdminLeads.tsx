import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
import { 
  Mail, Phone, Church, MessageSquare, Trash2, 
  CheckCircle, Clock, XCircle, Search, Filter,
  ArrowLeft, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  church?: string;
  type: string;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  source: string;
  createdAt: Timestamp;
}

const ADMIN_EMAIL = 'rdocerda@gmail.com';

export function AdminLeads() {
  const { user } = useFirebase();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Check if user is admin
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      toast.error('No tienes permisos para acceder a esta página');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Subscribe to leads
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    const q = query(
      collection(db, 'contact_leads'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching leads:', error);
      toast.error('Error al cargar los leads');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    try {
      await updateDoc(doc(db, 'contact_leads', leadId), { status });
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Error al actualizar');
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return;
    
    try {
      await deleteDoc(doc(db, 'contact_leads', leadId));
      toast.success('Lead eliminado');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Error al eliminar');
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    sales: { label: 'Ventas', color: '#2563eb' },
    scholarship: { label: 'Beca', color: '#d97706' },
    demo: { label: 'Demo', color: '#8b5cf6' },
    support: { label: 'Soporte', color: '#16a34a' },
  };

  const statusLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    new: { label: 'Nuevo', icon: Clock, color: '#f59e0b' },
    contacted: { label: 'Contactado', icon: Mail, color: '#3b82f6' },
    converted: { label: 'Convertido', icon: CheckCircle, color: '#22c55e' },
    closed: { label: 'Cerrado', icon: XCircle, color: '#6b7280' },
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.church?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesType = filterType === 'all' || lead.type === filterType;
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Acceso Denegado</h1>
          <p className="text-slate-600 mt-2">No tienes permisos para ver esta página.</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Leads de Contacto</h1>
              <p className="text-slate-600">
                {leads.length} leads totales • {leads.filter(l => l.status === 'new').length} nuevos
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email o iglesia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="scholarship">Beca</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="support">Soporte</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="new">Nuevos</SelectItem>
                  <SelectItem value="contacted">Contactados</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                  <SelectItem value="closed">Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Leads List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-600 mt-4">Cargando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900">No hay leads</h2>
            <p className="text-slate-600 mt-2">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'No se encontraron leads con esos filtros'
                : 'Aún no tienes leads de contacto'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const typeInfo = typeLabels[lead.type] || { label: lead.type, color: '#6b7280' };
              const defaultStatus = { label: 'Nuevo', icon: Clock, color: '#f59e0b' };
              const statusInfo = statusLabels[lead.status] ?? defaultStatus;
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={lead.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Lead Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-full"
                            style={{ backgroundColor: `${typeInfo.color}15` }}
                          >
                            <User className="h-5 w-5" style={{ color: typeInfo.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="h-3 w-3" />
                              <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                                {lead.email}
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: typeInfo.color, color: 'white' }}>
                            {typeInfo.label}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className="flex items-center gap-1"
                            style={{ borderColor: statusInfo.color, color: statusInfo.color }}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.church && (
                          <div className="flex items-center gap-1">
                            <Church className="h-4 w-4" />
                            {lead.church}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {lead.createdAt?.toDate?.()?.toLocaleDateString('es-CL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) || 'Fecha desconocida'}
                        </div>
                      </div>

                      {lead.message && (
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.message}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      <Select 
                        value={lead.status} 
                        onValueChange={(value: Lead['status']) => updateLeadStatus(lead.id, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Nuevo</SelectItem>
                          <SelectItem value="contacted">Contactado</SelectItem>
                          <SelectItem value="converted">Convertido</SelectItem>
                          <SelectItem value="closed">Cerrado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteLead(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
