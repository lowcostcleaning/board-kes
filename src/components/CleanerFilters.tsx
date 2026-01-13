import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

interface CleanerFiltersProps {
  sortBy: string;
  onSortChange: (value: string) => void;
}

export const CleanerFilters: React.FC<CleanerFiltersProps> = ({ sortBy, onSortChange, }) => {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Filter className="w-4 h-4 text-muted-foreground" />
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="flex-1 h-8 text-xs bg-[#f5f5f5] dark:bg-muted/40 rounded-lg border-0">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent className="bg-background rounded-[14px]">
          <SelectItem value="name" className="text-xs rounded-lg">По имени</SelectItem>
          <SelectItem value="rating_desc" className="text-xs rounded-lg">Рейтинг ↓</SelectItem>
          <SelectItem value="rating_asc" className="text-xs rounded-lg">Рейтинг ↑</SelectItem>
          <SelectItem value="orders_desc" className="text-xs rounded-lg">Уборки ↓</SelectItem>
          <SelectItem value="orders_asc" className="text-xs rounded-lg">Уборки ↑</SelectItem>
          <SelectItem value="price_asc" className="text-xs rounded-lg">Цена ↑</SelectItem>
          <SelectItem value="price_desc" className="text-xs rounded-lg">Цена ↓</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};