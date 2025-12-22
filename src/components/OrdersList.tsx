import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Building2, User, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ViewReportDialog } from '@/components/ViewReportDialog';

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
        .select('id, email, name')
        .in('id', cleanerIds);

      const cleanerMap = new Map(cleanerProfiles?.map(p => [p.id, p]) || []);

      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        scheduled_date: order.scheduled_date,
        scheduled_time: order.scheduled_time,
        status: order.status,
        object_id: order.object_id,
        object: order.object || { complex_name: 'Неизвестно', apartment_number: '' },
        cleaner: cleanerMap.get(order.cleaner_id) || { email: 'Неизвестно', name: null },
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

  const filteredOrders = selectedObjectId === 'all'
    ? orders
    : orders.filter(order => order.object_id === selectedObjectId);

  return (
    <>
      <div className="mb-4">
        <Select value={selectedObjectId} onValueChange={setSelectedObjectId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Все объекты" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все объекты</SelectItem>
            {objects.map((obj) => (
              <SelectItem key={obj.id} value={obj.id}>
                {obj.complex_name} - {obj.apartment_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className={`p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors space-y-3 ${
              order.status === 'completed' ? 'cursor-pointer' : ''
            }`}
            onClick={() => handleOrderClick(order)}
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
              <div className="flex items-center gap-2">
                {order.status === 'completed' && (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge variant={statusVariants[order.status]}>
                  {statusLabels[order.status]}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{order.object.complex_name} - {order.object.apartment_number}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>
                  {order.cleaner.name || order.cleaner.email?.split('@')[0]}
                  {order.cleaner.name && (
                    <span className="ml-1">(@{order.cleaner.email?.split('@')[0]})</span>
                  )}
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

      <ViewReportDialog
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId || ''}
      />
    </>
  );
};