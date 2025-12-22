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
  refreshTrigger: number;
  userRole: 'manager' | 'cleaner';
}

export const OrdersCalendar = ({ refreshTrigger, userRole }: OrdersCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [orders, setOrders] = useState<OrderForCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
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
  }, [refreshTrigger, userRole]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get day of week for first day of month (0 = Monday, 6 = Sunday)
  const startDayOfWeek = useMemo(() => {
    const day = startOfMonth(currentMonth).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday = 0 to Monday-based week
  }, [currentMonth]);

  const getOrdersForDay = (date: Date) => {
    return orders.filter(order => isSameDay(new Date(order.scheduled_date), date));
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Determine day background color based on orders
  const getDayBackground = (dayOrders: OrderForCalendar[]) => {
    if (dayOrders.length === 0) return '';
    
    const hasConfirmedOrCompleted = dayOrders.some(o => o.status === 'confirmed' || o.status === 'completed');
    const hasCancelled = dayOrders.some(o => o.status === 'cancelled');
    const hasPending = dayOrders.some(o => o.status === 'pending');
    
    if (hasConfirmedOrCompleted && !hasCancelled && !hasPending) {
      return 'bg-emerald-100 dark:bg-emerald-900/30';
    }
    if (hasCancelled && !hasConfirmedOrCompleted && !hasPending) {
      return 'bg-rose-100 dark:bg-rose-900/30';
    }
    // Mixed or pending only
    return 'bg-muted/80';
  };

  // Get dot color for each order status
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={previousMonth}
          className="h-10 w-10 rounded-full border-border/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-bold min-w-[180px] text-center">
          {format(currentMonth, 'LLLL yyyy', { locale: ru })} г.
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          className="h-10 w-10 rounded-full border-border/50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/30 bg-card/30 p-4 shadow-sm">
        {/* Week days header */}
        <div className="grid grid-cols-7 mb-3">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty cells for days before the start of month */}
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((date) => {
            const dayOrders = getOrdersForDay(date);
            const isToday = isSameDay(date, new Date());
            const bgColor = getDayBackground(dayOrders);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                  bgColor || "bg-muted/30",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {format(date, 'd')}
                </span>
                
                {/* Order status dots */}
                {dayOrders.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[80%]">
                    {dayOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          getDotColor(order.status)
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Ожидает</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Подтверждён</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Отменён</span>
          </div>
        </div>
      </div>
    </div>
  );
};
