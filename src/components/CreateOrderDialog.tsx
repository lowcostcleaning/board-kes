import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, Clock, Home, Plus, Send, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
}

interface Cleaner {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface CleanerOrder {
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

interface CreateOrderDialogProps {
  onOrderCreated: () => void;
  disabled?: boolean;
}

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];

const activeOrderStatuses = ['pending', 'pending_confirmation', 'confirmed'];

const getApartmentTypeLabel = (type: string | null) => {
  switch (type) {
    case 'studio':
      return 'Студия';
    case '1+1':
      return '1+1';
    case '2+1':
      return '2+1';
    default:
      return null;
  }
};

export const CreateOrderDialog = ({ onOrderCreated, disabled }: CreateOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [orders, setOrders] = useState<CleanerOrder[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<CleanerUnavailableDate[]>([]);
  const [disabledTimes, setDisabledTimes] = useState<CleanerDisabledTime[]>([]);
  const [selectedObject, setSelectedObject] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedCleaner, setSelectedCleaner] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchInitialData();
  }, [open]);

  const fetchInitialData = async () => {
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

      const objectsQuery = supabase
        .from('objects')
        .select('id, complex_name, apartment_number, apartment_type')
        .order('complex_name', { ascending: true });

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

      const [objectsRes, cleanersRes] = await Promise.all([objectsQuery, cleanersQuery]);

      if (objectsRes.error) throw objectsRes.error;
      if (cleanersRes.error) throw cleanersRes.error;

      const cleanerRows = cleanersRes.data || [];
      const cleanerIds = cleanerRows.map((cleaner) => cleaner.id);

      setObjects(objectsRes.data || []);
      setCleaners(cleanerRows);

      if (cleanerIds.length === 0) {
        setOrders([]);
        setUnavailableDates([]);
        setDisabledTimes([]);
        return;
      }

      const [ordersRes, unavailableRes, disabledTimesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('cleaner_id, scheduled_date, scheduled_time, status')
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
        description: error.message || 'Не удалось загрузить данные для заказа',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedObject('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedCleaner('');
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
        return { cleaner, available: false, reason: 'Недоступен в этот день' };
      }

      const isDisabledTime = disabledTimes.some(
        (entry) => entry.cleaner_id === cleaner.id && entry.time_slot === selectedTime
      );
      if (isDisabledTime) {
        return { cleaner, available: false, reason: 'Не работает в это время' };
      }

      const hasOrder = orders.some(
        (order) =>
          order.cleaner_id === cleaner.id &&
          order.scheduled_date === selectedDateStr &&
          order.scheduled_time === selectedTime &&
          activeOrderStatuses.includes(order.status)
      );
      if (hasOrder) {
        return { cleaner, available: false, reason: 'Занят' };
      }

      return { cleaner, available: true, reason: 'Свободен' };
    });
  }, [cleaners, disabledTimes, orders, selectedDate, selectedDateStr, selectedTime, unavailableDates]);

  const handleSubmit = async () => {
    if (!selectedObject || !selectedDate || !selectedTime || !selectedCleaner) {
      toast({
        title: 'Заполните заказ',
        description: 'Выберите объект, дату, время и свободного клинера',
        variant: 'destructive',
      });
      return;
    }

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const { error } = await supabase.from('orders').insert({
        manager_id: user.id,
        cleaner_id: selectedCleaner,
        object_id: selectedObject,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
        status: 'pending_confirmation',
      });

      if (error) throw error;

      toast({
        title: 'Заказ отправлен',
        description: 'Клинеру нужно подтвердить заказ',
      });

      resetForm();
      setOpen(false);
      onOrderCreated();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать заказ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedObjectData = objects.find((object) => object.id === selectedObject);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="w-4 h-4 mr-2" />
          Создать заказ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Заказ уборки</DialogTitle>
        </DialogHeader>

        {isLoading && cleaners.length === 0 ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-5 py-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Апартамент
                </Label>
                <Select value={selectedObject} onValueChange={setSelectedObject}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Выберите объект" />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map((object) => (
                      <SelectItem key={object.id} value={object.id}>
                        {object.complex_name} - {object.apartment_number}
                        {object.apartment_type ? ` (${getApartmentTypeLabel(object.apartment_type)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedObjectData && (
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{selectedObjectData.complex_name}</p>
                  <p className="text-muted-foreground">
                    Апартамент {selectedObjectData.apartment_number}
                    {selectedObjectData.apartment_type ? `, ${getApartmentTypeLabel(selectedObjectData.apartment_type)}` : ''}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Дата
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
                  Время
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
                <Label>Свободный клинер</Label>
                <p className="text-xs text-muted-foreground">
                  Клинеры с занятым временем или отмеченной недоступностью недоступны для выбора.
                </p>
              </div>

              {cleanerAvailability.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Нет доступных клинеров для управляющих.
                </div>
              ) : (
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
              )}

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !selectedObject || !selectedDate || !selectedTime || !selectedCleaner}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Создание...' : 'Отправить на подтверждение'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
