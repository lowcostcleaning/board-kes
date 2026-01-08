import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface OrderForCalendar {
  id: string;
  scheduled_date: string;
  status: string;
}

interface UnavailabilityDate {
  id: string;
  date: string;
}

interface OrdersCalendarProps {
  refreshTrigger?: number;
  userRole?: 'manager' | 'cleaner';
  cleanerId?: string;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  minDate?: Date;
}

export const OrdersCalendar = ({ 
  refreshTrigger = 0, 
  userRole = 'cleaner', 
  cleanerId,
  onDateSelect,
  selectedDate,
  minDate
}: OrdersCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [orders, setOrders] = useState<OrderForCalendar[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailabilityDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetCleanerId = cleanerId || (userRole === 'cleaner' ? user.id : undefined);

      // Fetch orders (exclude cancelled from calendar)
      let ordersQuery = supabase
        .from('orders')
        .select('id, scheduled_date, status')
        .neq('status', 'cancelled');

      if (targetCleanerId) {
        ordersQuery = ordersQuery.eq('cleaner_id', targetCleanerId);
      } else if (userRole === 'manager') {
        ordersQuery = ordersQuery.eq('manager_id', user.id);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch unavailability for cleaners
      if (targetCleanerId) {
        const { data: unavailabilityData, error: unavailabilityError } = await supabase
          .from('cleaner_unavailability')
          .select('id, date')
          .eq('cleaner_id', targetCleanerId);

        if (unavailabilityError) throw unavailabilityError;
        setUnavailableDates(unavailabilityData || []);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, userRole, cleanerId]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = useMemo(() => {
    const day = startOfMonth(currentMonth).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentMonth]);

  const getOrdersForDay = (date: Date) => {
    return orders.filter(order => isSameDay(new Date(order.scheduled_date), date));
  };

  const isDateUnavailable = (date: Date) => {
    return unavailableDates.some(u => isSameDay(new Date(u.date), date));
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getDayBackground = (dayOrders: OrderForCalendar[], isSelected: boolean, isUnavailable: boolean) => {
    if (isSelected) return 'bg-primary/20';
    if (isUnavailable) return 'bg-destructive/10 dark:bg-destructive/20'; // Changed to red background
    if (dayOrders.length === 0) return 'bg-[#f5f5f5] dark:bg-muted/40';
    
    const hasConfirmedOrCompleted = dayOrders.some(o => o.status === 'confirmed' || o.status === 'completed');
    const hasPending = dayOrders.some(o => o.status === 'pending');
    
    if (hasConfirmedOrCompleted && !hasPending) {
      return 'bg-emerald-50 dark:bg-emerald-900/20';
    }
    return 'bg-[#f5f5f5] dark:bg-muted/40';
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-400';
      case 'confirmed':
      case 'completed':
        return 'bg-emerald-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  const handleDayClick = (date: Date) => {
    if (minDate && date < minDate) return;
    onDateSelect?.(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-[system-ui]">
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={previousMonth}
          className="h-10 w-10 rounded-full border-0 bg-[#f5f5f5] dark:bg-muted/40 hover:bg-[#ebebeb] dark:hover:bg-muted/60 shadow-sm transition-all duration-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold min-w-[180px] text-center tracking-tight">
          {format(currentMonth, 'LLLL yyyy', { locale: ru })} г.
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          className="h-10 w-10 rounded-full border-0 bg-[#f5f5f5] dark:bg-muted/40 hover:bg-[#ebebeb] dark:hover:bg-muted/60 shadow-sm transition-all duration-300"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-[20px] bg-[#f8f8f8] dark:bg-card/50 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none">
        {/* Week days header */}
        <div className="grid grid-cols-7 mb-3">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground/70 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {daysInMonth.map((date) => {
            const dayOrders = getOrdersForDay(date);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
            const isDisabled = minDate ? date < minDate : false;
            const isUnavailable = isDateUnavailable(date);
            const bgColor = getDayBackground(dayOrders, isSelected, isUnavailable);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ease-out relative",
                  bgColor,
                  onDateSelect && !isDisabled && "cursor-pointer hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]",
                  isToday && "ring-2 ring-primary/30 ring-offset-2 ring-offset-[#f8f8f8] dark:ring-offset-card",
                  isSelected && "ring-2 ring-primary shadow-md",
                  isDisabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[1px] bg-destructive dark:bg-destructive/80 rotate-45 transform origin-center" style={{ width: '60%' }} />
                  </div>
                )}
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isToday && "text-primary font-semibold",
                    isSelected && "text-primary font-semibold",
                    isUnavailable && "text-destructive dark:text-destructive-foreground" // Changed text color for better contrast
                  )}
                >
                  {format(date, 'd')}
                </span>
                
                {dayOrders.length > 0 && (
                  <div className="flex gap-[2px] justify-center">
                    {dayOrders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "w-[4px] h-[4px] rounded-full flex-shrink-0",
                          getDotColor(order.status)
                        )}
                      />
                    ))}
                    {dayOrders.length > 3 && (
                      <span className="text-[8px] text-muted-foreground ml-0.5">+{dayOrders.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-border/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Ожидает</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Подтверждён</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-3 h-3 rounded bg-destructive/10 dark:bg-destructive/20 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[60%] h-[1px] bg-destructive rotate-45" />
              </div>
            </div>
            <span>Недоступен</span>
          </div>
        </div>
      </div>
    </div>
  );
};