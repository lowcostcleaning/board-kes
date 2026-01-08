import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminCleanerCalendar } from '@/hooks/use-admin-cleaner-calendar';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  confirmed: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  in_progress: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  completed: 'bg-status-active/20 text-status-active border-status-active/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const AdminCleanerCalendarTab = () => {
  const {
    orders,
    unavailability,
    cleaners,
    objects,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    getEventsForDate,
  } = useAdminCleanerCalendar();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(filters.month);
    const end = endOfMonth(filters.month);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding for first week
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start
    
    return { days, paddingDays };
  }, [filters.month]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filters.cleanerId || 'all'}
          onValueChange={(value) => updateFilters({ cleanerId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все клинеры" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все клинеры</SelectItem>
            {cleaners.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name || c.email || c.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.objectId || 'all'}
          onValueChange={(value) => updateFilters({ objectId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Все объекты" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            {objects.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.cleanerId || filters.objectId) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Сбросить
          </Button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center capitalize">
            {format(filters.month, 'LLLL yyyy', { locale: ru })}
          </h3>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Сегодня
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Заказов</span>
          </div>
          <p className="text-2xl font-bold mt-1">{orders.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Недоступно</span>
          </div>
          <p className="text-2xl font-bold mt-1">{unavailability.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Клинеров</span>
          </div>
          <p className="text-2xl font-bold mt-1">{cleaners.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Объектов</span>
          </div>
          <p className="text-2xl font-bold mt-1">{objects.length}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {/* Padding for first week */}
          {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px] p-2 border-t border-r border-border bg-muted/20" />
          ))}
          
          {calendarDays.days.map(day => {
            const events = getEventsForDate(day);
            const dayNumber = format(day, 'd');
            const hasOrders = events.orders.length > 0;
            const hasUnavail = events.unavailability.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[100px] p-2 border-t border-r border-border',
                  !isSameMonth(day, filters.month) && 'bg-muted/20',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isToday(day) && 'text-primary'
                )}>
                  {dayNumber}
                </div>
                
                <div className="space-y-1">
                  {/* Unavailability */}
                  {events.unavailability.slice(0, 2).map(u => (
                    <div
                      key={u.id}
                      className="text-xs p-1 rounded bg-destructive/10 text-destructive truncate"
                      title={`${u.cleaner_name || 'Клинер'}: ${u.reason || 'Недоступен'}`}
                    >
                      <CalendarOff className="w-3 h-3 inline mr-1" />
                      {u.cleaner_name?.split(' ')[0] || 'Клинер'}
                    </div>
                  ))}
                  
                  {/* Orders */}
                  {events.orders.slice(0, 2).map(order => (
                    <div
                      key={order.id}
                      className={cn(
                        'text-xs p-1 rounded border truncate',
                        statusColors[order.status] || 'bg-muted'
                      )}
                      title={`${order.scheduled_time} - ${order.object_name} (${order.cleaner_name})`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {order.scheduled_time}
                    </div>
                  ))}
                  
                  {/* More indicator */}
                  {(events.orders.length > 2 || events.unavailability.length > 2) && (
                    <div className="text-xs text-muted-foreground">
                      +{Math.max(0, events.orders.length - 2) + Math.max(0, events.unavailability.length - 2)} ещё
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <h4 className="font-semibold">Заказы за {format(filters.month, 'LLLL yyyy', { locale: ru })}</h4>
        
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет заказов за этот период
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div
                key={order.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg bg-card border border-border gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(new Date(order.scheduled_date), 'd MMMM', { locale: ru })}
                    </span>
                    <span className="text-muted-foreground">{order.scheduled_time}</span>
                    <Badge variant="outline" className={statusColors[order.status]}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {order.cleaner_name || 'Неизвестный клинер'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {order.object_name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
