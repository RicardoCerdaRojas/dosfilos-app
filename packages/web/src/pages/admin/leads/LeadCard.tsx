import React from 'react';
import { Mail, Phone, Church, Trash2, CheckCircle, Clock, XCircle, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import type { ContactLead, LeadStatus } from '@dosfilos/application';

/**
 * Type / status display palette for the Leads admin view.
 *
 * ── Design language note ───────────────────────────────────────────────
 * The hex literals below are an intentional data-driven palette: each
 * lead `type` and `status` carries its own brand-coded colour for quick
 * visual scanning. Same architectural exception as `colorMap` in the
 * library `ResourceCard`. NOT ad-hoc colour literals.
 */
const TYPE_COLORS: Record<string, string> = {
    sales: '#2563eb',
    scholarship: '#d97706',
    demo: '#8b5cf6',
    support: '#16a34a',
};

const STATUS_META: Record<LeadStatus, { icon: React.ElementType; color: string }> = {
    new: { icon: Clock, color: '#f59e0b' },
    contacted: { icon: Mail, color: '#3b82f6' },
    converted: { icon: CheckCircle, color: '#22c55e' },
    closed: { icon: XCircle, color: '#6b7280' },
};

interface LeadCardProps {
    lead: ContactLead;
    onStatusChange: (status: LeadStatus) => void;
    onDelete: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onStatusChange, onDelete }) => {
    const { t, i18n } = useTranslation('admin');
    const typeColor = TYPE_COLORS[lead.type] ?? '#6b7280';
    const statusMeta = STATUS_META[lead.status] ?? STATUS_META.new;
    const StatusIcon = statusMeta.icon;
    const typeLabel = t(`leads.types.${lead.type}`, { defaultValue: lead.type });
    const statusLabel = t(`leads.statuses.${lead.status}`);

    return (
        <Card className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full" style={{ backgroundColor: `${typeColor}15` }}>
                                <User className="h-5 w-5" style={{ color: typeColor }} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{lead.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <a href={`mailto:${lead.email}`} className="hover:text-primary">
                                        {lead.email}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: typeColor, color: 'white' }}>{typeLabel}</Badge>
                            <Badge
                                variant="outline"
                                className="flex items-center gap-1"
                                style={{ borderColor: statusMeta.color, color: statusMeta.color }}
                            >
                                <StatusIcon className="h-3 w-3" />
                                {statusLabel}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                            {lead.createdAt?.toDate?.()?.toLocaleDateString(i18n.language, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            }) || t('leads.card.unknownDate')}
                        </div>
                    </div>

                    {lead.message && (
                        <div className="p-4 rounded-lg bg-muted border border-border">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{lead.message}</p>
                        </div>
                    )}
                </div>

                <div className="flex lg:flex-col gap-2">
                    <Select value={lead.status} onValueChange={(value) => onStatusChange(value as LeadStatus)}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">{t('leads.statuses.new')}</SelectItem>
                            <SelectItem value="contacted">{t('leads.statuses.contacted')}</SelectItem>
                            <SelectItem value="converted">{t('leads.statuses.converted')}</SelectItem>
                            <SelectItem value="closed">{t('leads.statuses.closed')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
