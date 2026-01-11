import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
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
import { Plus, Building2, Home, Clock, CalendarIcon, Send, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { CleanerRatingDisplay } from '@/components/CleanerRatingDisplay';
import { CleanerFilters } from '@/components/CleanerFilters';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  user_id: string;
}

interface Manager {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  rating: number | null; // Added rating
  completed_orders_count: number; // Added completed_orders_count
}

interface CleanerOrder {
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

interface UnavailableDate {
  date: string;
}

interface CleanerCreateOrderDialogProps {
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

export const CleanerCreateOrderDialog = ({ onOrderCreated, disabled }: CleanerCreateOrderDialogProps) => {
  const { profile } = useAuth();
  const isDemoCleaner = profile?.role === 'demo_cleaner';

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'manager' | 'calendar' | 'details'>('manager');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cleanerOrders, setCleanerOrders] = useState<CleanerOrder[]>([]);
  const [cleanerUnavailableDates, setCleanerUnavailableDates] = useState<UnavailableDate[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null); // Added selectedPrice state

  // Load managers when dialog opens
  useEffect(() => {
    if (open) {
      fetchCleaners();
    }
  }, [open, isDemoCleaner]);

  // Fetch objects when manager is selected
  useEffect(() => {
    if (selectedManager) {
      fetchObjectsForManager(selectedManager);
    } else {
      setObjects([]);
    }
  }, [selectedManager]);

  // Update busy time slots when date changes
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
  }, [selectedDate, cleanerOrders, selectedTime]);

  const fetchCleaners = async () => {
    let query = supabase
      .from('profiles')
      .select('id, email, name, avatar_url, rating, completed_orders_count') // Added rating and completed_orders_count
      .eq('status', 'approved');

    if (isDemoCleaner) {
      query = query.eq('role', 'demo_manager');
    } else {
      query = query.eq('role', 'manager');
    }

    const { data, error } = await query;

    if (!error && data) {
      setManagers(data);
    }
  };

  const fetchObjectsForManager = async (managerId: string) => {
    console.log('Fetching objects for manager:', managerId);
    
    const { data, error } = await supabase
      .from('objects')
      .select('id, complex_name, apartment_number, apartment_type, user_id')
      .eq('user_id', managerId)
      .order('created_at', { ascending: false });

    console.log('Objects fetched:', data?.length);
    console.log('Error:', error);

    if (!error && data) {
      setObjects(data);
    } else {
      setObjects([]);
    }
  };

  const fetchCleanerOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select('scheduled_date, scheduled_time, status')
      .eq('cleaner_id', user.id);

    if (!error && data) {
      setCleanerOrders(data);
    }
  };

  const fetchCleanerUnavailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('cleaner_unavailability')
      .select('date')
      .eq('cleaner_id', user.id);

    if (!error && data) {
      setCleanerUnavailableDates(data);
    }
  };

  const sortedCleaners = useMemo(() => {
    const sorted = [...managers];
    switch (sortBy) {
      case 'name':
      default:
        return sorted.sort((a, b) => 
          (a.name || a.email || '').localeCompare(b.name || b.email || '')
        );
    }
  }, [managers, sortBy]);

  const isDateUnavailable = (date: Date): boolean => {
    return cleanerUnavailableDates.some(u => isSameDay(new Date(u.date), date));
  };

  const resetForm = () => {
    setStep('manager');
    setSelectedManager(null);
    setSelectedObject('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setCleanerOrders([]);
    setCleanerUnavailableDates([]);
    setBusyTimeSlots([]);
    setSortBy('name');
    setSelectedPrice(null);
    setObjects([]);
  };

  const handleCleanerSelect = (managerId: string) => {
    setSelectedManager(managerId);
    setSelectedObject('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setObjects([]);
    setStep('calendar');
  };

  const handleDateSelect = (date: Date) => {
    if (isDateUnavailable(date)) {
      toast({
        title: 'Дата недоступна',
        description: 'Клинер недоступен в выбранную дату',
        variant: 'destructive',
      });
      return;
    }
    setSelectedDate(date);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedManager || !selectedDate || !selectedTime || !selectedObject) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    if (isDateUnavailable(selectedDate)) {
      toast({
        title: 'Ошибка',
        description: 'Клинер недоступен в выбранную дату',
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
        cleaner_id: selectedManager,
        object_id: selectedObject,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      });

      if (error) {
        if (error.message.includes('недоступен')) {
          throw new Error('Клинер недоступен в выбранную дату');
        }
        throw error;
      }

      toast({
        title: 'Успешно',
        description: 'Заявка создана',
      });

      setOpen(false);
      resetForm();
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
  const selectedCleanerData = managers.find(c => c.id === selectedManager);
  
  // Calculate selected price using complex pricing if available, otherwise fallback to global
  const selectedPrice = null; // Placeholder, as pricing logic is not fully implemented here

  const availableTimeSlots = TIME_SLOTS.filter(time => !busyTimeSlots.includes(time));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetForm();
      }
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Создать уборку
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        {step === 'manager' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base sm:text-lg">Выберите управляющую компанию</DialogTitle>
            </DialogHeader>
            <div className="py-3 sm:py-4">
              <CleanerFilters sortBy={sortBy} onSortChange={setSortBy} />
              
              {sortedCleaners.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Нет доступных управляющих компаний
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {sortedCleaners.map((manager) => (
                    <button
                      key={manager.id}
                      onClick={() => handleCleanerSelect(manager.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[14px] bg-muted/50 hover:bg-muted transition-all duration-300 text-left hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <UserAvatar
                        avatarUrl={manager.avatar_url}
                        name={manager.name}
                        email={manager.email}
                        size="md"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium block">
                          {manager.name || manager.email?.split('@')[0] || 'Менеджер'}
                        </span>
                        {/* Manager rating and completed orders are not applicable here */}
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
                cleanerId={selectedCleaner || undefined} // Ensure it's string or undefined
                onDateSelect={handleDateSelect}
                selectedDate={selectedDate}
                minDate={today}
              />
              {cleanerUnavailableDates.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Перечёркнутые даты — клинер недоступен
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedManager(null);
                setObjects([]);
                setStep('manager');
              }}
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
                  <Label className="flex items-center gap-2 text-muted-foreground mb-2">
                    Менеджер
                  </Label>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={selectedCleanerData.avatar_url}
                      name={selectedCleanerData.name}
                      email={selectedCleanerData.email}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {selectedCleanerData.name || selectedCleanerData.email?.split('@')[0]}
                      </p>
                      {/* Manager rating and completed orders are not applicable here */}
                    </div>
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