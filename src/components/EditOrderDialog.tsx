import { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Clock, CalendarIcon, Save, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ResidentialComplex {
  id: string;
  name: string;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    cleaner_id: string;
    user_id: string;
    complex_id: string | null;
  } | null;
  onSuccess: () => void;
  canDelete: boolean;
  canEditComplex: boolean;
}

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];
const NO_COMPLEX_VALUE = '__no_complex__';

interface CleanerOrder {
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  id: string;
}

interface UnavailableDate {
  date: string;
}

export const EditOrderDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
  canDelete,
  canEditComplex,
}: EditOrderDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cleanerOrders, setCleanerOrders] = useState<CleanerOrder[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<string[]>([]); // Added busyTimeSlots state
  const [complex_id, setComplex_id] = useState<string>(NO_COMPLEX_VALUE);
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);

  useEffect(() => {
    if (open && order) {
      setSelectedDate(new Date(order.scheduled_date));
      setSelectedTime(order.scheduled_time);
      setComplex_id(order.complex_id || NO_COMPLEX_VALUE);
      fetchCleanerData();
      if (order.user_id) {
        fetchComplexes(order.user_id);
      }
    }
  }, [open, order]);

  useEffect(() => {
    if (selectedDate && cleanerOrders.length > 0 && order) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const busySlots = cleanerOrders
        .filter(o =>
          o.scheduled_date === dateStr &&
          o.status !== 'cancelled' &&
          o.id !== order.id
        )
        .map(o => o.scheduled_time);
      setBusyTimeSlots(busySlots);
    } else {
      setBusyTimeSlots([]);
    }
  }, [selectedDate, cleanerOrders, order]);

  const fetchCleanerData = async () => {
    if (!order) return;

    const [ordersRes, unavailRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, scheduled_date, scheduled_time, status')
        .eq('cleaner_id', order.cleaner_id),
      supabase
        .from('cleaner_unavailability')
        .select('date')
        .eq('cleaner_id', order.cleaner_id)
    ]);

    if (!ordersRes.error && ordersRes.data) {
      setCleanerOrders(ordersRes.data);
    }
    if (!unavailRes.error && unavailRes.data) {
      setUnavailableDates(unavailRes.data);
    }
  };

  const fetchComplexes = async (managerId: string) => {
    const { data, error } = await supabase
      .from('residential_complexes')
      .select('id, name')
      .eq('manager_id', managerId)
      .order('name');

    if (!error) {
      setComplexes(data || []);
    }
  };

  const isDateUnavailable = (date: Date): boolean => {
    return unavailableDates.some(u => isSameDay(new Date(u.date), date));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (isDateUnavailable(date)) {
      toast({
        title: 'Дата недоступна',
        description: 'Клинер недоступен в эту дату',
        variant: 'destructive',
      });
      return;
    }
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const busyOnNewDate = cleanerOrders
      .filter(o =>
        o.scheduled_date === dateStr &&
        o.status !== 'cancelled' &&
        o.id !== order?.id
      )
      .map(o => o.scheduled_time);

    if (busyOnNewDate.includes(selectedTime)) {
      setSelectedTime('');
    }
  };

  const handleSave = async () => {
    if (!order || !selectedDate || !selectedTime) return;

    setIsLoading(true);

    try {
      const payload: any = {
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      };

      if (canEditComplex) {
        payload.complex_id = complex_id === NO_COMPLEX_VALUE ? null : complex_id;
      }

      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Заказ обновлён',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить заказ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Заказ удалён',
      });

      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить заказ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasChanges = order && selectedDate && selectedTime && (
    format(selectedDate, 'yyyy-MM-dd') !== order.scheduled_date ||
    selectedTime !== order.scheduled_time ||
    (canEditComplex && (complex_id === NO_COMPLEX_VALUE ? null : complex_id) !== order.complex_id)
  );

  const complexLabel = () => {
    if (order?.complex_id) {
      const complex = complexes.find(c => c.id === order.complex_id);
      return (complex && complex.name) || 'Привязан к ЖК';
    }
    return 'Без ЖК';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-lg">
              Изменить дату и время
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 sm:py-4 space-y-4">
            {canEditComplex && (
              <div className="space-y-2 px-4">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  ЖК
                </Label>
                <Select value={complex_id} onValueChange={setComplex_id}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue>
                      {complex_id === NO_COMPLEX_VALUE
                        ? 'Без ЖК'
                        : complexes.find((c) => c.id === complex_id)?.name || 'Выберите ЖК'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_COMPLEX_VALUE}>Без ЖК</SelectItem>
                    {complexes.map((complex) => (
                      <SelectItem key={complex.id} value={complex.id}>
                        {complex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!canEditComplex && (
              <div className="px-4">
                <Label className="text-xs text-muted-foreground">ЖК</Label>
                <p className="text-sm">{complexLabel()}</p>
              </div>
            )}

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < today || isDateUnavailable(date)}
                locale={ru}
                className="rounded-md border p-2 sm:p-3"
              />
            </div>

            {selectedDate && (
              <div className="space-y-2 px-4">
                <Label className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  Время
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const isBusy = busyTimeSlots.includes(time);
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => !isBusy && setSelectedTime(time)}
                        disabled={isBusy}
                        className={cn(
                          "p-2 rounded-lg text-sm font-medium transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : isBusy
                              ? "bg-muted/30 text-muted-foreground line-through cursor-not-allowed"
                              : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 px-4 pb-4">
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="flex-1 rounded-[14px]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges || !selectedTime || !selectedDate}
              className="flex-1 rounded-[14px]"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Заказ будет удалён.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const EditObjectDialog = EditOrderDialog;