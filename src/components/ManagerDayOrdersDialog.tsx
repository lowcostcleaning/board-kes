import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Building2, Home, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  scheduled_time: string;
  status: string;
  cleaner_id: string;
  objects: {
    complex_name: string;
    apartment_number: string;
    apartment_type: string | null;
  } | null;
  cleaner?: {
    name: string | null;
    email: string | null;
  };
}

interface ManagerDayOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Ожидает</Badge>;
    case 'confirmed':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Подтверждён</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Выполнен</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Отменён</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getApartmentTypeLabel = (type: string | null) => {
  switch (type) {
    case 'studio':
      return 'Студия';
    case '1+1':
      return '1+1';
    case '2+1':
      return '2+1';
    default:
      return null;
  }
};

export const ManagerDayOrdersDialog: React.FC<ManagerDayOrdersDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && selectedDate) {
      fetchOrders();
    }
  }, [open, selectedDate]);

  const fetchOrders = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          scheduled_time,
          status,
          cleaner_id,
          objects (
            complex_name,
            apartment_number,
            apartment_type
          )
        `)
        .eq('manager_id', user.id)
        .eq('scheduled_date', dateStr)
        .order('scheduled_time');

      if (error) throw error;

      // Fetch cleaner profiles
      if (data && data.length > 0) {
        const cleanerIds = [...new Set(data.map(o => o.cleaner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', cleanerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const ordersWithCleaners = data.map(order => ({
          ...order,
          cleaner: profileMap.get(order.cleaner_id) || null
        }));

        setOrders(ordersWithCleaners);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching day orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCleanerName = (order: Order) => {
    if (order.cleaner?.name) return order.cleaner.name;
    if (order.cleaner?.email) return order.cleaner.email.split('@')[0];
    return 'Клинер';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: ru })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет уборок на эту дату
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    "p-4 rounded-[14px] bg-[#f5f5f5] dark:bg-muted/40 space-y-2",
                    order.status === 'cancelled' && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">{order.scheduled_time}</span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {order.objects && (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{order.objects.complex_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="w-3.5 h-3.5" />
                        <span>
                          {order.objects.apartment_number}
                          {order.objects.apartment_type && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {getApartmentTypeLabel(order.objects.apartment_type)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{getCleanerName(order)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
