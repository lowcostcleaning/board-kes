import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ViewReportDialog } from './ViewReportDialog';

interface ReportRow {
  id: string;
  order_id: string;
  description: string | null;
  created_at: string;
}

interface JoinedReport {
  id: string;
  order_id: string;
  description: string | null;
  created_at: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  object_name?: string | null;
  cleaner_name?: string | null;
  manager_name?: string | null;
}

const AdminReportsTab: React.FC = () => {
  const { toast: appToast } = toast ? toast() : { toast: undefined }; // keep TS happy if useToast signature differs
  const [reports, setReports] = useState<JoinedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('completion_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      const reportsList: ReportRow[] = reportsData || [];

      // Fetch related orders, objects, profiles in bulk
      const orderIds = Array.from(new Set(reportsList.map(r => r.order_id))).filter(Boolean);

      let ordersMap = new Map<string, any>();
      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, scheduled_date, scheduled_time, object_id, cleaner_id, manager_id')
          .in('id', orderIds);

        (ordersData || []).forEach((o) => ordersMap.set(o.id, o));
      }

      // Collect object ids and profile ids
      const objectIds = Array.from(new Set((Array.from(ordersMap.values()).map((o: any) => o.object_id)).filter(Boolean)));
      const profileIds = Array.from(new Set((Array.from(ordersMap.values()).flatMap((o: any) => [o.cleaner_id, o.manager_id])).filter(Boolean)));

      let objectsMap = new Map<string, any>();
      if (objectIds.length > 0) {
        const { data: objectsData } = await supabase
          .from('objects')
          .select('id, complex_name, apartment_number')
          .in('id', objectIds);

        (objectsData || []).forEach((o) => objectsMap.set(o.id, o));
      }

      let profilesMap = new Map<string, any>();
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', profileIds);

        (profilesData || []).forEach((p) => profilesMap.set(p.id, p));
      }

      const joined: JoinedReport[] = reportsList.map((r) => {
        const order = ordersMap.get(r.order_id);
        const object = order ? objectsMap.get(order.object_id) : null;
        const cleaner = order ? profilesMap.get(order.cleaner_id) : null;
        const manager = order ? profilesMap.get(order.manager_id) : null;

        return {
          id: r.id,
          order_id: r.order_id,
          description: r.description,
          created_at: r.created_at,
          scheduled_date: order?.scheduled_date || null,
          scheduled_time: order?.scheduled_time || null,
          object_name: object ? `${object.complex_name}, кв. ${object.apartment_number}` : null,
          cleaner_name: cleaner?.name || cleaner?.email || null,
          manager_name: manager?.name || manager?.email || null,
        };
      });

      setReports(joined);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      if (appToast) {
        appToast({
          title: 'Ошибка',
          description: err.message || 'Не удалось загрузить отчёты',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Отчёты о выполнении ({reports.length})
        </h3>
        <div>
          <Button size="sm" variant="outline" onClick={fetchReports} disabled={loading}>
            Обновить
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Загрузка…</div>
      ) : reports.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Нет отчётов</div>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {r.object_name || 'Объект не найден'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.scheduled_date ? `${format(new Date(r.scheduled_date), 'd MMM yyyy', { locale: ru })} — ${r.scheduled_time}` : 'Дата не указана'}
                        {r.cleaner_name ? ` · Клинер: ${r.cleaner_name}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setViewOrderId(r.order_id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Просмотреть отчёт
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {r.description || 'Без описания'}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Создан: {format(new Date(r.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ViewReportDialog
        isOpen={!!viewOrderId}
        onClose={() => setViewOrderId(null)}
        orderId={viewOrderId || ''}
      />
    </div>
  );
};

export default AdminReportsTab;