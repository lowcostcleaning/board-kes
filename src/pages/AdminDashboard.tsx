import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, Shield, UserCheck, Clock, Brush, Briefcase, CheckCircle2, Star, Edit2, Check, X, Eye, FlaskConical, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserAvatar } from '@/components/UserAvatar';
import { ViewUserProfileDialog } from '@/components/ViewUserProfileDialog';
import { useAdminUsers, UserProfile } from '@/hooks/use-admin-users';
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

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    users,
    allUsers,
    isLoading,
    filters,
    updateFilters,
    deleteUser,
    restoreUser,
    updateRole,
    updateStatus,
    updateOrdersCount,
  } = useAdminUsers();
  
  const [editingOrdersCount, setEditingOrdersCount] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<string>('');
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const isMobile = useIsMobile();

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Админ';
  
  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile 
    ? { collapsible: true, defaultOpen: false } 
    : { collapsible: false, defaultOpen: true };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const success = await updateRole(userId, newRole);
    if (success) {
      toast({
        title: 'Роль обновлена',
        description: `Роль пользователя изменена на ${getRoleLabel(newRole)}`,
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const success = await updateStatus(userId, newStatus);
    if (success) {
      toast({
        title: 'Статус обновлен',
        description: newStatus === 'approved' ? 'Пользователь одобрен' : 'Пользователь на модерации',
      });
    }
  };

  const handleDeleteUser = async () => {
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
    setEditingOrdersCount(userId);
    setNewOrdersCount(currentCount.toString());
  };

  const handleCancelEditOrdersCount = () => {
    setEditingOrdersCount(null);
    setNewOrdersCount('');
  };

  const handleSaveOrdersCount = async (userId: string) => {
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

  return (
    <DashboardLayout title="Панель администратора">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Добро пожаловать, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Управляйте пользователями и их ролями.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{allUsers.filter(u => u.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Активных</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-pending/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-status-pending" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {allUsers.filter(u => u.status === 'pending' && u.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">На модерации</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-active/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-status-active" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {allUsers.filter(u => u.status === 'approved' && u.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Одобрено</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {allUsers.filter(u => !u.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Удалённых</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <Select
            value={filters.role || 'all'}
            onValueChange={(value) => updateFilters({ role: value === 'all' ? null : value })}
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
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilters({ status: value === 'all' ? null : value })}
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
            value={filters.userType}
            onValueChange={(value: 'all' | 'demo' | 'real') => updateFilters({ userType: value })}
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
            variant={filters.showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => updateFilters({ showInactive: !filters.showInactive })}
            className="gap-1"
          >
            <Trash2 className="w-4 h-4" />
            {filters.showInactive ? 'Скрыть удалённых' : 'Показать удалённых'}
          </Button>
        </div>

        {/* Users List */}
        <div style={{ animationDelay: '0.2s' }}>
          <DashboardCard title="Пользователи" icon={Users} {...cardProps}>
            {isLoading ? (
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
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => handleSaveOrdersCount(u.id)}
                                  >
                                    <Check className="w-3 h-3 text-status-active" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={handleCancelEditOrdersCount}
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-status-active/50 text-status-active hover:bg-status-active/10"
                          onClick={() => handleRestoreUser(u.id)}
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
        </div>

        {/* Roles Management */}
        <div style={{ animationDelay: '0.3s' }}>
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
        </div>
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
