import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X, Eye, FlaskConical, Clock, CheckCircle2, Star, Trash2, RotateCcw, Brush, Briefcase, Shield, UserCheck, Users } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react'; // Import useState

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
  rating?: number | null;
  total_cleanings: number; // From cleaner_stats_view
  manual_orders_adjustment: number; // New field
  final_total_cleanings: number; // Calculated field
  avatar_url?: string | null;
  is_active?: boolean;
}

interface AdminUserListProps {
  users: UserProfile[];
  isLoading: boolean;
  isReadOnlyMode: boolean;
  handleRoleChange: (userId: string, newRole: string) => void;
  handleStatusChange: (userId: string, newStatus: string) => void;
  handleViewProfile: (userProfile: UserProfile) => void;
  setUserToDelete: (user: UserProfile) => void;
  handleRestoreUser: (userId: string) => void;
  updateManualOrdersAdjustment: (userId: string, adjustment: number) => Promise<boolean>; // New prop
}

export const AdminUserList = ({
  users,
  isLoading,
  isReadOnlyMode,
  handleRoleChange,
  handleStatusChange,
  handleViewProfile,
  setUserToDelete,
  handleRestoreUser,
  updateManualOrdersAdjustment,
}: AdminUserListProps) => {
  const isMobile = useIsMobile();
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [currentAdjustmentValue, setCurrentAdjustmentValue] = useState<number>(0);
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile
    ? { collapsible: true, defaultOpen: false }
    : { collapsible: false, defaultOpen: true };

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

  const handleStartEditAdjustment = (userId: string, currentAdjustment: number) => {
    if (isReadOnlyMode) return;
    setEditingAdjustmentId(userId);
    setCurrentAdjustmentValue(currentAdjustment);
  };

  const handleSaveAdjustment = async (userId: string) => {
    if (isReadOnlyMode) return;
    setIsSavingAdjustment(true);
    const success = await updateManualOrdersAdjustment(userId, currentAdjustmentValue);
    if (success) {
      setEditingAdjustmentId(null);
    }
    setIsSavingAdjustment(false);
  };

  const handleCancelEditAdjustment = () => {
    setEditingAdjustmentId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center p-4">
        Нет зарегистрированных пользователей
      </p>
    );
  }

  return (
    <DashboardCard title="Пользователи" icon={Users} {...cardProps}>
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
                {/* Show rating and total cleanings for cleaners */}
                {(u.role === 'cleaner' || u.role === 'demo_cleaner') && (
                  <div className="flex flex-col gap-1 mt-1 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{u.rating ? u.rating.toFixed(1) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {editingAdjustmentId === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Реал: {u.total_cleanings}</span>
                          <Input
                            type="number"
                            value={currentAdjustmentValue}
                            onChange={(e) => setCurrentAdjustmentValue(parseInt(e.target.value) || 0)}
                            className="w-20 h-7 text-xs"
                            disabled={isSavingAdjustment}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveAdjustment(u.id)}
                            disabled={isSavingAdjustment}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={handleCancelEditAdjustment}
                            disabled={isSavingAdjustment}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">Уборок: {u.final_total_cleanings}</span>
                          <span className="text-xs text-muted-foreground">
                            (Реал: {u.total_cleanings}, Корр: {u.manual_orders_adjustment})
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleStartEditAdjustment(u.id, u.manual_orders_adjustment)}
                            disabled={isReadOnlyMode}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
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
    </DashboardCard>
  );
};