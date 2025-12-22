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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-emerald-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-rose-400',
};

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
          className="h-8 w-8 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold min-w-[160px] text-center capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: ru })}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={nextMonth}
          className="h-8 w-8 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 mb-2">
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
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the start of month */}
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square p-1" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((date) => {
            const dayOrders = getOrdersForDay(date);
            const isToday = isSameDay(date, new Date());

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "aspect-square p-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors",
                  isToday && "bg-primary/10 ring-1 ring-primary/30",
                  dayOrders.length > 0 && !isToday && "bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary"
                  )}
                >
                  {format(date, 'd')}
                </span>
                
                {/* Order status dots */}
                {dayOrders.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
                    {dayOrders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          statusColors[order.status] || 'bg-muted-foreground'
                        )}
                      />
                    ))}
                    {dayOrders.length > 4 && (
                      <span className="text-[8px] text-muted-foreground">+{dayOrders.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Ожидает</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
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
