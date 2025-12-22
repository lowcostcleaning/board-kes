import { Clock, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'active';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'pending') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-status-pending/15 border border-status-pending/30">
        <Clock className="w-4 h-4 text-status-pending" />
        <span className="text-sm font-medium text-status-pending-foreground">
          Waiting for moderation
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-status-active/15 border border-status-active/30">
      <CheckCircle2 className="w-4 h-4 text-status-active" />
      <span className="text-sm font-medium text-status-active-foreground">
        Active
      </span>
    </div>
  );
};
