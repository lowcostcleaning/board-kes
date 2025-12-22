import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Building2, ShoppingCart, Package } from 'lucide-react';

const ManagerDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Manager Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your properties and orders from here.
          </p>
        </div>

        {/* Status Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StatusBadge status={user?.status || 'pending'} />
        </div>

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div style={{ animationDelay: '0.2s' }}>
            <DashboardCard title="Objects" icon={Building2}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">No objects registered</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add properties and locations that need cleaning services.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div style={{ animationDelay: '0.3s' }}>
            <DashboardCard title="Orders" icon={ShoppingCart}>
              <div className="space-y-3">
                <div className="flex items-center justify-center p-8 rounded-lg bg-muted/50 border-2 border-dashed border-border">
                  <div className="text-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No orders yet
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create and manage cleaning orders for your properties.
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
