import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Brush } from 'lucide-react';

interface CleanerStats {
  total_cleanings: number;
  avg_rating: number;
  clean_rate: number;
}

export const CleanerPerformanceSection = () => {
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

        if (error) throw error;
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
        <h3 className="font-medium">Производительность</h3>
        <p className="text-sm text-muted-foreground">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-medium">Производительность</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 mb-1" />
          <span className="text-lg font-semibold">
            {stats.avg_rating ? stats.avg_rating.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-muted-foreground text-center">Средний рейтинг</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
          <Brush className="w-5 h-5 text-primary mb-1" />
          <span className="text-lg font-semibold">{stats.total_cleanings}</span>
          <span className="text-xs text-muted-foreground text-center">Уборок</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
          <div className="w-5 h-5 mb-1 flex items-center justify-center">
            <span className="text-lg">✔</span>
          </div>
          <span className="text-lg font-semibold">
            {stats.clean_rate ? `${stats.clean_rate.toFixed(0)}%` : '—'}
          </span>
          <span className="text-xs text-muted-foreground text-center">Качество</span>
        </div>
      </div>
    </div>
  );
};