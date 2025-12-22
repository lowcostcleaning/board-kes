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
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      // If cleanerId is provided, fetch that cleaner's orders
      if (cleanerId) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, scheduled_date, status')
          .eq('cleaner_id', cleanerId);

        if (error) throw error;
        setOrders(data || []);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('orders')
        .select('id, scheduled_date, status');

      if (userRole === 'cleaner') {
        query = query.eq('cleaner_id', user.id);
      } else {
        query = query.eq('manager_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders for calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getDayBackground = (dayOrders: OrderForCalendar[], isSelected: boolean) => {
    if (isSelected) return 'bg-primary/20';
    if (dayOrders.length === 0) return 'bg-[#f5f5f5] dark:bg-muted/40';
    
    const hasConfirmedOrCompleted = dayOrders.some(o => o.status === 'confirmed' || o.status === 'completed');
    const hasCancelled = dayOrders.some(o => o.status === 'cancelled');
    const hasPending = dayOrders.some(o => o.status === 'pending');
    
    if (hasConfirmedOrCompleted && !hasCancelled && !hasPending) {
      return 'bg-emerald-50 dark:bg-emerald-900/20';
    }
    if (hasCancelled && !hasConfirmedOrCompleted && !hasPending) {
      return 'bg-rose-50 dark:bg-rose-900/20';
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
      case 'cancelled':
        return 'bg-rose-400';
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
            const bgColor = getDayBackground(dayOrders, isSelected);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDayClick(date)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square rounded-[14px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ease-out",
                  bgColor,
                  onDateSelect && !isDisabled && "cursor-pointer hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]",
                  isToday && "ring-2 ring-primary/30 ring-offset-2 ring-offset-[#f8f8f8] dark:ring-offset-card",
                  isSelected && "ring-2 ring-primary shadow-md",
                  isDisabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isToday && "text-primary font-semibold",
                    isSelected && "text-primary font-semibold"
                  )}
                >
                  {format(date, 'd')}
                </span>
                
                {dayOrders.length > 0 && (
                  <div className="flex gap-[3px] flex-wrap justify-center max-w-[80%]">
                    {dayOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "w-[5px] h-[5px] rounded-full transition-transform duration-200",
                          getDotColor(order.status)
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-5 pt-4 border-t border-border/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Ожидает</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Подтверждён</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Отменён</span>
          </div>
        </div>
      </div>
    </div>
  );
};
