import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Shield, 
  UserCheck, 
  Clock, 
  Brush, 
  Briefcase, 
  CheckCircle2, 
  Star, 
  Edit2, 
  Check, 
  X, 
  Eye, 
  FlaskConical, 
  Trash2, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Bell,
  MapPin,
  Loader2,
  Lock,
  AlertTriangle,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserAvatar } from '@/components/UserAvatar';
import { ViewUserProfileDialog } from '@/components/ViewUserProfileDialog';
import { useAdminUsers, UserProfile } from '@/hooks/use-admin-users';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { AdminObjectsTab } from '@/components/AdminObjectsTab';
import { AdminCleanerCalendarTab } from '@/components/AdminCleanerCalendarTab';
import { RiskControlTab } from '@/components/RiskControlTab';
// Import the AdminReportsTab explicitly with extension so TS resolves the file
import AdminReportsTab from '../components/AdminReportsTab.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, subHours } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ... rest of the file is unchanged until TabsList area

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  const {
    users,
    allUsers,
    isLoading: isLoadingUsers,
    filters: userFilters,
    updateFilters: updateUserFilters,
    deleteUser,
    restoreUser,
    updateRole,
    updateStatus,
    updateOrdersCount,
  } = useAdminUsers();
  
  const {
    counters,
    isLoadingCounters,
    notifications,
    isUpdatingNotification,
    resolveNotification,
  } = useAdminDashboard();
  
  const [editingOrdersCount, setEditingOrdersCount] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<string>('');
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const isMobile = useIsMobile();

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Админ';
  
  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile 
    ? { collapsible: true, defaultOpen: false } 
    : { collapsible: false, defaultOpen: true };

  const checkReadOnly = () => {
    if (isReadOnlyMode) {
      toast({
        title: 'Режим только для чтения',
        description: 'Действие заблокировано. Отключите режим аудита.',
        variant: 'destructive',
      });
      return true;
    }
    return false;
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (checkReadOnly()) return;
    const success = await updateRole(userId, newRole);
    if (success) {
      toast({
        title: 'Роль обновлена',
        description: `Роль пользователя изменена на ${getRoleLabel(newRole)}`,
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (checkReadOnly()) return;
    const success = await updateStatus(userId, newStatus);
    if (success) {
      toast({
        title: 'Статус обновлен',
        description: newStatus === 'approved' ? 'Пользователь одобрен' : 'Пользователь на модерации',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (checkReadOnly()) return;
    if (!userToDelete) return;
    
    const result = await deleteUser(userToDelete.id);
    
    if (result.success) {
      toast({
        title: 'Пользователь удалён',
        description: 'Пользователь был деактивирован',
      });
    } else {
      toast({
        title: 'Ошибка',
        description: result.error || 'Не удалось удалить пользователя',
        variant: 'destructive',
      });
    }
    
    setUserToDelete(null);
  };

  const handleRestoreUser = async (userId: string) => {
    if (checkReadOnly()) return;
    const result = await restoreUser(userId);
    
    if (result.success) {
      toast({
        title: 'Пользователь восстановлен',
        description: 'Пользователь снова активен',
      });
    } else {
      toast({
        title: 'Ошибка',
        description: result.error || 'Не удалось восстановить пользователя',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'cleaner':
      case 'demo_cleaner':
        return <Brush className="w-3 h-3" />;
      case 'manager':
      case 'demo_manager':
        return <Briefcase className="w-3 h-3" />;
      case 'admin':
        return <Shield className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const isDemoRole = (role: string) => role === 'demo_manager' || role === 'demo_cleaner';

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

  const handleStartEditOrdersCount = (userId: string, currentCount: number) => {
    if (checkReadOnly()) return;
    setEditingOrdersCount(userId);
    setNewOrdersCount(currentCount.toString());
  };

  const handleCancelEditOrdersCount = () => {
    setEditingOrdersCount(null);
    setNewOrdersCount('');
  };

  const handleSaveOrdersCount = async (userId: string) => {
    if (checkReadOnly()) return;
    const count = parseInt(newOrdersCount, 10);
    if (isNaN(count) || count < 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректное число',
        variant: 'destructive',
      });
      return;
    }

    const success = await updateOrdersCount(userId, count);
    if (success) {
      toast({
        title: 'Успешно',
        description: 'Количество уборок обновлено',
      });
      setEditingOrdersCount(null);
      setNewOrdersCount('');
    }
  };

  const handleViewProfile = (userProfile: UserProfile) => {
    setViewingUser(userProfile);
  };

  const handleResolveNotification = (notification: any, action: 'approved' | 'rejected') => {
    if (checkReadOnly()) return;
    if (user?.id) {
      resolveNotification(notification, action, user.id);
    }
  };

  return (
    <DashboardLayout title="Панель администратора">
      <div className="space-y-6">
        {/* Read-Only Mode Banner */}
        {isReadOnlyMode && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm font-medium text-destructive">
              Включен режим "Только для чтения" (Аудит). Все действия по изменению данных заблокированы.
            </p>
          </div>
        )}

        {/* Welcome Section */}
        <div className="animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Добро пожаловать, {displayName}!
            </h1>
            <p className="text-muted-foreground">
              Управляйте пользователями, объектами и заказами.
            </p>
          </div>
          
          {/* Read-Only Toggle */}
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="read-only-mode" className="text-sm whitespace-nowrap">
              Только чтение
            </Label>
            <Switch
              id="read-only-mode"
              checked={isReadOnlyMode}
              onCheckedChange={setIsReadOnlyMode}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users" className="gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Пользователи</span>
            </TabsTrigger>
            <TabsTrigger value="objects" className="gap-1">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Объекты</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Календарь</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1">
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Риски</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 relative">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Уведомления</span>
              {notifications.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>

            {/* New Reports Tab */}
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Отчёты</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            {/* ... (unchanged users tab content) */}
          </TabsContent>

          {/* Objects Tab */}
          <TabsContent value="objects" className="mt-6">
            <AdminObjectsTab isReadOnlyMode={isReadOnlyMode} />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-6">
            <AdminCleanerCalendarTab />
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk" className="mt-6">
            <RiskControlTab />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            {/* ... (unchanged notifications content) */}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <AdminReportsTab />
          </TabsContent>
        </Tabs>
      </div>

      <ViewUserProfileDialog
        user={viewingUser}
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Пользователь <strong>{userToDelete?.name || userToDelete?.email}</strong> будет деактивирован. 
              Вы сможете восстановить его позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isReadOnlyMode}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;