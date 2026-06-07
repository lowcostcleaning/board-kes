import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff, MapPin, Clock, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAdminCleanerCalendar, type CleanerOrder } from '@/hooks/use-admin-cleaner-calendar';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { EditOrderDialog } from '@/components/EditOrderDialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  pending_confirmation: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  confirmed: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  pending_confirmation: 'Ожидает подтверждения',
  confirmed: 'Подтверждён',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
};

export const AdminCleanerCalendarTab = () => {
  const { toast } = useToast();
  const [editingOrder, setEditingOrder] = useState<CleanerOrder | null>(null);
  const {
    orders,
    unavailability,
    cleaners,
    objects,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    fetchCalendarData,
    goToNextMonth,
    goToPrevMonth,
    goToToday,
    getEventsForDate,
  } = useAdminCleanerCalendar();

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Заказ не был отменён. Проверьте права доступа администратора.');

      toast({
        title: 'Заказ отменён',
        description: 'Уборка больше не занимает время клинера',
      });
      await fetchCalendarData();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отменить заказ',
        variant: 'destructive',
      });
    }
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(filters.month);
    const end = endOfMonth(filters.month);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

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

      <Tabs defaultValue="cleaner-calendars" className="space-y-5">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cleaner-calendars">Календари клинеров</TabsTrigger>
          <TabsTrigger value="overview">Общий календарь</TabsTrigger>
        </TabsList>

        <TabsContent value="cleaner-calendars" className="space-y-4">
          {cleaners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет видимых клинеров для отображения.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {cleaners.map((cleaner) => (
                <div
                  key={cleaner.id}
                  className="rounded-lg border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">
                        {cleaner.name || cleaner.email || 'Клинер'}
                      </h4>
                      {cleaner.email && (
                        <p className="text-xs text-muted-foreground truncate">{cleaner.email}</p>
                      )}
                    </div>
                    <Badge variant="outline">Клинер</Badge>
                  </div>
                  <OrdersCalendar userRole="cleaner" cleanerId={cleaner.id} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
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

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[100px] p-2 border-t border-r border-border bg-muted/20" />
              ))}

              {calendarDays.days.map(day => {
                const events = getEventsForDate(day);
                const dayNumber = format(day, 'd');

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
                      {events.unavailability.slice(0, 2).map(u => (
                        <div
                          key={u.id}
                          className="text-xs p-1 rounded bg-destructive/10 text-destructive border border-destructive/30 truncate"
                          title={`${u.cleaner_name || 'Клинер'}: ${u.reason || 'Недоступен'}`}
                        >
                          <CalendarOff className="w-3 h-3 inline mr-1" />
                          {u.cleaner_name?.split(' ')[0] || 'Клинер'}
                        </div>
                      ))}

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
                    {!['cancelled', 'rejected'].includes(order.status) && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOrder(order)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Перенести
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Отменить
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <EditOrderDialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
        order={editingOrder ? {
          id: editingOrder.id,
          scheduled_date: editingOrder.scheduled_date,
          scheduled_time: editingOrder.scheduled_time,
          cleaner_id: editingOrder.cleaner_id,
          user_id: editingOrder.manager_id,
          object_id: editingOrder.object_id,
          residential_complex_id: editingOrder.residential_complex_id,
        } : null}
        onSuccess={() => {
          setEditingOrder(null);
          fetchCalendarData();
        }}
        canDelete={false}
        canEditComplex={false}
      />
    </div>
  );
};
