import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { MessageSquare, XCircle, Search, Filter, ArrowLeft } from 'lucide-react';
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
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { leadsService, type ContactLead, type LeadStatus } from '@dosfilos/application';
import { LeadCard } from './leads/LeadCard';
import { useConfirm } from '@/hooks/useConfirm';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

export function AdminLeads() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const { confirm, confirmDialog } = useConfirm();
    const [leads, setLeads] = useState<ContactLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        if (user && user.email !== ADMIN_EMAIL) {
            toast.error(t('common.noPermission'));
            navigate('/dashboard');
        }
    }, [user, navigate, t]);

    useEffect(() => {
        if (!user || user.email !== ADMIN_EMAIL) return;

        const unsubscribe = leadsService.subscribeAll(
            (data) => {
                setLeads(data);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching leads:', error);
                toast.error(t('leads.loadError'));
                setLoading(false);
            },
        );

        return () => unsubscribe();
    }, [user, t]);

    const handleStatusChange = async (leadId: string, status: LeadStatus) => {
        try {
            await leadsService.updateStatus(leadId, status);
            toast.success(t('leads.actions.updateSuccess'));
        } catch (error) {
            console.error('Error updating lead:', error);
            toast.error(t('leads.actions.updateError'));
        }
    };

    const handleDelete = async (leadId: string) => {
        if (!await confirm({ body: t('leads.actions.deleteConfirm') })) return;

        try {
            await leadsService.deleteLead(leadId);
            toast.success(t('leads.actions.deleteSuccess'));
        } catch (error) {
            console.error('Error deleting lead:', error);
            toast.error(t('leads.actions.deleteError'));
        }
    };

    const filteredLeads = leads.filter((lead) => {
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
            <div className="min-h-screen flex items-center justify-center bg-muted">
                <Card className="p-8 text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-foreground">{t('common.accessDenied.title')}</h1>
                    <p className="text-muted-foreground mt-2">{t('common.accessDenied.description')}</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>
                        {t('common.accessDenied.homeButton')}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('leads.backToDashboard')}
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{t('leads.title')}</h1>
                            <p className="text-muted-foreground">
                                {t('leads.subtitle', {
                                    total: leads.length,
                                    newCount: leads.filter((l) => l.status === 'new').length,
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('leads.filters.search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-4">
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-40">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder={t('leads.filters.type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('leads.filters.allTypes')}</SelectItem>
                                    <SelectItem value="sales">{t('leads.types.sales')}</SelectItem>
                                    <SelectItem value="scholarship">{t('leads.types.scholarship')}</SelectItem>
                                    <SelectItem value="demo">{t('leads.types.demo')}</SelectItem>
                                    <SelectItem value="support">{t('leads.types.support')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder={t('leads.filters.status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('leads.filters.allStatuses')}</SelectItem>
                                    <SelectItem value="new">{t('leads.statusOptions.new')}</SelectItem>
                                    <SelectItem value="contacted">{t('leads.statusOptions.contacted')}</SelectItem>
                                    <SelectItem value="converted">{t('leads.statusOptions.converted')}</SelectItem>
                                    <SelectItem value="closed">{t('leads.statusOptions.closed')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-muted-foreground mt-4">{t('leads.loading')}</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <Card className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-foreground">{t('leads.empty.title')}</h2>
                        <p className="text-muted-foreground mt-2">
                            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                                ? t('leads.empty.noResults')
                                : t('leads.empty.noLeads')}
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredLeads.map((lead) => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                onStatusChange={(status) => handleStatusChange(lead.id, status)}
                                onDelete={() => handleDelete(lead.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {confirmDialog}
        </div>
    );
}
