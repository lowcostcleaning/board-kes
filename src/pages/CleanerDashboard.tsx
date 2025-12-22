import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { ModerationBanner } from '@/components/ModerationBanner';
import { CleanerOrdersList } from '@/components/CleanerOrdersList';
import { OrdersCalendar } from '@/components/OrdersCalendar';
import { Brush, Calendar } from 'lucide-react';

const CleanerDashboard = () => {
  const { user, profile } = useAuth();
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  
  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Клинер';
  const isApproved = profile?.role === 'admin' || profile?.status === 'approved';

  const handleOrdersRefresh = () => {
    setOrdersRefresh((prev) => prev + 1);
  };

  return (
    <DashboardLayout title="Панель клинера">
      <div className="space-y-6">
        {/* Moderation Banner */}
        <ModerationBanner />

        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Добро пожаловать, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Управляйте своими уборками и расписанием.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard title="Мои заказы" icon={Brush}>
              <div className="space-y-3">
                {isApproved ? (
                  <CleanerOrdersList 
                    refreshTrigger={ordersRefresh} 
                    onRefresh={handleOrdersRefresh}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Заказы будут доступны после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard title="Календарь" icon={Calendar}>
              <div className="space-y-3">
                {isApproved ? (
                  <OrdersCalendar 
                    refreshTrigger={ordersRefresh} 
                    userRole="cleaner"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Календарь будет доступен после одобрения аккаунта.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CleanerDashboard;
