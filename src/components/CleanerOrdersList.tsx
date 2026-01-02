import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Building2, Home, Check, X, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CompletionReportDialog } from './CompletionReportDialog';
import { ViewReportDialog } from './ViewReportDialog';
import { OrdersFilter } from './OrdersFilter';
import { UserAvatar } from './UserAvatar';
import { EditOrderDialog } from './EditOrderDialog';
import { DateRange } from 'react-day-picker';

interface CleanerOrder {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  object_id: string;
  cleaner_id: string;
  manager_id: string;
  object: {
    complex_name: string;
    apartment_number: string;
  };
  manager: {
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
}

interface ObjectOption {
  id: string;
  complex_name: string;
  apartment_number: string;
}

interface CleanerOrdersListProps {
  refreshTrigger: number;
  onRefresh: () => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает подтверждения',
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

export const CleanerOrdersList = ({ refreshTrigger, onRefresh }: CleanerOrdersListProps) => {
  const [orders, setOrders] = useState<CleanerOrder[]>([]);
  const [objects, setObjects] = useState<ObjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [viewingReportOrderId, setViewingReportOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<CleanerOrder | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showTodayOnly, setShowTodayOnly] = useState(true);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          manager_id,
          cleaner_id,
          object_id,
          object:objects(complex_name, apartment_number)
        `)
        .eq('cleaner_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Extract unique objects for filter
      const uniqueObjects = new Map<string, ObjectOption>();
      ordersData.forEach((order: any) => {
        if (order.object && !uniqueObjects.has(order.object_id)) {
          uniqueObjects.set(order.object_id, {
            id: order.object_id,
            complex_name: order.object.complex_name,
            apartment_number: order.object.apartment_number,
          });
        }
      });
      setObjects(Array.from(uniqueObjects.values()));

      // Get manager profiles separately
      const managerIds = [...new Set(ordersData.map(o => o.manager_id))];
      const { data: managerProfiles } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url')
        .in('id', managerIds);

      const managerMap = new Map(managerProfiles?.map(p => [p.id, p]) || []);

      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        scheduled_date: order.scheduled_date,
        scheduled_time: order.scheduled_time,
        status: order.status,
        object_id: order.object_id,
        cleaner_id: order.cleaner_id,
        manager_id: order.manager_id,
        object: order.object || { complex_name: 'Неизвестно', apartment_number: '' },
        manager: managerMap.get(order.manager_id) || { email: 'Неизвестно', name: null, avatar_url: null },
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

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by object
    if (selectedObjectId !== 'all') {
      filtered = filtered.filter(order => order.object_id === selectedObjectId);
    }

    // Filter by date - always show pending orders regardless of date filter
    if (showTodayOnly) {
      filtered = filtered.filter(order => 
        order.status === 'pending' || isToday(new Date(order.scheduled_date))
      );
    } else if (dateRange?.from) {
      filtered = filtered.filter(order => {
        // Always show pending orders
        if (order.status === 'pending') return true;
        
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

  const handleConfirm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Заказ подтверждён',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подтвердить заказ',
        variant: 'destructive',
      });
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Заказ отклонён',
        description: 'Заказ был отклонён',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отклонить заказ',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = (id: string) => {
    setCompletingOrderId(id);
  };

  const handleCompleteSuccess = () => {
    setCompletingOrderId(null);
    onRefresh();
  };

  const handleViewReport = (id: string) => {
    setViewingReportOrderId(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {showTodayOnly ? 'Нет заказов на сегодня' : 'Нет заказов'}
            </span>
          </div>
        </div>
      ) : (
        filteredOrders.map((order) => (
          <div
            key={order.id}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium">
                  {format(new Date(order.scheduled_date), 'd MMMM yyyy', { locale: ru })}
                </span>
                <Clock className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                <span>{order.scheduled_time}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Edit button - only for orders created by cleaner (manager_id === cleaner_id) */}
                {order.manager_id === order.cleaner_id && order.status !== 'completed' && order.status !== 'cancelled' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setEditingOrder(order)}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                {order.status === 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleViewReport(order.id)}
                  >
                    <FileText className="w-4 h-4 text-primary" />
                  </Button>
                )}
                <Badge variant={statusVariants[order.status]}>
                  {statusLabels[order.status]}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{order.object.complex_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Home className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span>{order.object.apartment_number}</span>
              </div>
            </div>

            {/* Manager info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserAvatar
                avatarUrl={order.manager.avatar_url}
                name={order.manager.name}
                email={order.manager.email}
                size="sm"
              />
              <span>Менеджер: {order.manager.name || order.manager.email?.split('@')[0]}</span>
            </div>

            {order.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleConfirm(order.id)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Подтвердить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDecline(order.id)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Отклонить
                </Button>
              </div>
            )}

            {order.status === 'confirmed' && (
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleComplete(order.id)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Выполнено
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDecline(order.id)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Отменить
                </Button>
              </div>
            )}
          </div>
        ))
      )}

      <CompletionReportDialog
        isOpen={!!completingOrderId}
        onClose={() => setCompletingOrderId(null)}
        orderId={completingOrderId || ''}
        onComplete={handleCompleteSuccess}
      />

      <ViewReportDialog
        isOpen={!!viewingReportOrderId}
        onClose={() => setViewingReportOrderId(null)}
        orderId={viewingReportOrderId || ''}
      />

      <EditOrderDialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
        order={editingOrder}
        onSuccess={onRefresh}
        canDelete={editingOrder?.manager_id === editingOrder?.cleaner_id}
      />
    </div>
  );
};
