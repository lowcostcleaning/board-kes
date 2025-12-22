import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, UserCheck, UserX, Brush, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string | null;
  role: string;
  created_at: string | null;
}

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = user?.user_metadata?.name || profile?.email?.split('@')[0] || 'Админ';

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
        description: `Роль пользователя изменена на ${newRole}`,
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
              <div className="w-10 h-10 rounded-lg bg-status-active/15 flex items-center justify-center">
                <Brush className="w-5 h-5 text-status-active" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === 'cleaner').length}
                </p>
                <p className="text-sm text-muted-foreground">Клинеров</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-status-pending/15 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-status-pending" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === 'manager').length}
                </p>
                <p className="text-sm text-muted-foreground">Менеджеров</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div style={{ animationDelay: '0.2s' }}>
          <DashboardCard title="Пользователи" icon={Users}>
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
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="text-sm font-medium text-accent-foreground">
                          {(u.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.email}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {u.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
          <DashboardCard title="Управление ролями" icon={Shield}>
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
                    Полный доступ к управлению пользователями
                  </p>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
