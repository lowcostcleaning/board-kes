import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { ModerationBanner } from '@/components/ModerationBanner';
import { AddObjectDialog } from '@/components/AddObjectDialog';
import { ObjectsList } from '@/components/ObjectsList';
import { Building2, ShoppingCart } from 'lucide-react';

const ManagerDashboard = () => {
  const { user, profile } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Менеджер';
  const isApproved = profile?.role === 'admin' || profile?.status === 'approved';

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout title="Панель менеджера">
      <div className="space-y-6">
        {/* Moderation Banner */}
        <ModerationBanner />

        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Добро пожаловать, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Управляйте объектами и заказами.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard 
              title="Объекты" 
              icon={Building2}
              action={<AddObjectDialog onObjectAdded={handleRefresh} disabled={!isApproved} />}
            >
              <div className="space-y-3">
                <ObjectsList 
                  refreshTrigger={refreshTrigger} 
                  onRefresh={handleRefresh}
                  disabled={!isApproved}
                />
                <p className="text-sm text-muted-foreground">
                  Добавьте объекты недвижимости для клининговых услуг.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard title="Заказы" icon={ShoppingCart}>
              <div className="space-y-3">
                <div className="flex items-center justify-center p-8 rounded-lg bg-muted/50 border-2 border-dashed border-border">
                  <div className="text-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Пока нет заказов
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Создавайте и управляйте заказами на уборку.
                </p>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
