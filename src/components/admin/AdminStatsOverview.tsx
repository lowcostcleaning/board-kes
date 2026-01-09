import { Loader2 } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Users, Clock, CheckCircle2, Brush, MapPin } from 'lucide-react';

interface AdminStatsOverviewProps {
  counters: {
    totalUsers: number;
    pendingUsers: number;
    approvedUsers: number;
    totalCleaners: number;
    cleanersActiveToday: number;
    totalObjects: number;
    activeObjects: number;
  };
  isLoadingCounters: boolean;
}

export const AdminStatsOverview = ({ counters, isLoadingCounters }: AdminStatsOverviewProps) => {
  const isMobile = useIsMobile();

  // On mobile, cards are collapsible and closed by default
  const cardProps = isMobile
    ? { collapsible: true, defaultOpen: false }
    : { collapsible: false, defaultOpen: true };

  return (
    <DashboardCard title="Статистика" icon={Users} {...cardProps}>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Users className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalUsers}
              </p>
              <p className="text-xs text-muted-foreground">Всего (Акт.)</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-status-pending/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-status-pending" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.pendingUsers}
              </p>
              <p className="text-xs text-muted-foreground">На модерации</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-status-active/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-status-active" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.approvedUsers}
              </p>
              <p className="text-xs text-muted-foreground">Одобрено</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Brush className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalCleaners}
              </p>
              <p className="text-xs text-muted-foreground">Клинеров</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Brush className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.cleanersActiveToday}
              </p>
              <p className="text-xs text-muted-foreground">Клинеров сегодня</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.totalObjects}
              </p>
              <p className="text-xs text-muted-foreground">Всего объектов</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {isLoadingCounters ? <Loader2 className="w-4 h-4 animate-spin" /> : counters.activeObjects}
              </p>
              <p className="text-xs text-muted-foreground">Активных объектов</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};