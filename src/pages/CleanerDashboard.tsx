import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Brush, Calendar, ClipboardList } from 'lucide-react';

const CleanerDashboard = () => {
  const { user, profile } = useAuth();
  
  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Клинер';

  return (
    <DashboardLayout title="Панель клинера">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Добро пожаловать, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Управляйте своими уборками и расписанием.
          </p>
        </div>

        {/* Status Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StatusBadge status="pending" />
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard title="Мои уборки" icon={Brush}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Нет активных уборок</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Назначенные задачи появятся здесь после одобрения аккаунта.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard title="Календарь" icon={Calendar}>
              <div className="space-y-3">
                <div className="flex items-center justify-center p-8 rounded-lg bg-muted/50 border-2 border-dashed border-border">
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Календарь скоро будет доступен
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CleanerDashboard;
