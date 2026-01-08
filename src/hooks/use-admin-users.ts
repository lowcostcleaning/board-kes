import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/utils/admin-audit';
import { useAuth } from '@/contexts/AuthContext';

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
  search: string;
}

const defaultFilters: UserFilters = {
  role: null,
  status: null,
  userType: 'all',
  showInactive: false,
  search: '',
};

export const useAdminUsers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);

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
      const mappedUsers = (data || []).map(user => ({
        ...user,
        is_active: user.is_active ?? true,
      }));
      setUsers(mappedUsers);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    let result = [...users];

    if (!filters.showInactive) {
      result = result.filter(u => u.is_active);
    }

    if (filters.role) {
      result = result.filter(u => u.role === filters.role);
    }

    if (filters.status) {
      result = result.filter(u => u.status === filters.status);
    }

    if (filters.userType === 'demo') {
      result = result.filter(u => u.role.startsWith('demo_'));
    } else if (filters.userType === 'real') {
      result = result.filter(u => !u.role.startsWith('demo_'));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(u => 
        u.email?.toLowerCase().includes(search) ||
        u.name?.toLowerCase().includes(search)
      );
    }

    setFilteredUsers(result);
  }, [users, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateFilters = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Admin not authenticated' };

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

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (updateError) {
      console.error('Error deleting user:', updateError);
      return { success: false, error: 'Ошибка при удалении пользователя' };
    }

    const userProfile = users.find(u => u.id === userId);
    await logAdminAction(user.id, 'deactivate_user', 'user', userId, { 
      email: userProfile?.email, 
      old_status: userProfile?.is_active, 
      new_status: false 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: false } : u
    ));

    return { success: true };
  }, [user?.id, users, toast]);

  const restoreUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Admin not authenticated' };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId);

    if (updateError) {
      console.error('Error restoring user:', updateError);
      return { success: false, error: 'Ошибка при восстановлении пользователя' };
    }

    const userProfile = users.find(u => u.id === userId);
    await logAdminAction(user.id, 'restore_user', 'user', userId, { 
      email: userProfile?.email, 
      old_status: userProfile?.is_active, 
      new_status: true 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: true } : u
    ));

    return { success: true };
  }, [user?.id, users, toast]);

  const updateRole = useCallback(async (userId: string, newRole: string): Promise<boolean> => {
    if (!user?.id) return false;

    const oldRole = users.find(u => u.id === userId)?.role;

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

    await logAdminAction(user.id, 'update_role', 'user', userId, { 
      old_role: oldRole, 
      new_role: newRole 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ));
    return true;
  }, [user?.id, users, toast]);

  const updateStatus = useCallback(async (userId: string, newStatus: string): Promise<boolean> => {
    if (!user?.id) return false;

    const oldStatus = users.find(u => u.id === userId)?.status;

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

    await logAdminAction(user.id, `update_status_${newStatus}`, 'user', userId, { 
      old_status: oldStatus, 
      new_status: newStatus 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, status: newStatus } : u
    ));
    return true;
  }, [user?.id, users, toast]);

  const updateOrdersCount = useCallback(async (userId: string, count: number): Promise<boolean> => {
    if (!user?.id) return false;

    const oldCount = users.find(u => u.id === userId)?.completed_orders_count;

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

    await logAdminAction(user.id, 'update_orders_count', 'user', userId, { 
      old_count: oldCount, 
      new_count: count 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, completed_orders_count: count } : u
    ));
    return true;
  }, [user?.id, users, toast]);

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