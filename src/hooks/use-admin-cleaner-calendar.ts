import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface CleanerProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface CleanerOrder {
  id: string;
  cleaner_id: string;
  manager_id: string;
  object_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  // Joined data
  cleaner_name: string | null;
  manager_name: string | null;
  object_name: string;
  complex_name: string;
}

export interface CleanerUnavailability {
  id: string;
  cleaner_id: string;
  date: string;
  reason: string | null;
  cleaner_name: string | null;
}

export interface CalendarFilters {
  cleanerId: string | null;
  objectId: string | null;
  month: Date;
}

const defaultFilters: CalendarFilters = {
  cleanerId: null,
  objectId: null,
  month: new Date(),
};

export const useAdminCleanerCalendar = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<CleanerOrder[]>([]);
  const [unavailability, setUnavailability] = useState<CleanerUnavailability[]>([]);
  const [cleaners, setCleaners] = useState<CleanerProfile[]>([]);
  const [objects, setObjects] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    
    const startDate = format(startOfMonth(filters.month), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(filters.month), 'yyyy-MM-dd');

    // Fetch orders in date range
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date');

    if (filters.cleanerId) {
      ordersQuery = ordersQuery.eq('cleaner_id', filters.cleanerId);
    }

    if (filters.objectId) {
      ordersQuery = ordersQuery.eq('object_id', filters.objectId);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заказы',
        variant: 'destructive',
      });
    }

    // Fetch unavailability in date range
    let unavailQuery = supabase
      .from('cleaner_unavailability')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (filters.cleanerId) {
      unavailQuery = unavailQuery.eq('cleaner_id', filters.cleanerId);
    }

    const { data: unavailData, error: unavailError } = await unavailQuery;

    if (unavailError) {
      console.error('Error fetching unavailability:', unavailError);
    }

    // Fetch profiles for cleaners and managers
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, role');

    // Fetch objects
    const { data: objectsData } = await supabase
      .from('objects')
      .select('id, complex_name, apartment_number');

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const objectsMap = new Map((objectsData || []).map(o => [o.id, o]));

    // Map orders with joined data
    const mappedOrders: CleanerOrder[] = (ordersData || []).map(order => {
      const cleaner = profilesMap.get(order.cleaner_id);
      const manager = profilesMap.get(order.manager_id);
      const object = objectsMap.get(order.object_id);
      
      return {
        ...order,
        cleaner_name: cleaner?.name || null,
        manager_name: manager?.name || null,
        object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
        complex_name: object?.complex_name || '',
      };
    });

    // Map unavailability with cleaner names
    const mappedUnavail: CleanerUnavailability[] = (unavailData || []).map(u => ({
      ...u,
      cleaner_name: profilesMap.get(u.cleaner_id)?.name || null,
    }));

    setOrders(mappedOrders);
    setUnavailability(mappedUnavail);

    // Set cleaners (only cleaners and demo_cleaners)
    const cleanersList = (profilesData || [])
      .filter(p => p.role === 'cleaner' || p.role === 'demo_cleaner');
    setCleaners(cleanersList);

    // Set objects list
    const objectsList = (objectsData || []).map(o => ({
      id: o.id,
      name: `${o.complex_name}, кв. ${o.apartment_number}`,
    }));
    setObjects(objectsList);

    setIsLoading(false);
  }, [filters.month, filters.cleanerId, filters.objectId, toast]);

  // Load on mount and when filters change
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<CalendarFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Navigate months
  const goToNextMonth = useCallback(() => {
    setFilters(prev => ({ ...prev, month: addMonths(prev.month, 1) }));
  }, []);

  const goToPrevMonth = useCallback(() => {
    setFilters(prev => ({ ...prev, month: subMonths(prev.month, 1) }));
  }, []);

  const goToToday = useCallback(() => {
    setFilters(prev => ({ ...prev, month: new Date() }));
  }, []);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOrders = orders.filter(o => o.scheduled_date === dateStr);
    const dayUnavail = unavailability.filter(u => u.date === dateStr);
    return { orders: dayOrders, unavailability: dayUnavail };
  }, [orders, unavailability]);

  return {
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
  };
};