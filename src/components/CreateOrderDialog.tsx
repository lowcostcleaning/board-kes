import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Building2, Home, Clock, User, CalendarIcon, Send, Banknote, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { CleanerRatingDisplay } from '@/components/CleanerRatingDisplay';
import { CleanerFilters } from '@/components/CleanerFilters';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
}

interface Cleaner {
  id: string;
  email: string;
  name: string | null;
  rating: number | null;
  completed_orders_count: number;
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

interface CleanerOrder {
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

interface CreateOrderDialogProps {
  onOrderCreated: () => void;
  disabled?: boolean;
}

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];

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

const getCleanerPrice = (cleaner: Cleaner, apartmentType: string | null): number | null => {
  if (!apartmentType) return null;
  switch (apartmentType) {
    case 'studio':
      return cleaner.price_studio;
    case '1+1':
      return cleaner.price_one_plus_one;
    case '2+1':
      return cleaner.price_two_plus_one;
    default:
      return null;
  }
};

export const CreateOrderDialog = ({ onOrderCreated, disabled }: CreateOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'cleaner' | 'calendar' | 'details'>('cleaner');
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [selectedCleaner, setSelectedCleaner] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cleanerOrders, setCleanerOrders] = useState<CleanerOrder[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    if (open) {
      fetchObjects();
      fetchCleaners();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCleaner) {
      fetchCleanerOrders();
    }
  }, [selectedCleaner]);

  useEffect(() => {
    if (selectedDate && cleanerOrders.length > 0) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const busySlots = cleanerOrders
        .filter(order => 
          order.scheduled_date === dateStr && 
          order.status !== 'cancelled'
        )
        .map(order => order.scheduled_time);
      setBusyTimeSlots(busySlots);
      if (busySlots.includes(selectedTime)) {
        setSelectedTime('');
      }
    } else {
      setBusyTimeSlots([]);
    }
  }, [selectedDate, cleanerOrders]);

  const fetchObjects = async () => {
    const { data, error } = await supabase
      .from('objects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setObjects(data);
    }
  };

  const fetchCleaners = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, rating, completed_orders_count, price_studio, price_one_plus_one, price_two_plus_one')
      .eq('role', 'cleaner')
      .eq('status', 'approved');

    if (!error && data) {
      setCleaners(data);
    }
  };

  const fetchCleanerOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('scheduled_date, scheduled_time, status')
      .eq('cleaner_id', selectedCleaner);

    if (!error && data) {
      setCleanerOrders(data);
    }
  };

  const sortedCleaners = useMemo(() => {
    const sorted = [...cleaners];
    switch (sortBy) {
      case 'rating_desc':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'rating_asc':
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'orders_desc':
        return sorted.sort((a, b) => b.completed_orders_count - a.completed_orders_count);
      case 'orders_asc':
        return sorted.sort((a, b) => a.completed_orders_count - b.completed_orders_count);
      case 'price_asc':
        return sorted.sort((a, b) => (a.price_studio || 0) - (b.price_studio || 0));
      case 'price_desc':
        return sorted.sort((a, b) => (b.price_studio || 0) - (a.price_studio || 0));
      case 'name':
      default:
        return sorted.sort((a, b) => 
          (a.name || a.email || '').localeCompare(b.name || b.email || '')
        );
    }
  }, [cleaners, sortBy]);

  const resetForm = () => {
    setStep('cleaner');
    setSelectedCleaner('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedObject('');
    setCleanerOrders([]);
    setBusyTimeSlots([]);
    setSortBy('name');
  };

  const handleCleanerSelect = (cleanerId: string) => {
    setSelectedCleaner(cleanerId);
    setStep('calendar');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedCleaner || !selectedDate || !selectedTime || !selectedObject) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { error } = await supabase.from('orders').insert({
        manager_id: user.id,
        cleaner_id: selectedCleaner,
        object_id: selectedObject,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Заявка создана',
      });

      resetForm();
      setOpen(false);
      onOrderCreated();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать заявку',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedObjectData = objects.find(o => o.id === selectedObject);
  const selectedCleanerData = cleaners.find(c => c.id === selectedCleaner);
  const selectedPrice = selectedCleanerData && selectedObjectData 
    ? getCleanerPrice(selectedCleanerData, selectedObjectData.apartment_type)
    : null;

  const availableTimeSlots = TIME_SLOTS.filter(time => !busyTimeSlots.includes(time));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      <DialogContent className="sm:max-w-[440px]">
        {step === 'cleaner' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Выберите клинера</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <CleanerFilters sortBy={sortBy} onSortChange={setSortBy} />
              
              {sortedCleaners.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Нет доступных клинеров
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {sortedCleaners.map((cleaner) => (
                    <button
                      key={cleaner.id}
                      onClick={() => handleCleanerSelect(cleaner.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[14px] bg-[#f5f5f5] dark:bg-muted/40 hover:bg-[#ebebeb] dark:hover:bg-muted/60 transition-all duration-300 text-left hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium block">
                          {cleaner.name || cleaner.email?.split('@')[0] || 'Клинер'}
                        </span>
                        <CleanerRatingDisplay
                          rating={cleaner.rating}
                          completedOrders={cleaner.completed_orders_count}
                          size="sm"
                        />
                        {(cleaner.price_studio || cleaner.price_one_plus_one || cleaner.price_two_plus_one) && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <Banknote className="w-3 h-3" />
                            <span>
                              {cleaner.price_studio && `Ст: ${cleaner.price_studio}₾`}
                              {cleaner.price_one_plus_one && ` • 1+1: ${cleaner.price_one_plus_one}₾`}
                              {cleaner.price_two_plus_one && ` • 2+1: ${cleaner.price_two_plus_one}₾`}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {step === 'calendar' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Выберите дату</DialogTitle>
            {selectedCleanerData && (
              <p className="text-sm text-muted-foreground text-center mt-1">
                Расписание: {selectedCleanerData.name || selectedCleanerData.email?.split('@')[0]}
              </p>
              )}
            </DialogHeader>
            <div className="py-4">
              <OrdersCalendar
                cleanerId={selectedCleaner}
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                minDate={today}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setStep('cleaner')}
              className="rounded-[14px] transition-all duration-300"
            >
              Назад
            </Button>
          </>
        )}

        {step === 'details' && (
          <>
            <DialogHeader className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-[18px] bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle>Уборка апартаментов</DialogTitle>
              {selectedDate && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(selectedDate, 'd MMMM yyyy г.', { locale: ru })}
                </p>
              )}
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Время
                </Label>
                {availableTimeSlots.length === 0 ? (
                  <p className="text-sm text-destructive p-3 rounded-[14px] bg-destructive/10">
                    Все слоты заняты на эту дату. Выберите другую дату.
                  </p>
                ) : (
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="bg-[#f5f5f5] dark:bg-muted/40 rounded-[14px] border-0">
                      <SelectValue placeholder="Выберите время" />
                    </SelectTrigger>
                    <SelectContent className="bg-background rounded-[14px]">
                      {TIME_SLOTS.map((time) => {
                        const isBusy = busyTimeSlots.includes(time);
                        return (
                          <SelectItem 
                            key={time} 
                            value={time} 
                            disabled={isBusy}
                            className={cn(
                              "rounded-lg",
                              isBusy && "text-muted-foreground line-through"
                            )}
                          >
                            {time} {isBusy && '(занято)'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Объект
                </Label>
                <Select value={selectedObject} onValueChange={setSelectedObject}>
                  <SelectTrigger className="bg-[#f5f5f5] dark:bg-muted/40 rounded-[14px] border-0">
                    <SelectValue placeholder="Выберите объект" />
                  </SelectTrigger>
                  <SelectContent className="bg-background rounded-[14px]">
                    {objects.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id} className="rounded-lg">
                        {obj.complex_name} - {obj.apartment_number}
                        {obj.apartment_type && (
                          <span className="ml-1 text-muted-foreground">
                            ({getApartmentTypeLabel(obj.apartment_type)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedObjectData && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-[14px] bg-[#f5f5f5] dark:bg-muted/40">
                    <Label className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building2 className="w-3 h-3" />
                      ЖК
                    </Label>
                    <p className="text-sm">{selectedObjectData.complex_name}</p>
                  </div>
                  <div className="p-3 rounded-[14px] bg-[#f5f5f5] dark:bg-muted/40">
                    <Label className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Home className="w-3 h-3" />
                      Апартамент
                    </Label>
                    <p className="text-sm">
                      {selectedObjectData.apartment_number}
                      {selectedObjectData.apartment_type && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {getApartmentTypeLabel(selectedObjectData.apartment_type)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {selectedCleanerData && (
                <div className="p-3 rounded-[14px] bg-[#f5f5f5] dark:bg-muted/40">
                  <Label className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-3 h-3" />
                    Клинер
                  </Label>
                  <p className="text-sm">
                    {selectedCleanerData.name || selectedCleanerData.email?.split('@')[0]}
                    {selectedCleanerData.name && (
                      <span className="text-muted-foreground ml-1">
                        (@{selectedCleanerData.email?.split('@')[0]})
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <CleanerRatingDisplay
                      rating={selectedCleanerData.rating}
                      completedOrders={selectedCleanerData.completed_orders_count}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {selectedPrice !== null && (
                <div className="p-3 rounded-[14px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Label className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
                    <Banknote className="w-3 h-3" />
                    Стоимость уборки
                  </Label>
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                    {selectedPrice} ₾
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('calendar')} 
                className="flex-1 rounded-[14px] transition-all duration-300"
              >
                Назад
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !selectedTime || !selectedObject}
                className="flex-1 bg-primary hover:bg-primary/90 rounded-[14px] transition-all duration-300"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Создание...' : 'Отправить'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
