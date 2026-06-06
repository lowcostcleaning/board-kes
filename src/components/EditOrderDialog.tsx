import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, Clock, Save, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    cleaner_id: string;
    user_id: string;
    object_id: string;
    residential_complex_id: string | null;
  } | null;
  onSuccess: () => void;
  canDelete: boolean;
  canEditComplex: boolean;
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

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];
const activeOrderStatuses = ['pending', 'pending_confirmation', 'confirmed'];

export const EditOrderDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}: EditOrderDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [orders, setOrders] = useState<CleanerOrder[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<CleanerUnavailableDate[]>([]);
  const [disabledTimes, setDisabledTimes] = useState<CleanerDisabledTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
    setSelectedDate(new Date(order.scheduled_date));
    setSelectedTime(order.scheduled_time);
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
        description: error.message || 'Не удалось загрузить доступность клинеров',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const cleanerAvailability = useMemo(() => {
    return cleaners.map((cleaner) => {
      if (!selectedDate || !selectedTime) {
        return { cleaner, available: false, reason: 'Выберите дату и время' };
      }

      const isUnavailableDay = unavailableDates.some(
        (entry) => entry.cleaner_id === cleaner.id && isSameDay(new Date(entry.date), selectedDate)
      );
      if (isUnavailableDay) {
        return { cleaner, available: false, reason: 'Недоступен' };
      }

      const isDisabledTime = disabledTimes.some(
        (entry) => entry.cleaner_id === cleaner.id && entry.time_slot === selectedTime
      );
      if (isDisabledTime) {
        return { cleaner, available: false, reason: 'Не работает' };
      }

      const hasOrder = orders.some(
        (existingOrder) =>
          existingOrder.id !== order?.id &&
          existingOrder.cleaner_id === cleaner.id &&
          existingOrder.scheduled_date === selectedDateStr &&
          existingOrder.scheduled_time === selectedTime &&
          activeOrderStatuses.includes(existingOrder.status)
      );
      if (hasOrder) {
        return { cleaner, available: false, reason: 'Занят' };
      }

      return { cleaner, available: true, reason: 'Свободен' };
    });
  }, [cleaners, disabledTimes, order?.id, orders, selectedDate, selectedDateStr, selectedTime, unavailableDates]);

  const hasChanges = Boolean(order && selectedDate && selectedTime && selectedCleaner && (
    format(selectedDate, 'yyyy-MM-dd') !== order.scheduled_date ||
    selectedTime !== order.scheduled_time ||
    selectedCleaner !== order.cleaner_id
  ));

  const handleSave = async () => {
    if (!order || !selectedDate || !selectedTime || !selectedCleaner) return;

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
      const { error } = await supabase
        .from('orders')
        .update({
          cleaner_id: selectedCleaner,
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_time: selectedTime,
          status: 'pending_confirmation',
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Заказ перенесён',
        description: 'Клинеру нужно подтвердить новое время',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось перенести заказ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Перенести заказ</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Новая дата
              </Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedCleaner('');
                }}
                disabled={(date) => date < today}
                locale={ru}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Новое время
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      setSelectedTime(time);
                      setSelectedCleaner('');
                    }}
                    className={cn(
                      'h-10 rounded-lg text-sm font-medium transition-colors',
                      selectedTime === time
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Клинер на новое время</Label>
              <p className="text-xs text-muted-foreground">
                После переноса заказ снова будет ждать подтверждения.
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
              {isLoading ? 'Сохранение...' : 'Сохранить перенос'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const EditObjectDialog = EditOrderDialog;
