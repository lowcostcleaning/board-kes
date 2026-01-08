import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, subHours } from 'date-fns';
import { logAdminAction } from '@/utils/admin-audit';

export interface AdminNotification {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  notification_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface AdminCounters {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalObjects: number;
  activeObjects: number;
  totalCleaners: number;
  cleanersActiveToday: number;
  overdueNotifications: number; // New counter
}

export const useAdminDashboard = () => {
  const { toast } = useToast();
  const [counters, setCounters] = useState<AdminCounters>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalObjects: 0,
    activeObjects: 0,
    totalCleaners: 0,
    cleanersActiveToday: 0,
    overdueNotifications: 0,
  });
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingCounters, setIsLoadingCounters] = useState(true);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);

  const fetchCounters = useCallback(async () => {
    setIsLoadingCounters(true);
    try {
      // 1. Users
      const { count: totalUsersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: pendingUsersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_active', true);

      const { count: approvedUsersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('is_active', true);

      const { count: totalCleanersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('role.eq.cleaner,role.eq.demo_cleaner')
        .eq('is_active', true);

      // 2. Objects
      const { count: totalObjectsCount } = await supabase
        .from('objects')
        .select('id', { count: 'exact', head: true });

      const { count: activeObjectsCount } = await supabase
        .from('objects')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false);

      // 3. Cleaners active today (have confirmed/pending orders today)
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('cleaner_id')
        .eq('scheduled_date', today)
        .in('status', ['pending', 'confirmed', 'in_progress']);
      
      const activeCleanersToday = new Set(todayOrders?.map(o => o.cleaner_id) || []).size;

      // 4. Overdue Notifications (TASK 3)
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      const { count: overdueCount } = await supabase
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', twentyFourHoursAgo);

      setCounters({
        totalUsers: totalUsersCount || 0,
        pendingUsers: pendingUsersCount || 0,
        approvedUsers: approvedUsersCount || 0,
        totalObjects: totalObjectsCount || 0,
        activeObjects: activeObjectsCount || 0,
        totalCleaners: totalCleanersCount || 0,
        cleanersActiveToday: activeCleanersToday,
        overdueNotifications: overdueCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin counters:', error);
    } finally {
      setIsLoadingCounters(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } else {
      setNotifications(data as AdminNotification[]);
    }
  }, []);

  useEffect(() => {
    fetchCounters();
    fetchNotifications();
  }, [fetchCounters, fetchNotifications]);

  // Real-time subscription for notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications',
        },
        () => {
          fetchNotifications();
          fetchCounters(); // Also refresh counters when notifications change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, fetchCounters]);

  // Real-time subscription for profile/object changes to update counters
  useEffect(() => {
    const profileChannel = supabase
      .channel('admin-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    const objectChannel = supabase
      .channel('admin-object-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'objects',
        },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    const orderChannel = supabase
      .channel('admin-order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchCounters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(objectChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [fetchCounters]);

  const resolveNotification = useCallback(async (notification: AdminNotification, action: 'approved' | 'rejected', resolverId: string) => {
    setIsUpdatingNotification(true);
    try {
      // 1. Update admin_notifications status
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .update({
          status: action,
          resolved_at: new Date().toISOString(),
          resolved_by: resolverId,
        })
        .eq('id', notification.id);

      if (notifError) throw notifError;

      // 2. Update related entity (only for user_registration for now)
      if (notification.notification_type === 'user_registration' && action === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ status: 'approved' })
          .eq('id', notification.user_id);

        if (profileError) throw profileError;
      }
      
      // 3. Audit Log (TASK 1)
      await logAdminAction(resolverId, `resolve_notification_${action}`, 'notification', notification.id, {
        user_id: notification.user_id,
        user_email: notification.user_email,
        notification_type: notification.notification_type,
      });

      // 4. Refresh local state
      fetchNotifications();
      fetchCounters();

      toast({
        title: 'Уведомление обработано',
        description: `Пользователь ${notification.user_email} был ${action === 'approved' ? 'одобрен' : 'отклонен'}`,
      });
    } catch (error: any) {
      console.error('Error resolving notification:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обработать уведомление',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingNotification(false);
    }
  }, [fetchNotifications, fetchCounters, toast]);

  return {
    counters,
    isLoadingCounters,
    notifications,
    isUpdatingNotification,
    resolveNotification,
    fetchNotifications,
  };
};