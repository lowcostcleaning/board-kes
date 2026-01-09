import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, FlaskConical } from 'lucide-react';

interface AdminUserFiltersProps {
  filters: {
    role: string | null;
    status: string | null;
    userType: 'all' | 'demo' | 'real';
    showInactive: boolean;
  };
  updateFilters: (newFilters: Partial<AdminUserFiltersProps['filters']>) => void;
}

export const AdminUserFilters = ({ filters, updateFilters }: AdminUserFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
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
        variant={filters.showInactive ? 'default' : 'outline'}
        size="sm"
        onClick={() => updateFilters({ showInactive: !filters.showInactive })}
        className="gap-1"
      >
        <Trash2 className="w-4 h-4" />
        {filters.showInactive ? 'Скрыть удалённых' : 'Показать удалённых'}
      </Button>
    </div>
  );
};