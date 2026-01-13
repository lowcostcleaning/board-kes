import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanerRatingDisplayProps {
  rating: number | null;
  totalCleanings: number;
  showCount?: boolean;
  size?: 'sm' | 'md';
}

export const CleanerRatingDisplay = ({
  rating,
  totalCleanings,
  showCount = true,
  size = 'sm',
}: CleanerRatingDisplayProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <div className={cn('flex items-center gap-2', textClasses[size])}>
      <div className="flex items-center gap-1">
        <Star className={cn(sizeClasses[size], 'text-amber-400 fill-amber-400')} />
        <span className="font-medium">
          {rating ? rating.toFixed(1) : '—'}
        </span>
      </div>
      {showCount && (
        <span className="text-muted-foreground">
          ({totalCleanings} {getOrdersWord(totalCleanings)})
        </span>
      )}
    </div>
  );
};

function getOrdersWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'уборок';
  }

  if (lastOne === 1) {
    return 'уборка';
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return 'уборки';
  }

  return 'уборок';
}