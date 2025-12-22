import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanerRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CleanerRatingInput = ({
  value,
  onChange,
  disabled = false,
  size = 'md',
}: CleanerRatingInputProps) => {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating)}
          onMouseEnter={() => !disabled && setHoveredRating(rating)}
          onMouseLeave={() => setHoveredRating(0)}
          className={cn(
            'transition-all duration-200',
            disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              'transition-colors duration-200',
              (hoveredRating ? rating <= hoveredRating : rating <= value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
};
