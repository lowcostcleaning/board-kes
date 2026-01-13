import React, { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Brush } from 'lucide-react';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
type UserInventory = Tables<'user_inventory'>;

interface CombinedInventoryItem extends InventoryItem {
  status: {
    has_item: boolean;
    verified: boolean;
  };
}

const fetchInventoryData = async (userId: string): Promise<CombinedInventoryItem[]> => {
  // 1. Fetch all base items
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('*')
    .order('code');

  if (itemsError) throw itemsError;

  // 2. Fetch user's inventory status
  const { data: userStatus, error: statusError } = await supabase
    .from('user_inventory')
    .select('item_code, has_item, verified')
    .eq('user_id', userId);

  if (statusError) throw statusError;

  // Combine data into a map for easy lookup
  const statusMap = new Map(userStatus.map(s => [s.item_code, s]));

  const combinedData = items.map(item => ({
    ...item,
    status: statusMap.get(item.code) || { has_item: false, verified: false },
  }));

  return combinedData;
};

export const CleanerInventorySettings: React.FC = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const isCleaner = profile?.role === 'cleaner' || profile?.role === 'demo_cleaner';

  const { data: inventory, isLoading, isError } = useQuery({
    queryKey: ['cleanerInventory', user?.id],
    queryFn: () => fetchInventoryData(user!.id),
    enabled: !!user?.id && isCleaner,
  });

  const mutation = useMutation({
    mutationFn: async ({ itemCode, hasItem }: { itemCode: string; hasItem: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Update user_inventory. We rely on RLS to restrict updates to only 'has_item'
      const { error } = await supabase
        .from('user_inventory')
        .update({ has_item: hasItem })
        .eq('user_id', user.id)
        .eq('item_code', itemCode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleanerInventory', user?.id] });
      toast.success('Инвентарь обновлён');
    },
    onError: (error) => {
      console.error('Inventory update error:', error);
      toast.error('Ошибка обновления инвентаря');
    },
  });

  if (!isCleaner) return null;

  if (isLoading) {
    return (
      <div className="space-y-4 border-t pt-4 mt-4">
        <div className="flex items-center gap-2">
          <Brush className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Инвентарь</h3>
        </div>
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !inventory) {
    return (
      <div className="space-y-4 border-t pt-4 mt-4">
        <div className="flex items-center gap-2">
          <Brush className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Инвентарь</h3>
        </div>
        <p className="text-sm text-destructive">Не удалось загрузить инвентарь.</p>
      </div>
    );
  }

  const handleToggle = (itemCode: string, currentStatus: boolean) => {
    mutation.mutate({ itemCode, hasItem: !currentStatus });
  };

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2">
        <Brush className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Инвентарь</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {inventory.map((item) => (
          <div key={item.code} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
            <Checkbox
              id={item.code}
              checked={item.status.has_item}
              onCheckedChange={() => handleToggle(item.code, item.status.has_item)}
              disabled={mutation.isPending}
            />
            <Label
              htmlFor={item.code}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
            >
              {item.title}
            </Label>
            {item.status.verified && (
              <span className="text-xs text-status-active">
                (Проверен)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};