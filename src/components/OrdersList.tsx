import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Building2, User, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ViewReportDialog } from '@/components/ViewReportDialog';
import { OrdersFilter } from '@/components/OrdersFilter';
import { UserAvatar } from '@/components/UserAvatar';
import { DateRange } from 'react-day-picker';

interface ObjectOption {
  id: string;
  complex_name: string;
  apartment_number: string;
}

interface Order {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  object_id: string;
  object: {
    complex_name: string;
    apartment_number: string;
  };
  cleaner: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
}

interface OrdersListProps {
  refreshTrigger: number;
  onRefresh: () => void;
  disabled?: boolean;
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

export const OrdersList = ({ refreshTrigger, onRefresh, disabled }: OrdersListProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [objects, setObjects] = useState<ObjectOption[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showTodayOnly, setShowTodayOnly] = useState(true);

  useEffect(() => {
    const fetchObjects = async () => {
      const { data } = await supabase
        .from('objects')
        .select('id, complex_name, apartment_number')
        .order('complex_name');
      if (data) setObjects(data);
    };
    fetchObjects();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          cleaner_id,
          object_id,
          object:objects(complex_name, apartment_number)
        `)
        .order('scheduled_date', { ascending: true });
      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Get cleaner profiles separately
      const cleanerIds = [...new Set(ordersData.map(o => o.cleaner_id))];
      const { data: cleanerProfiles } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url')
        .in('id', cleanerIds);

      const cleanerMap = new Map(cleanerProfiles?.map(p => [p.id, p]) || []);

      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        scheduled_date: order.scheduled_date,
        scheduled_time: order.scheduled_time,
        status: order.status,
        object_id: order.object_id,
        object: order.object || { complex_name: 'Неизвестно', apartment_number: '' },
        cleaner: cleanerMap.get(order.cleaner_id) || { email: 'Неизвестно', name: null, avatar_url: null },
      }));

      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заказы',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  const handleCancel = async (id: string) => {
    if (disabled) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Заказ отменён',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отменить заказ',
        variant: 'destructive',
      });
    }
  };

  const handleOrderClick = (order: Order) => {
    if (order.status === 'completed') {
      setSelectedOrderId(order.id);
    }
  };

  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by object
    if (selectedObjectId !== 'all') {
      filtered = filtered.filter(order => order.object_id === selectedObjectId);
    }

    // Filter by date
    if (showTodayOnly) {
      filtered = filtered.filter(order => isToday(new Date(order.scheduled_date)));
    } else if (dateRange?.from) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.scheduled_date);
        if (dateRange.to) {
          return isWithinInterval(orderDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to),
          });
        }
        return isToday(orderDate) || orderDate >= startOfDay(dateRange.from!);
      });
    }

    return filtered;
  }, [orders, selectedObjectId, showTodayOnly, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <OrdersFilter
        objects={objects}
        selectedObjectId={selectedObjectId}
        onObjectChange={setSelectedObjectId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showTodayOnly={showTodayOnly}
        onShowTodayOnlyChange={setShowTodayOnly}
      />

      {filteredOrders.length === 0 ? (
        <div className="flex items-center justify-center p-8 rounded-lg bg-muted/50 border-2 border-dashed border-border">
          <div className="text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {showTodayOnly ? 'Нет заказов на сегодня' : 'Нет заказов'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors space-y-2 ${
                order.status === 'completed' ? 'cursor-pointer' : ''
              }`}
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">
                      {format(new Date(order.scheduled_date), 'd MMM yyyy', { locale: ru })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.scheduled_time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {order.status === 'completed' && (
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  )}
                  <Badge variant={statusVariants[order.status]} className="text-xs whitespace-nowrap">
                    {statusLabels[order.status]}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 min-w-0">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{order.object.complex_name} - {order.object.apartment_number}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    avatarUrl={order.cleaner.avatar_url}
                    name={order.cleaner.name}
                    email={order.cleaner.email}
                    size="sm"
                  />
                  <span className="truncate">
                    {order.cleaner.name || order.cleaner.email?.split('@')[0]}
                  </span>
                </div>
              </div>

              {!disabled && (order.status === 'pending' || order.status === 'confirmed') && (
                <div className="pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(order.id);
                    }}
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

      <ViewReportDialog
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId || ''}
      />
    </>
  );
};
