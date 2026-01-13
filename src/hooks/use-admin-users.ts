import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/utils/admin-audit';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type CleanerStatsView = Tables<'cleaner_stats_view'>;

export interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string | null;
  name: string | null;
  rating: number | null;
  total_cleanings: number; // Changed from completed_orders_count
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
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);

  // Fetch all users from database
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching users:', profilesError);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
        variant: 'destructive',
      });
      setUsers([]);
      setIsLoading(false);
      return;
    }

    const profiles = profilesData || [];
    const cleanerIds = profiles.filter(p => p.role === 'cleaner' || p.role === 'demo_cleaner').map(p => p.id);

    let cleanerStats: CleanerStatsView[] = [];
    if (cleanerIds.length > 0) {
      const { data: statsData, error: statsError } = await supabase
        .from('cleaner_stats_view')
        .select('cleaner_id, total_cleanings, avg_rating, clean_jobs, clean_rate') // Fetch all fields
        .in('cleaner_id', cleanerIds);
      
      if (statsError) {
        console.error('Error fetching cleaner stats:', statsError);
      } else {
        cleanerStats = statsData || [];
      }
    }

    const statsMap = new Map(cleanerStats.map(s => [s.cleaner_id, s.total_cleanings]));

    const mappedUsers: UserProfile[] = profiles.map(profile => ({
      ...profile,
      is_active: profile.is_active ?? true,
      total_cleanings: statsMap.get(profile.id) || 0, // Get total_cleanings from stats view
    }));
    
    setUsers(mappedUsers);
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
      result = result.filter(u => u.role.startsWith('demo_'));
    } else if (filters.userType === 'real') {
      result = result.filter(u => !u.role.startsWith('demo_'));
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
    if (!user?.id) return { success: false, error: 'Admin not authenticated' };

    // 1. Check if user has assigned objects
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

    // 2. Check if user has assigned orders (as cleaner or manager)
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

    // 3. Check if cleaner has unavailability records
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

    // 4. Perform soft delete
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (updateError) {
      console.error('Error deleting user:', updateError);
      return { success: false, error: 'Ошибка при удалении пользователя' };
    }

    // 5. Audit Log
    const userProfile = users.find(u => u.id === userId);
    await logAdminAction(user.id, 'deactivate_user', 'user', userId, { 
      email: userProfile?.email, 
      old_status: userProfile?.is_active, 
      new_status: false 
    });

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: false } : u
    ));

    return { success: true };
  }, [user?.id, users, toast]);

  // Restore user (undo soft delete)
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

    // Audit Log
    const userProfile = users.find(u => u.id === userId);
    await logAdminAction(user.id, 'restore_user', 'user', userId, { 
      email: userProfile?.email, 
      old_status: userProfile?.is_active, 
      new_status: true 
    });

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, is_active: true } : u
    ));

    return { success: true };
  }, [user?.id, users, toast]);

  // Update user role
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

    // Audit Log
    await logAdminAction(user.id, 'update_role', 'user', userId, { 
      old_role: oldRole, 
      new_role: newRole 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ));
    return true;
  }, [user?.id, users, toast]);

  // Update user status
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

    // Audit Log
    await logAdminAction(user.id, `update_status_${newStatus}`, 'user', userId, { 
      old_status: oldStatus, 
      new_status: newStatus 
    });

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, status: newStatus } : u
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
  };
};