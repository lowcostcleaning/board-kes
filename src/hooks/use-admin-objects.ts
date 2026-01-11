import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/utils/admin-audit';
import { useAuth } from '@/contexts/AuthContext';
import { isFuture, format } from 'date-fns';

export interface AdminObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  user_id: string;
  residential_complex_id: string | null; // Corrected to residential_complex_id
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_email: string | null;
  residential_complex_name: string | null;
  residential_complex_city: string | null;
}

export interface ResidentialComplex {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
}

export interface ObjectFilters {
  managerId: string | null;
  complexId: string | null | 'none';
  status: 'all' | 'active' | 'archived';
  search: string;
  withoutComplex: boolean;
}

const defaultFilters: ObjectFilters = {
  managerId: null,
  complexId: null,
  status: 'active',
  search: '',
  withoutComplex: false,
};

export const useAdminObjects = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [objects, setObjects] = useState<AdminObject[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<AdminObject[]>([]);
  const [residentialComplexes, setResidentialComplexes] = useState<ResidentialComplex[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ObjectFilters>(defaultFilters);

  const fetchObjects = useCallback(async () => {
    setIsLoading(true);

    const { data: objectsData, error: objectsError } = await supabase
      .from('objects')
      .select('*')
      .order('created_at', { ascending: false });

    if (objectsError) {
      console.error('Error fetching objects:', objectsError);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список объектов',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .or('role.eq.manager,role.eq.demo_manager');

    const { data: complexesData } = await supabase
      .from('residential_complexes')
      .select('*')
      .order('name');

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));
    const complexesMap = new Map((complexesData || []).map((c) => [c.id, c]));

    const mappedObjects: AdminObject[] = (objectsData || []).map((obj) => {
      const owner = profilesMap.get(obj.user_id);
      const complex = obj.residential_complex_id ? complexesMap.get(obj.residential_complex_id) : null; // Corrected to residential_complex_id

      return {
        ...obj,
        is_archived: obj.is_archived ?? false,
        owner_name: owner?.name || null,
        owner_email: owner?.email || null,
        residential_complex_name: complex?.name || null,
        residential_complex_city: complex?.city || null,
      };
    });

    setObjects(mappedObjects);
    setResidentialComplexes(complexesData || []);
    setManagers(profilesData || []);
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    let result = [...objects];

    if (filters.managerId) {
      result = result.filter((obj) => obj.user_id === filters.managerId);
    }

    if (filters.complexId === 'none') {
      result = result.filter((obj) => obj.residential_complex_id === null); // Corrected to residential_complex_id
    } else if (filters.complexId && filters.complexId !== 'none') {
      result = result.filter((obj) => obj.residential_complex_id === filters.complexId); // Corrected to residential_complex_id
    }

    if (filters.status === 'active') {
      result = result.filter((obj) => !obj.is_archived);
    } else if (filters.status === 'archived') {
      result = result.filter((obj) => obj.is_archived);
    }

    if (filters.withoutComplex) {
      result = result.filter((obj) => !obj.residential_complex_id); // Corrected to residential_complex_id
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter((obj) =>
        obj.complex_name.toLowerCase().includes(search) ||
        obj.apartment_number.toLowerCase().includes(search) ||
        obj.owner_name?.toLowerCase().includes(search) ||
        obj.owner_email?.toLowerCase().includes(search)
      );
    }

    setFilteredObjects(result);
  }, [objects, filters]);

  const updateFilters = useCallback((newFilters: Partial<ObjectFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const createResidentialComplex = useCallback(async (name: string, city?: string): Promise<ResidentialComplex | null> => {
    const { data, error } = await supabase
      .from('residential_complexes')
      .insert({ name, city: city || null })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать ЖК',
        variant: 'destructive',
      });
      return null;
    }

    setResidentialComplexes((prev) => [...prev, data]);
    return data;
  }, [toast]);

  const updateResidentialComplex = useCallback(async (id: string, name: string, city?: string): Promise<boolean> => {
    const { error } = await supabase
      .from('residential_complexes')
      .update({ name, city: city || null })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить ЖК',
        variant: 'destructive',
      });
      return false;
    }

    setResidentialComplexes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name, city: city || null } : c))
    );
    return true;
  }, [toast]);

  const deleteResidentialComplex = useCallback(async (id: string): Promise<boolean> => {
    const linkedObjects = objects.filter((obj) => obj.residential_complex_id === id); // Corrected to residential_complex_id
    if (linkedObjects.length > 0) {
      toast({
        title: 'Ошибка',
        description: `Невозможно удалить: ${linkedObjects.length} объект(ов) привязано к этому ЖК`,
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('residential_complexes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить ЖК',
        variant: 'destructive',
      });
      return false;
    }

    setResidentialComplexes((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, [objects, toast]);

  const updateObjectComplex = useCallback(async (objectId: string, residentialComplexId: string | null): Promise<boolean> => { // Corrected to residentialComplexId
    const { error } = await supabase
      .from('objects')
      .update({ residential_complex_id: residentialComplexId }) // Corrected to residential_complex_id
      .eq('id', objectId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить ЖК объекта',
        variant: 'destructive',
      });
      return false;
    }

    fetchObjects();
    return true;
  }, [fetchObjects, toast]);

  const toggleObjectArchived = useCallback(async (objectId: string, archived: boolean): Promise<boolean> => {
    if (!user?.id) return false;

    const objectToUpdate = objects.find((o) => o.id === objectId);
    if (!objectToUpdate) return false;

    if (archived) {
      const { count: futureOrdersCount, error: ordersError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('object_id', objectId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'));

      if (ordersError) {
        console.error('Error checking future orders:', ordersError);
        toast({
          title: 'Ошибка',
          description: 'Ошибка проверки будущих заказов',
          variant: 'destructive',
        });
        return false;
      }

      if ((futureOrdersCount || 0) > 0) {
        toast({
          title: 'Невозможно архивировать',
          description: `У объекта есть ${futureOrdersCount} активных будущих заказа(ов). Отмените их сначала.`,
          variant: 'destructive',
        });
        return false;
      }
    }

    const { error } = await supabase
      .from('objects')
      .update({ is_archived: archived })
      .eq('id', objectId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус объекта',
        variant: 'destructive',
      });
      return false;
    }

    await logAdminAction(user.id, archived ? 'archive_object' : 'restore_object', 'object', objectId, {
      complex_name: objectToUpdate.complex_name,
      apartment_number: objectToUpdate.apartment_number,
      new_status: archived ? 'archived' : 'active'
    });

    setObjects((prev) =>
      prev.map((obj) => (obj.id === objectId ? { ...obj, is_archived: archived } : obj))
    );
    return true;
  }, [user?.id, objects, toast]);

  return {
    objects: filteredObjects,
    allObjects: objects,
    residentialComplexes,
    managers,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    fetchObjects,
    createResidentialComplex,
    updateResidentialComplex,
    deleteResidentialComplex,
    updateObjectComplex,
    toggleObjectArchived,
  };
};