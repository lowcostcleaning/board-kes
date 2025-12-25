import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, Shield, UserCheck, Clock, Brush, Briefcase, CheckCircle2, Star, Edit2, Check, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserAvatar } from '@/components/UserAvatar';
import { ViewUserProfileDialog } from '@/components/ViewUserProfileDialog';

interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string | null;
  name: string | null;
  rating: number | null;
  completed_orders_count: number;
  avatar_url: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
}

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOrdersCount, setEditingOrdersCount] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<string>('');
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const isMobile = useIsMobile();

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Админ';
  
  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile 
    ? { collapsible: true, defaultOpen: false } 
    : { collapsible: false, defaultOpen: true };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список пользователей',
        variant: 'destructive',
      });
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
    } else {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast({
        title: 'Роль обновлена',
        description: `Роль пользователя изменена на ${getRoleLabel(newRole)}`,
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
    } else {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
      toast({
        title: 'Статус обновлен',
        description: newStatus === 'approved' ? 'Пользователь одобрен' : 'Пользователь на модерации',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'cleaner':
        return <Brush className="w-3 h-3" />;
      case 'manager':
        return <Briefcase className="w-3 h-3" />;
      case 'admin':
        return <Shield className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'cleaner':
        return 'Клинер';
      case 'manager':
        return 'Менеджер';
      case 'admin':
        return 'Админ';
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

    const { error } = await supabase
      .from('profiles')
      .update({ completed_orders_count: count })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить количество уборок',
        variant: 'destructive',
      });
    } else {
      setUsers(users.map(u =>
        u.id === userId ? { ...u, completed_orders_count: count } : u
      ));
      toast({
        title: 'Успешно',
        description: 'Количество уборок обновлено',
      });
      setEditingOrdersCount(null);
      setNewOrdersCount('');
    }
  };

  const handleViewProfile = (user: UserProfile) => {
    setViewingUser(user);
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
        <div className="grid gap-4 md:grid-cols-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Всего пользователей</p>
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
                  {users.filter(u => u.status === 'pending').length}
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
                  {users.filter(u => u.status === 'approved').length}
                </p>
                <p className="text-sm text-muted-foreground">Одобрено</p>
              </div>
            </div>
          </div>
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
                        <p className="font-medium text-foreground truncate">{u.name || u.email}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {u.id.slice(0, 8)}...
                        </p>
                        {/* Show rating and orders count for cleaners */}
                        {u.role === 'cleaner' && (
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
                      {u.status === 'pending' ? (
                        <Badge variant="outline" className="bg-status-pending/10 text-status-pending border-status-pending/30">
                          <Clock className="w-3 h-3 mr-1" />
                          На модерации
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-status-active/10 text-status-active border-status-active/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Одобрен
                        </Badge>
                      )}

                      {/* Status Toggle Button */}
                      {u.status === 'pending' ? (
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
                      )}

                      {/* Role Selector */}
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
                        </SelectContent>
                      </Select>
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
