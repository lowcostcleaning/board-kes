import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Building2, Calendar, ShieldAlert, Bell, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

// Use named imports for components that export named symbols
import { AdminObjectsTab } from '@/components/AdminObjectsTab';
import { AdminCleanerCalendarTab } from '@/components/AdminCleanerCalendarTab';
import { RiskControlTab } from '@/components/RiskControlTab';

// AdminReportsTab is a default export (read-only reports tab)
import AdminReportsTab from '@/components/AdminReportsTab';

import { ViewUserProfileDialog } from '@/components/ViewUserProfileDialog';
import { useAdminUsers } from '@/hooks/use-admin-users';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { Badge } from '@/components/ui/badge';

const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('users');
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  // Keep hooks active so counters/notifications work as before
  const adminUsers = useAdminUsers();
  const adminDashboard = useAdminDashboard();

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Админ';

  return (
    <DashboardLayout title="Панель администратора">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Добро пожаловать, {displayName}!</h1>
            <p className="text-sm text-muted-foreground">Управляйте пользователями, объектами и отчётами.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Уведомления</span>
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {adminDashboard.notifications.length > 0 && (
                  <Badge className="absolute -top-2 -right-2" variant="destructive">
                    {adminDashboard.notifications.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Пользователи</span>
            </TabsTrigger>

            <TabsTrigger value="objects">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Объекты</span>
            </TabsTrigger>

            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Календарь</span>
            </TabsTrigger>

            <TabsTrigger value="risk">
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Риски</span>
            </TabsTrigger>

            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>

            <TabsTrigger value="reports">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Отчёты</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Пользователи ({adminUsers.allUsers.length})</h3>
            </div>
          </TabsContent>

          <TabsContent value="objects" className="mt-6">
            <AdminObjectsTab isReadOnlyMode={false} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <AdminCleanerCalendarTab />
          </TabsContent>

          <TabsContent value="risk" className="mt-6">
            <RiskControlTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <div className="text-sm text-muted-foreground">Уведомления администратора</div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <AdminReportsTab />
          </TabsContent>
        </Tabs>

        <ViewUserProfileDialog
          user={viewingUser}
          open={!!viewingUser}
          onOpenChange={(open) => {
            if (!open) setViewingUser(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;