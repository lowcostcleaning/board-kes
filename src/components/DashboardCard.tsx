import { ReactNode, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LucideIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  action,
  collapsible = false,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (collapsible) {
    return (
      <Card className="shadow-card border-border/50 bg-card animate-slide-up">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent-foreground" />
                  </div>
                  {title}
                </CardTitle>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              {action}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {children}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

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
