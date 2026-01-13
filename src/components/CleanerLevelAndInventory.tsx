import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Award, Package, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Level = Tables<'levels'>;
type CleanerStatsView = Tables<'cleaner_stats_view'>; // Renamed to avoid conflict and be more specific

export const CleanerLevelAndInventory = () => {
  const { user, profile } = useAuth(); // Get profile from AuthContext
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [cleanerStats, setCleanerStats] = useState<CleanerStatsView | null>(null);
  const [inventoryProgress, setInventoryProgress] = useState<{ completed: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !profile) { // Ensure profile is available
        setError('User not authenticated or profile not loaded.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch cleaner level
        const { data: levelData, error: levelError } = await supabase
          .rpc('get_cleaner_level', { p_cleaner_id: user.id });

        if (levelError) throw levelError;

        // rpc functions return an array, even if single row is expected
        const currentLevelResult: Level | null = levelData && levelData.length > 0 ? levelData[0] : null;
        setCurrentLevel(currentLevelResult);

        // 2. Fetch all levels to determine next level
        const { data: allLevels, error: allLevelsError } = await supabase
          .from('levels') // Now 'levels' is recognized
          .select('*')
          .order('level', { ascending: true });

        if (allLevelsError) throw allLevelsError;

        if (currentLevelResult && allLevels) {
          const nextLevelCandidate = allLevels.find(l => l.level === currentLevelResult.level + 1);
          setNextLevel(nextLevelCandidate || null);
        } else if (!currentLevelResult && allLevels && allLevels.length > 0) {
          // If no current level (e.g., level 0), the next level is the first defined level
          setNextLevel(allLevels[0]);
        }

        // 3. Fetch cleaner stats
        const { data: statsData, error: statsError } = await supabase
          .from('cleaner_stats_view')
          .select('cleaner_id, total_cleanings, avg_rating, clean_jobs, clean_rate, final_cleanings') // Select all fields for correct type matching
          .eq('cleaner_id', user.id)
          .single();

        if (statsError && statsError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw statsError;
        }
        setCleanerStats(statsData || null);

        // 4. Fetch inventory progress
        const { count: completedItems, error: completedItemsError } = await supabase
          .from('user_inventory')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('has_item', true);

        if (completedItemsError) throw completedItemsError;

        const { count: totalItems, error: totalItemsError } = await supabase
          .from('inventory_items')
          .select('code', { count: 'exact', head: true });

        if (totalItemsError) throw totalItemsError;

        setInventoryProgress({
          completed: completedItems || 0,
          total: totalItems || 0,
        });

      } catch (err: any) {
        console.error('Error fetching cleaner level and inventory:', err);
        setError(`Failed to load data: ${err.message}`);
        toast.error(`Ошибка загрузки данных: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id && (profile.role === 'cleaner' || profile.role === 'demo_cleaner')) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, profile]); // Add profile to dependencies

  if (!user || (profile?.role !== 'cleaner' && profile?.role !== 'demo_cleaner')) {
    return null; // Only show for cleaners
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-sm p-4">{error}</div>;
  }

  const currentLevelTitle = currentLevel?.title || 'Новичок';
  const currentLevelNumber = currentLevel?.level ?? 0;

  // Calculate total cleanings including manual adjustment
  const realTotalCleanings = cleanerStats?.total_cleanings || 0;
  const manualAdjustment = profile.manual_orders_adjustment || 0;
  const finalTotalCleanings = realTotalCleanings + manualAdjustment;

  const remainingCleanings = nextLevel ? Math.max(0, nextLevel.min_cleanings - finalTotalCleanings) : 0;
  const remainingRating = nextLevel && cleanerStats ? Math.max(0, nextLevel.min_rating - (cleanerStats.avg_rating || 0)) : 0;

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-medium flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        Ваш уровень
      </h3>
      <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {currentLevelTitle} ({currentLevelNumber})
            </p>
            {nextLevel && (
              <p className="text-sm text-muted-foreground">
                Следующий: {nextLevel.title}
              </p>
            )}
          </div>
        </div>

        {nextLevel && (remainingCleanings > 0 || remainingRating > 0) && (
          <p className="text-sm text-muted-foreground">
            Осталось:
            {remainingCleanings > 0 && ` ${remainingCleanings} уборок`}
            {remainingCleanings > 0 && remainingRating > 0 && ' и'}
            {remainingRating > 0 && ` рейтинг ${nextLevel.min_rating.toFixed(1)}`}
          </p>
        )}

        {inventoryProgress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            Инвентарь: {inventoryProgress.completed} / {inventoryProgress.total}
          </div>
        )}
      </div>
    </div>
  );
};