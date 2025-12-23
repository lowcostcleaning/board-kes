import { useState, useEffect } from 'react';
import { format, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarX2, Plus, X, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UnavailabilityDate {
  id: string;
  date: string;
  reason: string | null;
}

interface CleanerUnavailabilityManagerProps {
  onUnavailabilityChange?: () => void;
}

export const CleanerUnavailabilityManager = ({ onUnavailabilityChange }: CleanerUnavailabilityManagerProps) => {
  const [unavailableDates, setUnavailableDates] = useState<UnavailabilityDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUnavailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cleaner_unavailability')
        .select('id, date, reason')
        .eq('cleaner_id', user.id)
        .order('date');

      if (error) throw error;
      setUnavailableDates(data || []);
    } catch (error) {
      console.error('Error fetching unavailability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnavailability();
  }, []);

  const handleAddUnavailability = async () => {
    if (!selectedDate) {
      toast.error('Выберите дату');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let datesToAdd: Date[] = [];
      
      if (isRangeMode && rangeEnd) {
        const start = startOfDay(selectedDate < rangeEnd ? selectedDate : rangeEnd);
        const end = startOfDay(selectedDate < rangeEnd ? rangeEnd : selectedDate);
        datesToAdd = eachDayOfInterval({ start, end });
      } else {
        datesToAdd = [selectedDate];
      }

      // Filter out already existing dates
      const existingDatesSet = new Set(unavailableDates.map(d => d.date));
      datesToAdd = datesToAdd.filter(d => !existingDatesSet.has(format(d, 'yyyy-MM-dd')));

      if (datesToAdd.length === 0) {
        toast.info('Все выбранные даты уже отмечены как недоступные');
        setIsSaving(false);
        return;
      }

      const records = datesToAdd.map(date => ({
        cleaner_id: user.id,
        date: format(date, 'yyyy-MM-dd'),
        reason: reason.trim() || null
      }));

      const { error } = await supabase
        .from('cleaner_unavailability')
        .insert(records);

      if (error) throw error;

      toast.success(datesToAdd.length === 1 
        ? 'Дата отмечена как недоступная' 
        : `${datesToAdd.length} дней отмечены как недоступные`);
      
      setSelectedDate(undefined);
      setRangeEnd(undefined);
      setReason('');
      setIsPopoverOpen(false);
      setIsRangeMode(false);
      fetchUnavailability();
      onUnavailabilityChange?.();
    } catch (error) {
      console.error('Error adding unavailability:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveUnavailability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cleaner_unavailability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Дата удалена из недоступных');
      fetchUnavailability();
      onUnavailabilityChange?.();
    } catch (error) {
      console.error('Error removing unavailability:', error);
      toast.error('Ошибка при удалении');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (isRangeMode) {
      if (!selectedDate) {
        setSelectedDate(date);
      } else if (!rangeEnd) {
        setRangeEnd(date);
      } else {
        setSelectedDate(date);
        setRangeEnd(undefined);
      }
    } else {
      setSelectedDate(date);
    }
  };

  const isDateInRange = (date: Date) => {
    if (!isRangeMode || !selectedDate || !rangeEnd) return false;
    const start = selectedDate < rangeEnd ? selectedDate : rangeEnd;
    const end = selectedDate < rangeEnd ? rangeEnd : selectedDate;
    return date >= start && date <= end;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingDates = unavailableDates.filter(d => new Date(d.date) >= startOfDay(new Date()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CalendarX2 className="w-4 h-4 text-muted-foreground" />
          Мои недоступные дни
        </h4>
        
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Добавить
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={isRangeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsRangeMode(!isRangeMode);
                    setSelectedDate(undefined);
                    setRangeEnd(undefined);
                  }}
                  className="gap-1"
                >
                  <CalendarRange className="w-4 h-4" />
                  Диапазон
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isRangeMode ? 'Выберите 2 даты' : 'Одна дата'}
                </span>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < startOfDay(new Date())}
                locale={ru}
                className="pointer-events-auto"
                modifiers={{
                  range: (date) => isDateInRange(date),
                  rangeEnd: (date) => rangeEnd ? isSameDay(date, rangeEnd) : false,
                }}
                modifiersClassNames={{
                  range: 'bg-primary/20',
                  rangeEnd: 'bg-primary text-primary-foreground',
                }}
              />

              {(selectedDate || rangeEnd) && (
                <div className="text-sm text-muted-foreground">
                  {isRangeMode ? (
                    <>
                      {selectedDate && format(selectedDate, 'd MMM', { locale: ru })}
                      {rangeEnd && ` — ${format(rangeEnd, 'd MMM', { locale: ru })}`}
                    </>
                  ) : (
                    selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: ru })
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs">Причина (необязательно)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Отпуск, больничный..."
                  className="h-9 text-sm"
                />
              </div>

              <Button 
                onClick={handleAddUnavailability}
                disabled={!selectedDate || (isRangeMode && !rangeEnd) || isSaving}
                className="w-full"
                size="sm"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {upcomingDates.length === 0 ? (
        <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 text-center">
          Нет отмеченных недоступных дней
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {upcomingDates.slice(0, 10).map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1 hover:bg-destructive/10 transition-colors group"
            >
              <span className="text-xs">
                {format(new Date(item.date), 'd MMM', { locale: ru })}
              </span>
              {item.reason && (
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  · {item.reason}
                </span>
              )}
              <button
                onClick={() => handleRemoveUnavailability(item.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 opacity-50 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {upcomingDates.length > 10 && (
            <Badge variant="outline" className="text-xs">
              +{upcomingDates.length - 10}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
