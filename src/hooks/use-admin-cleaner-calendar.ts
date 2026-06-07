import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface CleanerProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  is_active?: boolean;
  visible_to_managers?: boolean;
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

    // Fetch profiles first so hidden cleaners can be excluded from every calendar view.
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, role, is_active, visible_to_managers');

    const cleanersList = (profilesData || [])
      .filter(p =>
        (p.role === 'cleaner' || p.role === 'demo_cleaner') &&
        p.is_active !== false &&
        p.visible_to_managers
      );
    const visibleCleanerIds = cleanersList.map(cleaner => cleaner.id);

    // Fetch objects
    const { data: objectsData } = await supabase
      .from('objects')
      .select('id, complex_name, apartment_number');

    let ordersData: any[] = [];
    let unavailData: any[] = [];

    if (visibleCleanerIds.length > 0) {
      // Fetch orders in date range only for cleaners visible to managers/admins.
      let ordersQuery = supabase
      .from('orders')
      .select(`
        *,
        object:objects(
          complex_name,
          apartment_number,
          residential_complex:residential_complexes!objects_residential_complex_id_fkey(
            name
          )
        )
      `)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .in('cleaner_id', visibleCleanerIds)
      .order('scheduled_date');

      if (filters.cleanerId) {
        ordersQuery = ordersQuery.eq('cleaner_id', filters.cleanerId);
      }

      if (filters.objectId) {
        ordersQuery = ordersQuery.eq('object_id', filters.objectId);
      }

      const { data: fetchedOrders, error: ordersError } = await ordersQuery;
      ordersData = fetchedOrders || [];

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить заказы',
          variant: 'destructive',
        });
      }

      // Fetch unavailability in date range only for cleaners visible to managers/admins.
      let unavailQuery = supabase
        .from('cleaner_unavailability')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .in('cleaner_id', visibleCleanerIds)
        .order('date');

      if (filters.cleanerId) {
        unavailQuery = unavailQuery.eq('cleaner_id', filters.cleanerId);
      }

      const { data: fetchedUnavail, error: unavailError } = await unavailQuery;
      unavailData = fetchedUnavail || [];

      if (unavailError) {
        console.error('Error fetching unavailability:', unavailError);
      }
    }

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const objectsMap = new Map((objectsData || []).map(o => [o.id, o]));

    // Map orders with joined data
    const mappedOrders: CleanerOrder[] = (ordersData || []).map((order: any) => {
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

    // Set cleaners (only active cleaners and demo_cleaners visible to managers/admins)
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
