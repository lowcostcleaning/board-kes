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
import { Plus, Building2, Home, Clock, CalendarIcon, Send, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { Calendar } from '@/components/ui/calendar';

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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'manager' | 'object' | 'datetime'>('manager');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<CleanerOrder[]>([]);
  const [myUnavailableDates, setMyUnavailableDates] = useState<UnavailableDate[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchManagers();
      fetchMyOrders();
      fetchMyUnavailability();
    }
  }, [open]);

  useEffect(() => {
    if (selectedManager) {
      fetchManagerObjects();
    }
  }, [selectedManager]);

  useEffect(() => {
    if (selectedDate && myOrders.length > 0) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const busySlots = myOrders
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
  }, [selectedDate, myOrders]);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url')
      .eq('role', 'manager')
      .eq('status', 'approved');

    if (!error && data) {
      setManagers(data);
    }
  };

  const fetchManagerObjects = async () => {
    const { data, error } = await supabase
      .from('objects')
      .select('*')
      .eq('user_id', selectedManager)
      .order('complex_name', { ascending: true });

    if (!error && data) {
      setObjects(data);
    }
  };

  const fetchMyOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select('scheduled_date, scheduled_time, status')
      .eq('cleaner_id', user.id);

    if (!error && data) {
      setMyOrders(data);
    }
  };

  const fetchMyUnavailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('cleaner_unavailability')
      .select('date')
      .eq('cleaner_id', user.id);

    if (!error && data) {
      setMyUnavailableDates(data);
    }
  };

  const isDateUnavailable = (date: Date): boolean => {
    return myUnavailableDates.some(u => isSameDay(new Date(u.date), date));
  };

  const resetForm = () => {
    setStep('manager');
    setSelectedManager('');
    setSelectedObject('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setObjects([]);
    setBusyTimeSlots([]);
  };

  const handleManagerSelect = (managerId: string) => {
    setSelectedManager(managerId);
    setSelectedObject('');
    setStep('object');
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObject(objectId);
    setStep('datetime');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    if (isDateUnavailable(date)) {
      toast({
        title: 'Дата недоступна',
        description: 'Вы отметили эту дату как недоступную',
        variant: 'destructive',
      });
      return;
    }
    setSelectedDate(date);
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
        description: 'Вы отметили эту дату как недоступную',
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
        manager_id: selectedManager,
        cleaner_id: user.id,
        object_id: selectedObject,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      });

      if (error) {
        if (error.message.includes('недоступен')) {
          throw new Error('Дата недоступна');
        }
        throw error;
      }

      toast({
        title: 'Успешно',
        description: 'Уборка создана',
      });

      resetForm();
      setOpen(false);
      onOrderCreated();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось создать уборку',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedManagerData = managers.find(m => m.id === selectedManager);
  const selectedObjectData = objects.find(o => o.id === selectedObject);
  const filteredObjects = objects.filter(o => o.user_id === selectedManager);
  
  const availableTimeSlots = TIME_SLOTS.filter(time => !busyTimeSlots.includes(time));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
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
              {managers.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  Нет доступных управляющих компаний
                </p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {managers.map((manager) => (
                    <button
                      key={manager.id}
                      onClick={() => handleManagerSelect(manager.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[14px] bg-muted/50 hover:bg-muted transition-all duration-300 text-left active:scale-[0.98]"
                    >
                      <UserAvatar
                        avatarUrl={manager.avatar_url}
                        name={manager.name}
                        email={manager.email}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">
                          {manager.name || manager.email?.split('@')[0] || 'Менеджер'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {manager.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {step === 'object' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-base sm:text-lg">Выберите объект</DialogTitle>
              {selectedManagerData && (
                <p className="text-sm text-muted-foreground text-center mt-1 truncate">
                  {selectedManagerData.name || selectedManagerData.email?.split('@')[0]}
                </p>
              )}
            </DialogHeader>
            <div className="py-3 sm:py-4">
              {filteredObjects.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  Нет доступных объектов
                </p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {filteredObjects.map((obj) => (
                    <button
                      key={obj.id}
                      onClick={() => handleObjectSelect(obj.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[14px] bg-muted/50 hover:bg-muted transition-all duration-300 text-left active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">
                          {obj.complex_name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Home className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{obj.apartment_number}</span>
                          {obj.apartment_type && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                              {getApartmentTypeLabel(obj.apartment_type)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setStep('manager')}
              className="rounded-[14px] w-full"
            >
              Назад
            </Button>
          </>
        )}

        {step === 'datetime' && (
          <>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle className="text-base sm:text-lg">Выберите дату и время</DialogTitle>
              {selectedObjectData && (
                <p className="text-sm text-muted-foreground truncate">
                  {selectedObjectData.complex_name} - {selectedObjectData.apartment_number}
                </p>
              )}
            </DialogHeader>
            
            <div className="py-3 sm:py-4 space-y-4">
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    Время
                  </Label>
                  {availableTimeSlots.length === 0 ? (
                    <p className="text-sm text-destructive p-3 rounded-[14px] bg-destructive/10">
                      Все слоты заняты. Выберите другую дату.
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
              )}

              {selectedDate && selectedTime && (
                <div className="p-3 rounded-[14px] bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">
                      {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                    </span>
                    <span className="text-muted-foreground">в {selectedTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{selectedManagerData?.name || selectedManagerData?.email}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('object')} 
                className="flex-1 rounded-[14px]"
              >
                Назад
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !selectedTime || !selectedDate}
                className="flex-1 bg-primary hover:bg-primary/90 rounded-[14px]"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
