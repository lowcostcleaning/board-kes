import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Building2, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  object: {
    complex_name: string;
    apartment_number: string;
  };
  cleaner: {
    email: string;
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
        .select('id, email')
        .in('id', cleanerIds);

      const cleanerMap = new Map(cleanerProfiles?.map(p => [p.id, p]) || []);

      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        scheduled_date: order.scheduled_date,
        scheduled_time: order.scheduled_time,
        status: order.status,
        object: order.object || { complex_name: 'Неизвестно', apartment_number: '' },
        cleaner: cleanerMap.get(order.cleaner_id) || { email: 'Неизвестно' },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg bg-muted/50 border-2 border-dashed border-border">
        <div className="text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Пока нет заказов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {format(new Date(order.scheduled_date), 'd MMMM yyyy', { locale: ru })}
              </span>
              <Clock className="w-4 h-4 text-muted-foreground ml-2" />
              <span>{order.scheduled_time}</span>
            </div>
            <Badge variant={statusVariants[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{order.object.complex_name} - {order.object.apartment_number}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{order.cleaner.email?.split('@')[0]}</span>
            </div>
          </div>

          {!disabled && (order.status === 'pending' || order.status === 'confirmed') && (
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleCancel(order.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Отменить
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
