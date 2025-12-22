import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { ModerationBanner } from '@/components/ModerationBanner';
import { AddObjectDialog } from '@/components/AddObjectDialog';
import { ObjectsList } from '@/components/ObjectsList';
import { CreateOrderDialog } from '@/components/CreateOrderDialog';
import { OrdersList } from '@/components/OrdersList';
import { ManagerChatList } from '@/components/ManagerChatList';
import { Building2, ShoppingCart, MessageCircle } from 'lucide-react';

const ManagerDashboard = () => {
  const { user, profile } = useAuth();
  const [objectsRefresh, setObjectsRefresh] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  
  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Менеджер';
  const isApproved = profile?.role === 'admin' || profile?.status === 'approved';

  const handleObjectsRefresh = () => {
    setObjectsRefresh((prev) => prev + 1);
  };

  const handleOrdersRefresh = () => {
    setOrdersRefresh((prev) => prev + 1);
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard 
              title="Объекты" 
              icon={Building2}
              action={<AddObjectDialog onObjectAdded={handleObjectsRefresh} disabled={!isApproved} />}
            >
              <div className="space-y-3">
                <ObjectsList 
                  refreshTrigger={objectsRefresh} 
                  onRefresh={handleObjectsRefresh}
                  disabled={!isApproved}
                />
                <p className="text-sm text-muted-foreground">
                  Добавьте объекты недвижимости для клининговых услуг.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard 
              title="Заказы" 
              icon={ShoppingCart}
              action={<CreateOrderDialog onOrderCreated={handleOrdersRefresh} disabled={!isApproved} />}
            >
              <div className="space-y-3">
                <OrdersList 
                  refreshTrigger={ordersRefresh} 
                  onRefresh={handleOrdersRefresh}
                  disabled={!isApproved}
                />
                <p className="text-sm text-muted-foreground">
                  Создавайте и управляйте заказами на уборку.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.4s' }}>
            <DashboardCard title="Сообщения" icon={MessageCircle}>
              <div className="space-y-3">
                {isApproved ? (
                  <ManagerChatList />
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
                    Сообщения будут доступны после одобрения аккаунта.
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

export default ManagerDashboard;
