import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isAfter, addHours, differenceInHours } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type OrderRow = Tables<'orders'>;

export interface ProblematicOrder extends OrderRow {
  manager_name: string | null;
  manager_email: string | null;
  cleaner_name: string | null;
  cleaner_email: string | null;
  object_name: string;
  risk_type: 'no_cleaner_assigned' | 'unconfirmed_order' | 'no_report' | 'report_no_photos' | 'delayed_order';
  risk_description: string;
  risk_severity: 'high' | 'medium' | 'low';
  hours_overdue: number | null;
  assignment_history: Array<{
    id: string;
    cleaner_id: string | null;
    assigned_at: string;
    assigned_by: string | null;
    assigned_by_name: string | null;
    action_type: 'assigned' | 'unassigned' | 'reassigned';
  }>;
  schedule_history: Array<{
    id: string;
    old_date: string | null;
    old_time: string | null;
    new_date: string;
    new_time: string;
    changed_at: string;
    changed_by: string | null;
    changed_by_name: string | null;
    reason: string | null;
  }>;
  report_history: {
    report_id: string;
    submitted_at: string;
    description: string | null;
    has_photos: boolean;
    has_videos: boolean;
    files_count: number;
  } | null;
}

interface RiskCounters {
  total: number;
  noCleaner: number;
  unconfirmed: number;
  noReport: number;
  noPhotos: number;
  delayed: number;
}

export const useAdminRiskDetection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [problematicOrders, setProblematicOrders] = useState<ProblematicOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [counters, setCounters] = useState<RiskCounters>({
    total: 0,
    noCleaner: 0,
    unconfirmed: 0,
    noReport: 0,
    noPhotos: 0,
    delayed: 0,
  });

  const fetchProblematicOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, role');

      const { data: objectsData } = await supabase
        .from('objects')
        .select('id, complex_name, apartment_number');

      const { data: reportsData } = await supabase
        .from('completion_reports')
        .select('*');

      const { data: reportFilesData } = await supabase
        .from('report_files')
        .select('*');

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const objectsMap = new Map((objectsData || []).map(o => [o.id, o]));
      const reportsMap = new Map((reportsData || []).map(r => [r.order_id, r]));
      const reportFilesMap = new Map<string, typeof reportFilesData>();
      (reportFilesData || []).forEach(f => {
        const files = reportFilesMap.get(f.report_id) || [];
        files.push(f);
        reportFilesMap.set(f.report_id, files);
      });

      const problems: ProblematicOrder[] = [];
      const now = new Date();

      for (const order of (ordersData || [])) {
        const manager = profilesMap.get(order.manager_id);
        const cleaner = order.cleaner_id ? profilesMap.get(order.cleaner_id) : null;
        const object = objectsMap.get(order.object_id);
        const report = reportsMap.get(order.id);
        const reportFiles = report ? reportFilesMap.get(report.id) || [] : [];

        const scheduledDateTime = new Date(`${order.scheduled_date}T${order.scheduled_time}`);
        const hoursOverdue = differenceInHours(now, scheduledDateTime);

        // Risk 1: No cleaner assigned
        if (!order.cleaner_id) {
          problems.push({
            ...order,
            manager_name: manager?.name || null,
            manager_email: manager?.email || null,
            cleaner_name: null,
            cleaner_email: null,
            object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
            risk_type: 'no_cleaner_assigned',
            risk_description: 'Уборка создана без назначенного клинера',
            risk_severity: 'high',
            hours_overdue: null,
            assignment_history: [],
            schedule_history: [],
            report_history: null,
          });
          continue;
        }

        // Risk 2: Unconfirmed order (pending for too long)
        if (order.status === 'pending' && hoursOverdue > 24) {
          problems.push({
            ...order,
            manager_name: manager?.name || null,
            manager_email: manager?.email || null,
            cleaner_name: cleaner?.name || null,
            cleaner_email: cleaner?.email || null,
            object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
            risk_type: 'unconfirmed_order',
            risk_description: `Заказ ожидает подтверждения ${hoursOverdue} часов`,
            risk_severity: 'high',
            hours_overdue: hoursOverdue,
            assignment_history: [],
            schedule_history: [],
            report_history: null,
          });
          continue;
        }

        // Risk 3: Completed but no report (NOT EXISTS logic)
        // An order has NO report ONLY IF NOT EXISTS a row in completion_reports
        if (order.status === 'completed' && !report) {
          problems.push({
            ...order,
            manager_name: manager?.name || null,
            manager_email: manager?.email || null,
            cleaner_name: cleaner?.name || null,
            cleaner_email: cleaner?.email || null,
            object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
            risk_type: 'no_report',
            risk_description: 'Уборка выполнена без отчёта',
            risk_severity: 'medium',
            hours_overdue: null,
            assignment_history: [],
            schedule_history: [],
            report_history: null,
          });
          continue;
        }

        // Risk 4: Report exists but has no photos
        if (report && reportFiles.length === 0) {
          problems.push({
            ...order,
            manager_name: manager?.name || null,
            manager_email: manager?.email || null,
            cleaner_name: cleaner?.name || null,
            cleaner_email: cleaner?.email || null,
            object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
            risk_type: 'report_no_photos',
            risk_description: 'Отчёт без фотографий',
            risk_severity: 'low',
            hours_overdue: null,
            assignment_history: [],
            schedule_history: [],
            report_history: {
              report_id: report.id,
              submitted_at: report.created_at,
              description: report.description,
              has_photos: false,
              has_videos: false,
              files_count: 0,
            },
          });
          continue;
        }

        // Risk 5: Delayed order (confirmed but not completed after scheduled time + 4 hours)
        if (order.status === 'confirmed' && isAfter(now, addHours(scheduledDateTime, 4))) {
          problems.push({
            ...order,
            manager_name: manager?.name || null,
            manager_email: manager?.email || null,
            cleaner_name: cleaner?.name || null,
            cleaner_email: cleaner?.email || null,
            object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : 'Неизвестный объект',
            risk_type: 'delayed_order',
            risk_description: `Заказ просрочен на ${hoursOverdue} часов`,
            risk_severity: 'high',
            hours_overdue: hoursOverdue,
            assignment_history: [],
            schedule_history: [],
            report_history: null,
          });
        }
      }

      setProblematicOrders(problems);
      setCounters({
        total: problems.length,
        noCleaner: problems.filter(p => p.risk_type === 'no_cleaner_assigned').length,
        unconfirmed: problems.filter(p => p.risk_type === 'unconfirmed_order').length,
        noReport: problems.filter(p => p.risk_type === 'no_report').length,
        noPhotos: problems.filter(p => p.risk_type === 'report_no_photos').length,
        delayed: problems.filter(p => p.risk_type === 'delayed_order').length,
      });

    } catch (error) {
      console.error('Error fetching problematic orders:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список проблемных заказов',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchAccountabilityTrail = useCallback(async (orderId: string) => {
    try {
      const { data: auditLogs } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('entity_id', orderId)
        .eq('entity_type', 'order')
        .order('created_at', { ascending: true });

      const assignment_history: ProblematicOrder['assignment_history'] = [];
      const schedule_history: ProblematicOrder['schedule_history'] = [];

      (auditLogs || []).forEach(log => {
        const metadata = log.metadata as Record<string, any>;

        if (log.action_type.includes('assign') || log.action_type.includes('cleaner')) {
          assignment_history.push({
            id: log.id,
            cleaner_id: metadata?.cleaner_id || null,
            assigned_at: log.created_at,
            assigned_by: log.admin_id,
            assigned_by_name: null,
            action_type: log.action_type.includes('unassign') ? 'unassigned' : 'assigned',
          });
        }

        if (log.action_type.includes('schedule') || log.action_type.includes('date') || log.action_type.includes('time')) {
          schedule_history.push({
            id: log.id,
            old_date: metadata?.old_date || null,
            old_time: metadata?.old_time || null,
            new_date: metadata?.new_date || '',
            new_time: metadata?.new_time || '',
            changed_at: log.created_at,
            changed_by: log.admin_id,
            changed_by_name: null,
            reason: metadata?.reason || null,
          });
        }
      });

      const { data: report } = await supabase
        .from('completion_reports')
        .select('*')
        .eq('order_id', orderId)
        .single();

      let report_history: ProblematicOrder['report_history'] = null;
      if (report) {
        const { data: files } = await supabase
          .from('report_files')
          .select('*')
          .eq('report_id', report.id);

        report_history = {
          report_id: report.id,
          submitted_at: report.created_at,
          description: report.description,
          has_photos: files?.some(f => f.file_type === 'image') || false,
          has_videos: files?.some(f => f.file_type === 'video') || false,
          files_count: files?.length || 0,
        };
      }

      return { assignment_history, schedule_history, report_history };
    } catch (error) {
      console.error('Error fetching accountability trail:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchProblematicOrders();
  }, [fetchProblematicOrders]);

  useEffect(() => {
    const interval = setInterval(fetchProblematicOrders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProblematicOrders]);

  return {
    problematicOrders,
    isLoading,
    counters,
    fetchProblematicOrders,
    fetchAccountabilityTrail,
  };
};