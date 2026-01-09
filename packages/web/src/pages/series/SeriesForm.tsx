import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { seriesService } from '@dosfilos/application';
import { FirebaseStorageService } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeRequiredModal } from '@/components/upgrade';
import { useTranslation } from '@/i18n';
import { Trans } from 'react-i18next';

interface SeriesFormData {
  title: string;
  description: string;
  coverUrl: string;
  startDate: string;
  endDate: string;
}

export function SeriesForm() {
  const { t, i18n } = useTranslation('series');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useFirebase();
  const { checkCanCreatePreachingPlan } = useUsageLimits();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  
  // Storage Service
  const storageService = new FirebaseStorageService();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState({
    reason: 'limit_reached' as const,
    limitType: 'plans' as const,
    currentLimit: 1
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SeriesFormData>();
  const [sermonCount, setSermonCount] = useState<number>(4);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'flexible'>('weekly');

  // Watch values for live preview
  const watchedValues = watch();

  useEffect(() => {
    if (id) {
      loadSeries();
    }
  }, [id]);

  const loadSeries = async () => {
    try {
      if (!id) return;
      const series = await seriesService.getSeries(id);
      if (series) {
        reset({
          title: series.title,
          description: series.description,
          coverUrl: series.coverUrl || '',
          startDate: series.startDate ? new Date(series.startDate).toISOString().split('T')[0] : '',
          endDate: series.endDate ? new Date(series.endDate).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Error loading series:', error);
      toast.error(t('form.messages.loadError'));
    } finally {
      setInitialLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('form.steps.visuals.errors.maxSize'));
      return;
    }

    setUploading(true);
    try {
      const path = `users/${user.uid}/series-covers/${Date.now()}_${file.name}`;
      const result = await storageService.uploadFile(file, path);
      // Update form value
      reset({ ...watchedValues, coverUrl: result.url });
      toast.success(t('form.steps.visuals.errors.uploadSuccess'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('form.steps.visuals.errors.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    reset({ ...watchedValues, coverUrl: '' });
  };

  const onSubmit = async (data: SeriesFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Check limits for NEW plans
      if (!id) {
        const check = await checkCanCreatePreachingPlan();
        if (!check.allowed) {
          setLoading(false);
          setUpgradeReason({
            reason: 'limit_reached',
            limitType: 'plans',
            currentLimit: check.limit || 1
          });
          setShowUpgradeModal(true);
          return;
        }
      }
      
      const payload = {
        title: data.title,
        description: data.description,
        coverUrl: data.coverUrl,
        startDate: data.startDate ? new Date(data.startDate) : undefined, // Optional Date
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };

      if (id) {
        // Edit Mode
        await seriesService.updateSeries(id, payload as any);
        toast.success(t('form.messages.updateSuccess'));
        navigate(`/dashboard/plans/${id}`);
      } else {
        // Create Mode
        const sermons = Array.from({ length: sermonCount }, (_, i) => ({
          title: `Sermón ${i + 1}`,
          description: '',
          week: i + 1,
          passage: ''
        }));

        const newSeries = await seriesService.createSeriesFromPlan(user.uid, {
          series: {
            ...payload,
            type: 'manual',
            resourceIds: [],
          },
          sermons: sermons,
          frequency: frequency // Pass frequency
        });

        toast.success(t('form.messages.saveSuccess', { count: sermonCount }));
        navigate(`/dashboard/plans/${newSeries.id}`);
      }
    } catch (error) {
      console.error('Error saving series:', error);
      toast.error(t('form.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(id ? `/dashboard/plans/${id}` : '/dashboard/plans')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? t('form.titleEdit') : t('form.titleNew')}
          </h1>
          <p className="text-muted-foreground">
            {id ? t('form.subtitleEdit') : t('form.subtitleNew')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 shadow-sm border-muted">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Section: Identity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                  {t('form.steps.identity.title')}
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">{t('form.steps.identity.labelTitle')}</Label>
                  <Input
                    id="title"
                    className="text-lg"
                    {...register('title', { required: t('form.steps.identity.errors.titleRequired'), minLength: { value: 3, message: t('form.steps.identity.errors.titleMinLength') } })}
                    placeholder={t('form.steps.identity.labelTitlePlaceholder')}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('form.steps.identity.labelDescription')}</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder={t('form.steps.identity.labelDescriptionPlaceholder')}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  {t('form.steps.planning.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('form.steps.planning.frequency')}</Label>
                    <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.steps.planning.frequency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{t('form.steps.planning.frequencies.weekly')}</SelectItem>
                        <SelectItem value="biweekly">{t('form.steps.planning.frequencies.biweekly')}</SelectItem>
                        <SelectItem value="monthly">{t('form.steps.planning.frequencies.monthly')}</SelectItem>
                        <SelectItem value="flexible">{t('form.steps.planning.frequencies.flexible')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t('form.steps.planning.startDate')} <span className="text-xs text-muted-foreground font-normal">{t('form.steps.planning.startDateOptional')}</span></Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate')} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-xs text-muted-foreground">{t('form.steps.planning.endDate')}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...register('endDate')}
                      disabled
                      className="bg-muted/50"
                      placeholder={t('form.steps.planning.endDatePlaceholder')}
                    />
                  </div>
                </div>

                {/* Sermon Count - Only for New Series */}
                {!id && (
                  <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-muted-foreground/30 space-y-3">
                    <div className="flex justify-between items-center">
                       <Label htmlFor="sermonCount" className="font-medium text-base">{t('form.steps.planning.sermonCount')}</Label>
                       <span className="bg-background border rounded px-2 py-1 text-sm font-mono">{sermonCount}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        id="sermonCount"
                        type="range"
                        min="1"
                        max="12"
                        step="1"
                        value={sermonCount}
                        onChange={(e) => setSermonCount(parseInt(e.target.value))}
                        className="flex-1 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Trans
                        i18nKey="form.steps.planning.autoCreateNotice"
                        t={t}
                        values={{ 
                            count: sermonCount, 
                            range: `Sermón 1 - ${sermonCount}` 
                        }}
                        components={{ strong: <strong /> }}
                      />
                    </p>
                  </div>
                )}
              </div>

               <div className="h-px bg-border" />

              {/* Section: Visuals */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                  {t('form.steps.visuals.title')}
                </h3>
                
                <div className="space-y-4">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />

                    {!watchedValues.coverUrl ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                      >
                         <div className="bg-muted p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                         </div>
                         <p className="text-sm font-medium text-foreground">
                           {uploading ? t('form.steps.visuals.uploading') : t('form.steps.visuals.uploadPlaceholder')}
                         </p>
                         <p className="text-xs text-muted-foreground mt-1">{t('form.steps.visuals.formats')}</p>
                         
                         <div className="relative w-full flex items-center gap-2 my-4">
                            <div className="h-px bg-border flex-1"></div>
                            <span className="text-[10px] text-muted-foreground uppercase">{t('form.steps.visuals.pasteUrl')}</span>
                            <div className="h-px bg-border flex-1"></div>
                         </div>
                         
                         <Input
                            id="coverUrl"
                            {...register('coverUrl')}
                            placeholder="https://..."
                            className="text-xs h-8"
                            onClick={(e) => e.stopPropagation()} // Prevent triggering file upload
                         />
                      </div>
                    ) : (
                      <div className="relative group rounded-lg overflow-hidden border">
                         <img 
                           src={watchedValues.coverUrl} 
                           alt="Cover" 
                           className="w-full h-48 object-cover"
                         />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={removeImage}
                            >
                               <X className="h-4 w-4 mr-2" /> {t('form.steps.visuals.remove')}
                            </Button>
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => fileInputRef.current?.click()}
                            >
                               <Upload className="h-4 w-4 mr-2" /> {t('form.steps.visuals.change')}
                            </Button>
                         </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t mt-8 z-10">
                <Button type="button" variant="outline" onClick={() => navigate(id ? `/dashboard/plans/${id}` : '/dashboard/plans')}>
                  {t('form.buttons.cancel')}
                </Button>
                <Button type="submit" disabled={loading} size="lg" className="min-w-[150px]">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {id ? t('form.buttons.save') : t('form.buttons.create')}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-1 sticky top-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('form.preview.title')}</h3>
              
              {/* Preview Card */}
              <Card className="overflow-hidden shadow-lg border-muted group transition-all duration-500 hover:shadow-xl">
                 <div className="h-48 w-full bg-muted relative overflow-hidden">
                    {watchedValues.coverUrl ? (
                      <img 
                        src={watchedValues.coverUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2673&auto=format&fit=crop' }} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
                        <span className="text-sm">{t('form.preview.noCover')}</span>
                      </div>
                    )}
                 </div>
                 
                 <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider border rounded px-2 py-0.5">
                          {watchedValues.startDate ? new Date(watchedValues.startDate).toLocaleDateString(i18n.language || 'es', { month: 'short', year: 'numeric' }) : t('form.preview.datePending')}
                       </div>
                       {!id && (
                         <div className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                           {t('form.preview.sermonCountBadge', { count: sermonCount })}
                         </div>
                       )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold font-serif leading-tight">
                         {watchedValues.title || t('form.preview.defaultTitle')}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                         {watchedValues.description || t('form.preview.defaultDescription')}
                      </p>
                    </div>
                 </div>
              </Card>

              {/* Helper Tip */}
              <div className="bg-primary/5 p-4 rounded-lg text-sm text-muted-foreground border border-primary/10">
                 <p className="leading-relaxed">
                   <strong>💡 {t('form.tips.pro')}</strong> {id ? t('form.tips.editMode') : t('form.tips.createMode')}
                 </p>
              </div>
            </div>
        </div>

      </div>
      
      {/* Upgrade Required Modal */}
      <UpgradeRequiredModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason={upgradeReason.reason}
        limitType={upgradeReason.limitType}
        currentLimit={upgradeReason.currentLimit}
      />
    </div>
  );
}
