import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, Clock, Save, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ReassignCleanerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    cleaner_id: string;
  } | null;
  onSuccess: () => void;
}

interface Cleaner {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface CleanerOrder {
  id: string;
  cleaner_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

interface CleanerUnavailableDate {
  cleaner_id: string;
  date: string;
}

interface CleanerDisabledTime {
  cleaner_id: string;
  time_slot: string;
}

const activeOrderStatuses = ['pending', 'pending_confirmation', 'confirmed'];

export const ReassignCleanerDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}: ReassignCleanerDialogProps) => {
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [orders, setOrders] = useState<CleanerOrder[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<CleanerUnavailableDate[]>([]);
  const [disabledTimes, setDisabledTimes] = useState<CleanerDisabledTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setSelectedCleaner(order.cleaner_id);
    fetchData();
  }, [open, order]);

  const fetchData = async () => {
    if (!order) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isDemoManager = profile?.role === 'demo_manager';

      let cleanersQuery = supabase
        .from('profiles')
        .select('id, email, name, avatar_url')
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('visible_to_managers', true)
        .order('name', { ascending: true });

      cleanersQuery = isDemoManager
        ? cleanersQuery.eq('role', 'demo_cleaner')
        : cleanersQuery.eq('role', 'cleaner');

      const { data: cleanerRows, error: cleanersError } = await cleanersQuery;
      if (cleanersError) throw cleanersError;

      const cleanerIds = (cleanerRows || []).map((cleaner) => cleaner.id);
      setCleaners(cleanerRows || []);

      if (cleanerIds.length === 0) {
        setOrders([]);
        setUnavailableDates([]);
        setDisabledTimes([]);
        return;
      }

      const [ordersRes, unavailableRes, disabledTimesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, cleaner_id, scheduled_date, scheduled_time, status')
          .in('cleaner_id', cleanerIds)
          .in('status', activeOrderStatuses),
        supabase
          .from('cleaner_unavailability')
          .select('cleaner_id, date')
          .in('cleaner_id', cleanerIds),
        supabase
          .from('cleaner_disabled_times')
          .select('cleaner_id, time_slot')
          .in('cleaner_id', cleanerIds),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (unavailableRes.error) throw unavailableRes.error;
      if (disabledTimesRes.error) throw disabledTimesRes.error;

      setOrders(ordersRes.data || []);
      setUnavailableDates(unavailableRes.data || []);
      setDisabledTimes(disabledTimesRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить клинеров',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDate = order ? new Date(order.scheduled_date) : null;

  const cleanerAvailability = useMemo(() => {
    return cleaners.map((cleaner) => {
      if (!order || !selectedDate) {
        return { cleaner, available: false, reason: 'Нет данных уборки' };
      }

      const isCurrentCleaner = cleaner.id === order.cleaner_id;

      const isUnavailableDay = unavailableDates.some(
        (entry) => entry.cleaner_id === cleaner.id && isSameDay(new Date(entry.date), selectedDate)
      );
      if (!isCurrentCleaner && isUnavailableDay) {
        return { cleaner, available: false, reason: 'Недоступен' };
      }

      const isDisabledTime = disabledTimes.some(
        (entry) => entry.cleaner_id === cleaner.id && entry.time_slot === order.scheduled_time
      );
      if (!isCurrentCleaner && isDisabledTime) {
        return { cleaner, available: false, reason: 'Не работает' };
      }

      const hasOrder = orders.some(
        (existingOrder) =>
          existingOrder.id !== order.id &&
          existingOrder.cleaner_id === cleaner.id &&
          existingOrder.scheduled_date === order.scheduled_date &&
          existingOrder.scheduled_time === order.scheduled_time &&
          activeOrderStatuses.includes(existingOrder.status)
      );
      if (hasOrder) {
        return { cleaner, available: false, reason: 'Занят' };
      }

      return { cleaner, available: true, reason: isCurrentCleaner ? 'Текущий' : 'Свободен' };
    });
  }, [cleaners, disabledTimes, order, orders, selectedDate, unavailableDates]);

  const hasChanges = Boolean(order && selectedCleaner && selectedCleaner !== order.cleaner_id);

  const handleSave = async () => {
    if (!order || !selectedCleaner) return;

    const availability = cleanerAvailability.find((entry) => entry.cleaner.id === selectedCleaner);
    if (!availability?.available) {
      toast({
        title: 'Клинер недоступен',
        description: availability?.reason || 'Выберите другого клинера',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          cleaner_id: selectedCleaner,
          status: 'pending_confirmation',
        })
        .eq('id', order.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Уборка не была обновлена. Проверьте права доступа.');

      toast({
        title: 'Клинер изменён',
        description: 'Дата, время и объект уборки остались без изменений',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сменить клинера',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Сменить клинера</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Уборка</Label>
            <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>{selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: ru })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{order?.scheduled_time}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Клинер</Label>
              <p className="text-xs text-muted-foreground">
                Меняется только исполнитель. Дата, время и объект не изменяются.
              </p>
            </div>

            <div className="space-y-2">
              {cleanerAvailability.map(({ cleaner, available, reason }) => {
                const isSelected = selectedCleaner === cleaner.id;
                return (
                  <button
                    key={cleaner.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedCleaner(cleaner.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      isSelected && 'border-primary bg-primary/10',
                      available && !isSelected && 'bg-card hover:bg-muted/50',
                      !available && 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar avatarUrl={cleaner.avatar_url} name={cleaner.name} email={cleaner.email} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {cleaner.name || cleaner.email?.split('@')[0] || 'Клинер'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{cleaner.email}</p>
                        </div>
                      </div>
                      <Badge variant={available ? 'default' : 'secondary'} className="shrink-0 gap-1">
                        {available ? <CheckCircle2 className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {reason}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges || !selectedCleaner}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Сохранение...' : 'Сохранить клинера'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
