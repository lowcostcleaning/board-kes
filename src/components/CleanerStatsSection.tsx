import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Brush } from 'lucide-react';

interface CleanerStats {
  total_cleanings: number;
  avg_rating: number | null;
  clean_rate: number;
}

export const CleanerStatsSection = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CleanerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('cleaner_stats_view')
          .select('total_cleanings, avg_rating, clean_rate')
          .eq('cleaner_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching cleaner stats:', error);
          return;
        }

        setStats(data || null);
      } catch (error) {
        console.error('Error fetching cleaner stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  if (loading) {
    return <div className="space-y-2">Загрузка статистики...</div>;
  }

  if (!stats) {
    return (
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="font-medium">Статистика</h3>
        <p className="text-sm text-muted-foreground">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-medium">Статистика</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-lg font-semibold">
              {stats.avg_rating ? stats.avg_rating.toFixed(1) : '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Рейтинг</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Brush className="w-4 h-4 text-primary" />
            <span className="text-lg font-semibold">{stats.total_cleanings}</span>
          </div>
          <p className="text-xs text-muted-foreground">Уборок</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50">
          <div className="text-lg font-semibold">
            {stats.clean_rate}%
          </div>
          <p className="text-xs text-muted-foreground">Качество</p>
        </div>
      </div>
    </div>
  );
};