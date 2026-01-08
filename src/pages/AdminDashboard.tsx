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
  ShieldAlert
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
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
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
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            {/* Stats Overview (Counters) */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalUsers}
                    </p>
                    <p className="text-xs text-muted-foreground">Всего (Акт.)</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-status-pending/15 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-status-pending" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.pendingUsers}
                    </p>
                    <p className="text-xs text-muted-foreground">На модерации</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-status-active/15 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-status-active" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.approvedUsers}
                    </p>
                    <p className="text-xs text-muted-foreground">Одобрено</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Brush className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalCleaners}
                    </p>
                    <p className="text-xs text-muted-foreground">Клинеров</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Brush className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.cleanersActiveToday}
                    </p>
                    <p className="text-xs text-muted-foreground">Клинеров сегодня</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalObjects}
                    </p>
                    <p className="text-xs text-muted-foreground">Всего объектов</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.activeObjects}
                    </p>
                    <p className="text-xs text-muted-foreground">Активных объектов</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={userFilters.role || 'all'}
                onValueChange={(value) => updateUserFilters({ role: value === 'all' ? null : value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Все роли" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="cleaner">Клинер</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="admin">Админ</SelectItem>
                  <SelectItem value="demo_manager">Demo Менеджер</SelectItem>
                  <SelectItem value="demo_cleaner">Demo Клинер</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={userFilters.status || 'all'}
                onValueChange={(value) => updateUserFilters({ status: value === 'all' ? null : value })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">На модерации</SelectItem>
                  <SelectItem value="approved">Одобрен</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={userFilters.userType}
                onValueChange={(value: 'all' | 'demo' | 'real') => updateUserFilters({ userType: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="real">Реальные</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={userFilters.showInactive ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => updateUserFilters({ showInactive: !userFilters.showInactive })}
                className="gap-1"
              >
                <Trash2 className="w-4 h-4" />
                {userFilters.showInactive ? 'Скрыть удалённых' : 'Показать удалённых'}
              </Button>
            </div>

            {/* Users List */}
            <DashboardCard title="Пользователи" icon={Users} {...cardProps}>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">
                Нет зарегистрированных пользователей
              </p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={u.avatar_url}
                        name={u.name}
                        email={u.email}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{u.name || u.email}</p>
                          {isDemoRole(u.role) && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs">
                              <FlaskConical className="w-2.5 h-2.5 mr-1" />
                              Demo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {u.id.slice(0, 8)}...
                        </p>
                        {/* Show rating and orders count for cleaners */}
                        {(u.role === 'cleaner' || u.role === 'demo_cleaner') && (
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{u.rating ? u.rating.toFixed(1) : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {editingOrdersCount === u.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={newOrdersCount}
                                    onChange={(e) => setNewOrdersCount(e.target.value)}
                                    className="w-16 h-6 text-xs px-2"
                                    min={0}
                                    disabled={isReadOnlyMode}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleSaveOrdersCount(u.id)}
                                    disabled={isReadOnlyMode}
                                  >
                                    <Check className="w-3 h-3 text-status-active" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={handleCancelEditOrdersCount}
                                    disabled={isReadOnlyMode}
                                  >
                                    <X className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-muted-foreground">
                                    {u.completed_orders_count} уборок
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5"
                                    onClick={() => handleStartEditOrdersCount(u.id, u.completed_orders_count)}
                                    disabled={isReadOnlyMode}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Inactive Badge */}
                      {!u.is_active && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Удалён
                        </Badge>
                      )}

                      {/* View Profile Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewProfile(u)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Профиль</span>
                      </Button>

                      {/* Status Badge */}
                      {u.is_active && (
                        u.status === 'pending' ? (
                          <Badge variant="outline" className="bg-status-pending/10 text-status-pending border-status-pending/30">
                            <Clock className="w-3 h-3 mr-1" />
                            На модерации
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Одобрен
                          </Badge>
                        )
                      )}

                      {/* Status Toggle Button */}
                      {u.is_active && (
                        u.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-status-active/50 text-status-active hover:bg-status-active/10"
                            onClick={() => handleStatusChange(u.id, 'approved')}
                            disabled={isReadOnlyMode}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Одобрить
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-status-pending"
                            onClick={() => handleStatusChange(u.id, 'pending')}
                            disabled={isReadOnlyMode}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            На модерацию
                          </Button>
                        )
                      )}

                      {/* Role Selector */}
                      {u.is_active && (
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.id, value)}
                          disabled={isReadOnlyMode}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(u.role)}
                                <span>{getRoleLabel(u.role)}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cleaner">
                              <div className="flex items-center gap-2">
                                <Brush className="w-3 h-3" />
                                Клинер
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-3 h-3" />
                                Менеджер
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Админ
                              </div>
                            </SelectItem>
                            <SelectItem value="demo_manager">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-3 h-3 text-purple-500" />
                                Demo Менеджер
                              </div>
                            </SelectItem>
                            <SelectItem value="demo_cleaner">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-3 h-3 text-purple-500" />
                                Demo Клинер
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Delete / Restore Button */}
                      {u.is_active ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUserToDelete(u)}
                          disabled={isReadOnlyMode}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-status-active/50 text-status-active hover:bg-status-active/10"
                          onClick={() => handleRestoreUser(u.id)}
                          disabled={isReadOnlyMode}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Восстановить
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>

            {/* Roles Management */}
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
          </TabsContent>

          {/* Objects Tab */}
          <TabsContent value="objects" className="mt-6">
            <AdminObjectsTab isReadOnlyMode={isReadOnlyMode} />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-6">
            <AdminCleanerCalendarTab />
          </TabsContent>

          {/* Risk Control Tab */}
          <TabsContent value="risk" className="mt-6">
            <RiskControlTab />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
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