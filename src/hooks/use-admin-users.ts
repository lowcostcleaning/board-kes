import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string | null;
  name: string | null;
  rating: number | null;
  completed_orders_count: number;
  avatar_url: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
  is_active: boolean;
}

export interface UserFilters {
  role: string | null;
  status: string | null;
  userType: 'all' | 'demo' | 'real';
  showInactive: boolean;
}

const defaultFilters: UserFilters = {
  role: null,
  status: null,
  userType: 'all',
  showInactive: false,
};

export const useAdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);

  // Fetch all users from database
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
        variant: 'destructive',
      });
      setUsers([]);
    } else {
      // Map database response to include is_active with default true for backwards compatibility
      const mappedUsers = (data || []).map(user => ({
        ...user,
        is_active: user.is_active ?? true,
      }));
      setUsers(mappedUsers);
    }
    setIsLoading(false);
  }, [toast]);

  // Apply filters to users
  useEffect(() => {
    let result = [...users];

    // Filter by is_active (soft delete)
    if (!filters.showInactive) {
      result = result.filter(u => u.is_active);
    }

    // Filter by role
    if (filters.role) {
      result = result.filter(u => u.role === filters.role);
    }

    // Filter by status
    if (filters.status) {
      result = result.filter(u => u.status === filters.status);
    }

    // Filter by user type (demo/real)
    if (filters.userType === 'demo') {
      result = result.filter(u => u.role === 'demo_manager' || u.role === 'demo_cleaner');
    } else if (filters.userType === 'real') {
      result = result.filter(u => u.role !== 'demo_manager' && u.role !== 'demo_cleaner');
    }

    setFilteredUsers(result);
  }, [users, filters]);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Soft delete user
  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    // Check if user has assigned objects
    const { data: objectsData, error: objectsError } = await supabase
      .from('objects')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (objectsError) {
      console.error('Error checking objects:', objectsError);
      return { success: false, error: 'Ошибка проверки объектов пользователя' };
    }

    if (objectsData && objectsData.length > 0) {
      return { 
        success: false, 
        error: 'Невозможно удалить пользователя: у него есть привязанные объекты' 
      };
    }

    // Check if user has assigned orders (as cleaner or manager)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .or(`cleaner_id.eq.${userId},manager_id.eq.${userId}`)
      .limit(1);

    if (ordersError) {
      console.error('Error checking orders:', ordersError);
      return { success: false, error: 'Ошибка проверки заказов пользователя' };
    }

    if (ordersData && ordersData.length > 0) {
      return { 
        success: false, 
        error: 'Невозможно удалить пользователя: у него есть привязанные заказы' 
      };
    }

    // Check if cleaner has unavailability records
    const { data: unavailData, error: unavailError } = await supabase
      .from('cleaner_unavailability')
      .select('id')
      .eq('cleaner_id', userId)
      .limit(1);

    if (unavailError) {
      console.error('Error checking unavailability:', unavailError);
      return { success: false, error: 'Ошибка проверки календаря пользователя' };
    }

    if (unavailData && unavailData.length > 0) {
      return { 
        success: false, 
        error: 'Невозможно удалить пользователя: у него есть записи в календаре' 
      };
    }

    // Perform soft delete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (updateError) {
      console.error('Error deleting user:', updateError);
      return { success: false, error: 'Ошибка при удалении пользователя' };
    }

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: false } : u
    ));

    return { success: true };
  }, []);

  // Restore user (undo soft delete)
  const restoreUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId);

    if (updateError) {
      console.error('Error restoring user:', updateError);
      return { success: false, error: 'Ошибка при восстановлении пользователя' };
    }

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: true } : u
    ));

    return { success: true };
  }, []);

  // Update user role
  const updateRole = useCallback(async (userId: string, newRole: string): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
      return false;
    }

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ));
    return true;
  }, [toast]);

  // Update user status
  const updateStatus = useCallback(async (userId: string, newStatus: string): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
      return false;
    }

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, status: newStatus } : u
    ));
    return true;
  }, [toast]);

  // Update completed orders count
  const updateOrdersCount = useCallback(async (userId: string, count: number): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update({ completed_orders_count: count })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить количество уборок',
        variant: 'destructive',
      });
      return false;
    }

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, completed_orders_count: count } : u
    ));
    return true;
  }, [toast]);

  return {
    users: filteredUsers,
    allUsers: users,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    fetchUsers,
    deleteUser,
    restoreUser,
    updateRole,
    updateStatus,
    updateOrdersCount,
  };
};
