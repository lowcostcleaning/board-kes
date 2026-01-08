import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  user_id: string;
  residential_complex_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
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
  residentialComplexId: string | null;
  status: 'all' | 'active' | 'archived';
  search: string;
}

const defaultFilters: ObjectFilters = {
  managerId: null,
  residentialComplexId: null,
  status: 'active', // Default to active objects
  search: '',
};

export const useAdminObjects = () => {
  const { toast } = useToast();
  const [objects, setObjects] = useState<AdminObject[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<AdminObject[]>([]);
  const [residentialComplexes, setResidentialComplexes] = useState<ResidentialComplex[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ObjectFilters>(defaultFilters);

  // Fetch all objects with owner and residential complex info
  const fetchObjects = useCallback(async () => {
    setIsLoading(true);
    
    // Fetch objects
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

    // Fetch profiles for owners (managers)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .or('role.eq.manager,role.eq.demo_manager');

    // Fetch residential complexes
    const { data: complexesData } = await supabase
      .from('residential_complexes')
      .select('*')
      .order('name');

    const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
    const complexesMap = new Map((complexesData || []).map(c => [c.id, c]));

    // Map objects with joined data
    const mappedObjects: AdminObject[] = (objectsData || []).map(obj => {
      const owner = profilesMap.get(obj.user_id);
      const complex = obj.residential_complex_id ? complexesMap.get(obj.residential_complex_id) : null;
      
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
    
    // Set managers list
    setManagers(profilesData || []);
    
    setIsLoading(false);
  }, [toast]);

  // Apply filters
  useEffect(() => {
    let result = [...objects];

    // Filter by manager
    if (filters.managerId) {
      result = result.filter(obj => obj.user_id === filters.managerId);
    }

    // Filter by residential complex
    if (filters.residentialComplexId) {
      result = result.filter(obj => obj.residential_complex_id === filters.residentialComplexId);
    } else if (filters.residentialComplexId === 'none') {
      result = result.filter(obj => obj.residential_complex_id === null);
    }

    // Filter by status
    if (filters.status === 'active') {
      result = result.filter(obj => !obj.is_archived);
    } else if (filters.status === 'archived') {
      result = result.filter(obj => obj.is_archived);
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(obj => 
        obj.complex_name.toLowerCase().includes(search) ||
        obj.apartment_number.toLowerCase().includes(search) ||
        obj.owner_name?.toLowerCase().includes(search) ||
        obj.owner_email?.toLowerCase().includes(search)
      );
    }

    setFilteredObjects(result);
  }, [objects, filters]);

  // Load on mount
  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ObjectFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // CRUD for residential complexes
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

    setResidentialComplexes(prev => [...prev, data]);
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

    setResidentialComplexes(prev => prev.map(c => 
      c.id === id ? { ...c, name, city: city || null } : c
    ));
    return true;
  }, [toast]);

  const deleteResidentialComplex = useCallback(async (id: string): Promise<boolean> => {
    // Check if any objects are using this complex
    const linkedObjects = objects.filter(obj => obj.residential_complex_id === id);
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

    setResidentialComplexes(prev => prev.filter(c => c.id !== id));
    return true;
  }, [objects, toast]);

  // Update object's residential complex
  const updateObjectComplex = useCallback(async (objectId: string, complexId: string | null): Promise<boolean> => {
    const { error } = await supabase
      .from('objects')
      .update({ residential_complex_id: complexId })
      .eq('id', objectId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить ЖК объекта',
        variant: 'destructive',
      });
      return false;
    }

    // Refresh to get updated data
    fetchObjects();
    return true;
  }, [fetchObjects, toast]);

  // Archive/unarchive object
  const toggleObjectArchived = useCallback(async (objectId: string, archived: boolean): Promise<boolean> => {
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

    setObjects(prev => prev.map(obj => 
      obj.id === objectId ? { ...obj, is_archived: archived } : obj
    ));
    return true;
  }, [toast]);

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