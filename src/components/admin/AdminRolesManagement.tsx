import { DashboardCard } from '@/components/DashboardCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Brush, Briefcase, Shield } from 'lucide-react';

export const AdminRolesManagement = () => {
  const isMobile = useIsMobile();

  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile
    ? { collapsible: true, defaultOpen: false }
    : { collapsible: false, defaultOpen: true };

  return (
    <DashboardCard title="Управление ролями" icon={Shield} {...cardProps}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Управляйте ролями пользователей. Роль админа можно назначить только из этой панели.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Brush className="w-4 h-4 text-primary" />
              <span className="font-medium">Клинер</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Просмотр назначенных уборок и календаря
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="font-medium">Менеджер</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Управление объектами и заказами
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium">Админ</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Полный доступ к системе
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};