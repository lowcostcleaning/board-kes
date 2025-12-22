import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, children, action }) => {
  return (
    <Card className="shadow-card border-border/50 bg-card animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent-foreground" />
            </div>
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
