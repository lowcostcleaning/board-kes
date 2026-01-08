import { useMemo } from 'react';
import { format, differenceInHours, subHours } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, User, MapPin, FileText, Eye, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminRiskDetection } from '@/hooks/use-admin-risk-detection';
import { cn } from '@/lib/utils';
import { ViewReportDialog } from '@/components/ViewReportDialog';
import { ViewUserProfileDialog } from '@/components/ViewUserProfileDialog';
import { useState } from 'react';

const riskTypeConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  no_cleaner_assigned: { icon: AlertTriangle, color: 'text-red-500', label: 'Нет клинера' },
  no_report: { icon: FileText, color: 'text-amber-500', label: 'Нет отчёта' },
  report_no_photos: { icon: FileText, color: 'text-orange-500', label: 'Отчёт без фото' },
  unconfirmed_order: { icon: Clock, color: 'text-amber-500', label: 'Не подтверждён' },
  delayed_order: { icon: AlertCircle, color: 'text-red-500', label: 'Просрочен' },
};

const severityConfig: Record<string, { bg: string; border: string; text: string }> = {
  high: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400' },
  low: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400' },
};

export const RiskControlTab = () => {
  const { problematicOrders, isLoading, counters, fetchAccountabilityTrail } = useAdminRiskDetection();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);

  // Group orders by risk type
  const groupedOrders = useMemo(() => {
    const groups: Record<string, typeof problematicOrders> = {
      no_cleaner_assigned: [],
      no_report: [],
      report_no_photos: [],
      unconfirmed_order: [],
      delayed_order: [],
    };

    problematicOrders.forEach(order => {
      if (groups[order.risk_type]) {
        groups[order.risk_type].push(order);
      }
    });

    return groups;
  }, [problematicOrders]);

  const handleViewReport = (order: any) => {
    setSelectedOrder(order);
    setShowReportDialog(true);
  };

  const handleViewUser = (userId: string) => {
    // This would need to fetch the user profile
    // For now, we'll show a placeholder
    setSelectedUser({ id: userId });
    setShowUserDialog(true);
  };

  const handleViewAccountability = async (order: any) => {
    const trail = await fetchAccountabilityTrail(order.id);
    if (trail) {
      // Show accountability trail in a dialog or expand the order
      console.log('Accountability trail:', trail);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Counters */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Всего рисков</span>
          </div>
          <p className="text-2xl font-bold">{counters.total}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Нет клинера</span>
          </div>
          <p className="text-2xl font-bold">{counters.noCleaner}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">Нет отчёта</span>
          </div>
          <p className="text-2xl font-bold">{counters.noReport}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">Не подтверждён</span>
          </div>
          <p className="text-2xl font-bold">{counters.unconfirmed}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Просрочен</span>
          </div>
          <p className="text-2xl font-bold">{counters.delayed}</p>
        </div>
      </div>

      {/* Risk List by Type */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Все ({counters.total})</TabsTrigger>
          <TabsTrigger value="no_cleaner_assigned">Нет клинера ({counters.noCleaner})</TabsTrigger>
          <TabsTrigger value="no_report">Нет отчёта ({counters.noReport})</TabsTrigger>
          <TabsTrigger value="unconfirmed_order">Не подтверждён ({counters.unconfirmed})</TabsTrigger>
          <TabsTrigger value="delayed">Просрочен ({counters.delayed})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <RiskOrdersList 
            orders={problematicOrders} 
            onViewReport={handleViewReport}
            onViewUser={handleViewUser}
          />
        </TabsContent>

        {Object.entries(groupedOrders).map(([type, orders]) => (
          <TabsContent key={type} value={type} className="mt-4">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Нет проблемных заказов этого типа</p>
              </div>
            ) : (
              <RiskOrdersList 
                orders={orders} 
                onViewReport={handleViewReport}
                onViewUser={handleViewUser}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      {selectedOrder && (
        <ViewReportDialog
          isOpen={showReportDialog}
          onClose={() => {
            setShowReportDialog(false);
            setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
        />
      )}

      {selectedUser && (
        <ViewUserProfileDialog
          user={selectedUser}
          open={showUserDialog}
          onOpenChange={(open) => {
            setShowUserDialog(open);
            if (!open) setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

interface RiskOrdersListProps {
  orders: any[];
  onViewReport: (order: any) => void;
  onViewUser: (userId: string) => void;
}

const RiskOrdersList = ({ orders, onViewReport, onViewUser }: RiskOrdersListProps) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Нет проблемных заказов</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const config = riskTypeConfig[order.risk_type] || riskTypeConfig.no_cleaner_assigned;
        const severity = severityConfig[order.risk_severity] || severityConfig.medium;
        const Icon = config.icon;

        return (
          <div
            key={order.id}
            className={cn(
              'p-4 rounded-lg border',
              severity.bg,
              severity.border
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              {/* Main Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg bg-background/50', config.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {format(new Date(order.scheduled_date), 'd MMMM yyyy', { locale: ru })}
                      </span>
                      <span className="text-muted-foreground">{order.scheduled_time}</span>
                      <Badge variant="outline" className={cn('text-xs', severity.text, severity.bg)}>
                        {config.label}
                      </Badge>
                      {order.risk_severity === 'high' && (
                        <Badge variant="destructive" className="text-xs">
                          Высокий риск
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{order.object_name}</span>
                      </div>
                      
                      {order.cleaner_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <button
                            onClick={() => onViewUser(order.cleaner_id)}
                            className="hover:underline text-primary"
                          >
                            {order.cleaner_name}
                          </button>
                        </div>
                      )}
                      
                      {order.manager_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Менеджер: {order.manager_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Risk Description */}
                    <div className={cn('mt-3 p-2 rounded bg-background/50 text-sm', severity.text)}>
                      {order.risk_description}
                      {order.hours_overdue && (
                        <span className="font-medium ml-2">
                          ({order.hours_overdue}ч)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex lg:flex-col gap-2">
                {order.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewReport(order)}
                    className="gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Отчёт
                  </Button>
                )}
                
                {order.cleaner_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewUser(order.cleaner_id)}
                    className="gap-1"
                  >
                    <User className="w-4 h-4" />
                    Клинер
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};