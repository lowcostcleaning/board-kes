import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Building2, Home, Clock, CalendarIcon, Send, Banknote, Award, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { CleanerRatingDisplay } from '@/components/CleanerRatingDisplay';
import { CleanerFilters } from '@/components/CleanerFilters';
import { UserAvatar } from '@/components/UserAvatar';
import { Tables } from '@/integrations/supabase/types';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  residential_complex_id: string | null;
}

interface Cleaner {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  rating: number | null;
  // Global prices from profiles table (used as fallback)
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
  // New fields for level and inventory
  level_title: string | null;
  level_number: number | null;
  inventory_completed: number | null;
  inventory_total: number | null;
  total_cleanings: number; // Added total_cleanings from cleaner_stats_view
  manual_orders_adjustment: number; // New field
  final_total_cleanings: number; // Calculated field
}

interface CleanerWithStats extends Cleaner {
  clean_rate?: number;
}

interface CleanerOrder {
  scheduled_date: string;
  scheduled_time: string;
  status: string;
}

interface UnavailableDate {
  date: string;
}

interface CreateOrderDialogProps {
  onOrderCreated: () => void;
  disabled?: boolean;
}

const TIME_SLOTS = ['10:00', '12:00', '14:00', '16:00', '18:00'];

const getApartmentTypeLabel = (type: string | null) => {
  switch (type) {
    case 'studio': return 'Студия';
    case '1+1': return '1+1';
    case '2+1': return '2+1';
    default: return null;
  }
};

interface PriceSource {
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

const getCleanerPrice = (cleaner: Cleaner, apartmentType: string | null, complexPricing: PriceSource | null): number | null => {
  if (!apartmentType) return null;

  // Prioritize complex pricing if available, otherwise use global profile prices
  const prices = complexPricing || cleaner;
  
  switch (apartmentType) {
    case 'studio': return prices.price_studio;
    case '1+1': return prices.price_one_plus_one;
    case '2+1': return prices.price_two_plus_one;
    default: return null;
  }
};

export const CreateOrderDialog = ({ onOrderCreated, disabled }: CreateOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'cleaner' | 'calendar' | 'details'>('cleaner');
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [cleaners, setCleaners] = useState<CleanerWithStats[]>([]);
  const [selectedCleaner, setSelectedCleaner] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cleanerOrders, setCleanerOrders] = useState<CleanerOrder[]>([]);
  const [cleanerUnavailableDates, setCleanerUnavailableDates] = useState<UnavailableDate[]>([]);
  const [busyTimeSlots, setBusyTimeSlots] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [cleanerComplexPricing, setCleanerComplexPricing] = useState<PriceSource | null>(null);

  useEffect(() => {
    if (open) {
      fetchObjects();
      fetchCleaners();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCleaner) {
      fetchCleanerOrders();
      fetchCleanerUnavailability();
    }
  }, [selectedCleaner]);

  useEffect(() => {
    if (selectedCleaner && selectedObject) {
      fetchCleanerComplexPricing(selectedCleaner, selectedObject);
    } else {
      setCleanerComplexPricing(null);
    }
  }, [selectedCleaner, selectedObject, objects]);

  useEffect(() => {
    if (selectedDate && cleanerOrders.length > 0) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const busySlots = cleanerOrders
        .filter(order => order.scheduled_date === dateStr && order.status !== 'cancelled')
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
      .select('id, complex_name, apartment_number, apartment_type, residential_complex_id')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setObjects(data);
    }
  };

  const fetchCleaners = async () => {
    // Get current user's role to determine which cleaners to show
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isDemoManager = profile?.role === 'demo_manager';

    // Demo managers see demo_cleaners, regular managers see approved cleaners
    let query = supabase
      .from('profiles')
      .select('id, email, name, avatar_url, rating, price_studio, price_one_plus_one, price_two_plus_one, manual_orders_adjustment'); // Select new column

    if (isDemoManager) {
      query = query.eq('role', 'demo_cleaner');
    } else {
      query = query.eq('role', 'cleaner').eq('status', 'approved');
    }

    const { data, error } = await query;
    if (!error && data) {
      const allCleaners = data as Cleaner[];
      const cleanersWithDetails: CleanerWithStats[] = [];
      const totalInventoryItems = (await supabase.from('inventory_items').select('code', { count: 'exact', head: true })).count || 0;

      for (const cleaner of allCleaners) {
        // Fetch stats
        const { data: statsData } = await supabase
          .from('cleaner_stats_view')
          .select('total_cleanings, avg_rating, clean_jobs, clean_rate, final_cleanings') // Select final_cleanings
          .eq('cleaner_id', cleaner.id)
          .single();

        // Fetch level
        const { data: levelData } = await supabase
          .rpc('get_cleaner_level', { p_cleaner_id: cleaner.id });
        const currentLevel: Tables<'levels'> | null = levelData && levelData.length > 0 ? levelData[0] : null;

        // Fetch inventory progress
        const { count: completedItems } = await supabase
          .from('user_inventory')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', cleaner.id)
          .eq('has_item', true);

        const realTotalCleanings = statsData?.total_cleanings || 0;
        const manualAdjustment = cleaner.manual_orders_adjustment || 0;
        const finalTotalCleanings = statsData?.final_cleanings || 0; // Use final_cleanings from view

        cleanersWithDetails.push({
          ...cleaner,
          total_cleanings: realTotalCleanings, // Store real total from stats
          manual_orders_adjustment: manualAdjustment,
          final_total_cleanings: finalTotalCleanings, // Store calculated final total
          clean_rate: statsData?.clean_rate || 0,
          level_title: currentLevel?.title || 'Новичок',
          level_number: currentLevel?.level ?? 0,
          inventory_completed: completedItems || 0,
          inventory_total: totalInventoryItems,
        });
      }
      
      setCleaners(cleanersWithDetails);
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

  const fetchCleanerUnavailability = async () => {
    const { data, error } = await supabase
      .from('cleaner_unavailability')
      .select('date')
      .eq('cleaner_id', selectedCleaner);

    if (!error && data) {
      setCleanerUnavailableDates(data);
    }
  };

  const fetchCleanerComplexPricing = async (cleanerId: string, objectId: string) => {
    const objectData = objects.find(o => o.id === objectId);
    const residentialComplexId = objectData?.residential_complex_id;
    
    if (!residentialComplexId) {
      setCleanerComplexPricing(null);
      return;
    }

    const { data, error } = await supabase
      .from('cleaner_pricing')
      .select('price_studio, price_one_plus_one, price_two_plus_one')
      .eq('user_id', cleanerId)
      .eq('complex_id', residentialComplexId)
      .maybeSingle<Tables<'cleaner_pricing'>>();

    if (error) {
      console.error('Error fetching complex pricing:', error);
      setCleanerComplexPricing(null);
      return;
    }

    setCleanerComplexPricing(data || null);
  };

  const sortedCleaners = useMemo(() => {
    const sorted = [...cleaners];
    switch (sortBy) {
      case 'rating_desc':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'rating_asc':
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'orders_desc':
        return sorted.sort((a, b) => (b.final_total_cleanings || 0) - (a.final_total_cleanings || 0)); // Use final_total_cleanings
      case 'orders_asc':
        return sorted.sort((a, b) => (a.final_total_cleanings || 0) - (b.final_total_cleanings || 0)); // Use final_total_cleanings
      case 'price_asc':  // Use global price for sorting if complex price isn't easily accessible here
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

  // Check if a date is unavailable for the selected cleaner
  const isDateUnavailable = (date: Date): boolean => {
    return cleanerUnavailableDates.some(u => isSameDay(new Date(u.date), date));
  };

  const resetForm = () => {
    setStep('cleaner');
    setSelectedCleaner('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedObject('');
    setCleanerOrders([]);
    setCleanerUnavailableDates([]);
    setBusyTimeSlots([]);
    setSortBy('name');
    setCleanerComplexPricing(null);
  };

  const handleCleanerSelect = (cleanerId: string) => {
    setSelectedCleaner(cleanerId);
    setStep('calendar');
  };

  const handleDateSelect = (date: Date) => {
    // Block selection if date is unavailable
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
    if (!selectedCleaner || !selectedDate || !selectedTime || !selectedObject) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    // Double-check unavailability before submitting
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
        cleaner_id: selectedCleaner,
        object_id: selectedObject,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      });

      if (error) {
        // Handle backend validation error
        if (error.message.includes('недоступен')) {
          throw new Error('Клинер недоступен в выбранную дату');
        }
        throw error;
      }

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
  // Calculate selected price using complex pricing if available, otherwise fallback to global
  const selectedPrice = selectedCleanerData && selectedObjectData 
    ? getCleanerPrice(selectedCleanerData, selectedObjectData.apartment_type, cleanerComplexPricing) 
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
      <DialogContent className="max-w-[95vw] sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
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
                      <UserAvatar 
                        avatarUrl={cleaner.avatar_url} 
                        name={cleaner.name} 
                        email={cleaner.email} 
                        size="md" 
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium block">
                          {cleaner.name || cleaner.email?.split('@')[0] || 'Клинер'}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Award className="w-3 h-3 text-primary" />
                          <span>{cleaner.level_title}</span>
                          <Package className="w-3 h-3" />
                          <span>{cleaner.inventory_completed} / {cleaner.inventory_total}</span>
                        </div>
                        <CleanerRatingDisplay 
                          rating={cleaner.rating} 
                          totalCleanings={cleaner.final_total_cleanings} // Use final_total_cleanings
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
              {cleanerUnavailableDates.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Перечёркнутые даты — клинер недоступен
                </p>
              )}
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
                    Клинер
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
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Award className="w-3 h-3 text-primary" />
                          <span>{selectedCleanerData.level_title}</span>
                          <Package className="w-3 h-3" />
                          <span>{selectedCleanerData.inventory_completed} / {selectedCleanerData.inventory_total}</span>
                      </div>
                      <CleanerRatingDisplay 
                        rating={selectedCleanerData.rating} 
                        totalCleanings={selectedCleanerData.final_total_cleanings} // Use final_total_cleanings
                        size="sm" 
                      />
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