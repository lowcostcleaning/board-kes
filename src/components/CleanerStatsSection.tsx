import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Brush } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type CleanerStatsView = Tables<'cleaner_stats_view'>;

export const CleanerStatsSection = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CleanerStatsView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('cleaner_stats_view')
          .select('cleaner_id, total_cleanings, avg_rating, clean_jobs, clean_rate') // Select all fields
          .eq('cleaner_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching cleaner stats:', error);
          return;
        }

        // Ensure all fields are present, even if null from DB
        setStats(data ? {
          cleaner_id: data.cleaner_id,
          total_cleanings: data.total_cleanings,
          avg_rating: data.avg_rating,
          clean_jobs: data.clean_jobs,
          clean_rate: data.clean_rate,
        } : null);
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