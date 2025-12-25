import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ObjectOption {
  id: string;
  complex_name: string;
  apartment_number: string;
}

interface OrdersFilterProps {
  objects: ObjectOption[];
  selectedObjectId: string;
  onObjectChange: (objectId: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  showTodayOnly: boolean;
  onShowTodayOnlyChange: (show: boolean) => void;
}

export const OrdersFilter = ({
  objects,
  selectedObjectId,
  onObjectChange,
  dateRange,
  onDateRangeChange,
  showTodayOnly,
  onShowTodayOnlyChange,
}: OrdersFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleTodayClick = () => {
    onShowTodayOnlyChange(true);
    onDateRangeChange(undefined);
  };

  const handleAllDatesClick = () => {
    onShowTodayOnlyChange(false);
    onDateRangeChange(undefined);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    onShowTodayOnlyChange(false);
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  const clearDateFilter = () => {
    onDateRangeChange(undefined);
    onShowTodayOnlyChange(true);
  };

  const getDateLabel = () => {
    if (showTodayOnly) return 'Сегодня';
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'd MMM', { locale: ru })} - ${format(dateRange.to, 'd MMM', { locale: ru })}`;
    }
    if (dateRange?.from) {
      return format(dateRange.from, 'd MMMM', { locale: ru });
    }
    return 'Все даты';
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Quick date filters */}
      <div className="flex gap-1">
        <Button
          variant={showTodayOnly ? 'default' : 'outline'}
          size="sm"
          onClick={handleTodayClick}
          className="text-xs"
        >
          Сегодня
        </Button>
        <Button
          variant={!showTodayOnly && !dateRange ? 'default' : 'outline'}
          size="sm"
          onClick={handleAllDatesClick}
          className="text-xs"
        >
          Все
        </Button>
      </div>

      {/* Date range picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2 text-xs',
              dateRange && 'border-primary text-primary'
            )}
          >
            <CalendarIcon className="w-3 h-3" />
            {dateRange ? getDateLabel() : 'Период'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateSelect}
            locale={ru}
            numberOfMonths={1}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear date filter */}
      {(dateRange || !showTodayOnly) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearDateFilter}
          className="text-xs gap-1 text-muted-foreground"
        >
          <X className="w-3 h-3" />
          Сбросить
        </Button>
      )}

      {/* Object filter */}
      <Select value={selectedObjectId} onValueChange={onObjectChange}>
        <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
          <SelectValue placeholder="Все объекты" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все объекты</SelectItem>
          {objects.map((obj) => (
            <SelectItem key={obj.id} value={obj.id}>
              {obj.complex_name} - {obj.apartment_number}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
