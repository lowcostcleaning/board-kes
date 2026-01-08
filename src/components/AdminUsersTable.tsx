import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { UserFilters, UserProfile } from '@/hooks/use-admin-users';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Все роли' },
  { value: 'cleaner', label: 'Клинер' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'admin', label: 'Админ' },
  { value: 'demo_manager', label: 'Demo менеджер' },
  { value: 'demo_cleaner', label: 'Demo клинер' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'approved', label: 'Подтверждён' },
  { value: 'pending', label: 'На модерации' },
];

const roleLabels: Record<string, string> = {
  cleaner: 'Клинер',
  manager: 'Менеджер',
  admin: 'Админ',
  demo_manager: 'Demo менеджер',
  demo_cleaner: 'Demo клинер',
};

interface AdminUsersTableProps {
  users: UserProfile[];
  isLoading: boolean;
  filters: UserFilters;
  updateFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;
}

export const AdminUsersTable = ({
  users,
  isLoading,
  filters,
  updateFilters,
  resetFilters,
}: AdminUsersTableProps) => {
  const handleRoleChange = (value: string) => {
    updateFilters({ role: value === 'all' ? null : value });
  };

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value === 'all' ? null : value });
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={filters.search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Поиск по email или имени"
          className="min-w-[200px]"
        />
        <Select
          value={filters.role || 'all'}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder="Роль" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={resetFilters}>
          Сбросить фильтры
        </Button>
        <Button
          size="sm"
          variant={filters.showInactive ? 'default' : 'outline'}
          onClick={() => updateFilters({ showInactive: !filters.showInactive })}
        >
          {filters.showInactive ? 'Скрыть отключённых' : 'Показать отключённых'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[20px] border border-border bg-card/70 p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-[20px] border border-border bg-card/70 p-8 text-center text-sm text-muted-foreground">
          Пользователи не найдены
        </div>
      ) : (
        <div className="divide-y divide-border rounded-[20px] border border-border bg-card/70">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {user.name || user.email || 'Пользователь'}
                </p>
                <p className="text-xs text-muted-foreground">{user.email || 'Email не указан'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {roleLabels[user.role] || user.role || '—'}
                </Badge>
                <Badge
                  variant={user.status === 'approved' ? 'default' : 'secondary'}
                  className="text-xs capitalize"
                >
                  {user.status || '—'}
                </Badge>
                <Badge
                  variant={user.is_active ? 'outline' : 'destructive'}
                  className="text-xs"
                >
                  {user.is_active ? 'Активен' : 'Отключён'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Уборок: {user.completed_orders_count ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};