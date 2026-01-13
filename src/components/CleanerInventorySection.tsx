import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface InventoryItem {
  code: string;
  title: string;
}

interface UserInventoryItem {
  id: string;
  item_code: string;
  has_item: boolean;
}

export const CleanerInventorySection = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all inventory items
        const { data: items, error: itemsError } = await supabase
          .from('inventory_items')
          .select('*')
          .order('code');

        if (itemsError) throw itemsError;

        // Fetch user's inventory
        const { data: userItems, error: userError } = await supabase
          .from('user_inventory')
          .select('id, item_code, has_item');

        if (userError) throw userError;

        setInventoryItems(items || []);
        setUserInventory(userItems || []);
      } catch (error) {
        console.error('Error fetching inventory data:', error);
        toast.error('Ошибка загрузки данных инвентаря');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleItemToggle = async (itemCode: string, currentValue: boolean) => {
    try {
      const userItem = userInventory.find(item => item.item_code === itemCode);
      if (!userItem) return;

      const { error } = await supabase
        .from('user_inventory')
        .update({ has_item: !currentValue })
        .eq('id', userItem.id);

      if (error) throw error;

      // Update local state
      setUserInventory(prev => 
        prev.map(item => 
          item.item_code === itemCode 
            ? { ...item, has_item: !currentValue } 
            : item
        )
      );

      toast.success(`Инвентарь ${!currentValue ? 'добавлен' : 'удален'}`);
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Ошибка обновления инвентаря');
    }
  };

  if (loading) {
    return <div className="space-y-2">Загрузка инвентаря...</div>;
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-medium">Инвентарь</h3>
      <div className="space-y-3">
        {inventoryItems.map(item => {
          const userItem = userInventory.find(ui => ui.item_code === item.code);
          const isChecked = userItem?.has_item || false;

          return (
            <div key={item.code} className="flex items-center space-x-2">
              <Checkbox
                id={`inventory-${item.code}`}
                checked={isChecked}
                onCheckedChange={() => handleItemToggle(item.code, isChecked)}
              />
              <Label 
                htmlFor={`inventory-${item.code}`} 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {item.title}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
};