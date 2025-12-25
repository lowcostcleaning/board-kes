import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export const UserAvatar = ({ avatarUrl, name, email, size = 'md', className }: UserAvatarProps) => {
  const displayName = name || email?.split('@')[0] || 'U';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
      )}
      <AvatarFallback className="bg-primary/10 text-primary">
        {avatarUrl ? (
          <User className={cn(iconSizes[size], 'text-primary')} />
        ) : (
          <span className="font-medium">{initials}</span>
        )}
      </AvatarFallback>
    </Avatar>
  );
};
