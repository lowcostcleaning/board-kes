import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const ModerationBanner = () => {
  const { profile } = useAuth();

  // Don't show for admins or approved users
  if (!profile || profile.role === 'admin' || profile.status === 'approved') {
    return null;
  }

  return (
    <div className="rounded-lg bg-status-pending/10 border border-status-pending/30 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-status-pending/20 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-status-pending" />
        </div>
        <div>
          <h3 className="font-semibold text-status-pending-foreground mb-1">
            Ожидание модерации
          </h3>
          <p className="text-sm text-muted-foreground">
            Ваш аккаунт находится на модерации. Доступ к функционалу будет открыт после одобрения администратором.
          </p>
        </div>
      </div>
    </div>
  );
};
