import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, AlertTriangle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { subHours } from 'date-fns';

interface AdminNotificationsProps {
  notifications: any[];
  isLoadingCounters: boolean;
  isUpdatingNotification: boolean;
  isReadOnlyMode: boolean;
  counters: {
    overdueNotifications: number;
  };
  handleResolveNotification: (notification: any, action: 'approved' | 'rejected') => void;
}

export const AdminNotifications = ({
  notifications,
  isLoadingCounters,
  isUpdatingNotification,
  isReadOnlyMode,
  counters,
  handleResolveNotification,
}: AdminNotificationsProps) => {
  const isMobile = useIsMobile();

  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile
    ? { collapsible: true, defaultOpen: false }
    : { collapsible: false, defaultOpen: true };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'cleaner':
        return 'Клинер';
      case 'manager':
        return 'Менеджер';
      case 'admin':
        return 'Админ';
      case 'demo_manager':
        return 'Demo Менеджер';
      case 'demo_cleaner':
        return 'Demo Клинер';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overdue Counter */}
      {counters.overdueNotifications > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Просроченные действия:
            </span>
          </div>
          <Badge variant="destructive" className="text-base font-bold">
            {counters.overdueNotifications}
          </Badge>
        </div>
      )}

      <DashboardCard title="Очередь уведомлений" icon={Bell} {...cardProps}>
        {isLoadingCounters ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">
            Нет ожидающих уведомлений
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const isOverdue = counters.overdueNotifications > 0 &&
                new Date(notif.created_at) < subHours(new Date(), 24);

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 rounded-lg border space-y-2",
                    isOverdue
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-status-pending/30 bg-status-pending/10",
                    isUpdatingNotification && "opacity-60 pointer-events-none"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className={cn("w-4 h-4", isOverdue ? "text-destructive" : "text-status-pending")} />
                      <span className="font-medium text-sm">
                        Новая регистрация
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notif.created_at), 'd MMM HH:mm', { locale: ru })}
                    </span>
                  </div>

                  <div className="text-sm">
                    <p className="font-semibold">{notif.user_email}</p>
                    <p className="text-muted-foreground text-xs capitalize">
                      Роль: {getRoleLabel(notif.user_role)}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-status-pending/20">
                    <Button
                      size="sm"
                      className="flex-1 bg-status-active hover:bg-status-active/90"
                      onClick={() => handleResolveNotification(notif, 'approved')}
                      disabled={isUpdatingNotification || isReadOnlyMode}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Одобрить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:bg-destructive/10"
                      onClick={() => handleResolveNotification(notif, 'rejected')}
                      disabled={isUpdatingNotification || isReadOnlyMode}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </div>
  );
};