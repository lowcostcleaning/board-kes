import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Banknote, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ResidentialComplex {
  id: string;
  name: string;
}

interface CleanerPricing {
  id?: string;
  cleaner_id: string;
  residential_complex_id: string;
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
  created_at?: string;
  updated_at?: string;
}

interface CleanerPricingFormData {
  id?: string;
  residential_complex_id: string;
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

interface CleanerPricingFormProps {
  onUpdate?: () => void;
}

export const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ onUpdate }) => {
  const { user } = useAuth();
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [pricing, setPricing] = useState<Record<string, CleanerPricingFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchComplexesAndPricing();
    }
  }, [user]);

  const fetchComplexesAndPricing = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch all residential complexes
      const { data: complexesData, error: complexesError } = await supabase
        .from('residential_complexes')
        .select('id, name')
        .order('name');
      
      if (complexesError) throw complexesError;

      // Fetch existing pricing for this cleaner
      const { data: pricingData, error: pricingError } = await supabase
        .from('cleaner_pricing')
        .select('id, cleaner_id, residential_complex_id, price_studio, price_one_plus_one, price_two_plus_one, created_at, updated_at')
        .eq('cleaner_id', user.id);
      
      if (pricingError) throw pricingError;

      // Convert pricing data to a map for easier access
      const pricingMap: Record<string, CleanerPricingFormData> = {};
      pricingData?.forEach((item: any) => {
        pricingMap[item.residential_complex_id] = {
          id: item.id,
          residential_complex_id: item.residential_complex_id,
          price_studio: item.price_studio,
          price_one_plus_one: item.price_one_plus_one,
          price_two_plus_one: item.price_two_plus_one
        };
      });

      // Initialize pricing for complexes without existing data
      const initializedPricing: Record<string, CleanerPricingFormData> = {};
      complexesData?.forEach(complex => {
        initializedPricing[complex.id] = pricingMap[complex.id] || {
          residential_complex_id: complex.id,
          price_studio: null,
          price_one_plus_one: null,
          price_two_plus_one: null
        };
      });

      setComplexes(complexesData || []);
      setPricing(initializedPricing);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (complexId: string, field: keyof CleanerPricingFormData, value: string) => {
    setPricing(prev => ({
      ...prev,
      [complexId]: {
        ...prev[complexId],
        [field]: value ? parseInt(value) : null
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      // Prepare data for upsert (insert or update)
      const pricingEntries = Object.values(pricing);
      
      // Filter out entries with no prices set
      const entriesToSave = pricingEntries.filter(entry => 
        entry.price_studio !== null || 
        entry.price_one_plus_one !== null || 
        entry.price_two_plus_one !== null
      );
      
      // Also include entries that exist in DB but might be cleared
      const entriesToClear = pricingEntries.filter(entry => 
        !entry.price_studio && 
        !entry.price_one_plus_one && 
        !entry.price_two_plus_one && 
        entry.id // Only if it exists in DB
      );
      
      // Delete entries with all prices cleared
      if (entriesToClear.length > 0) {
        const idsToDelete = entriesToClear.map(e => e.id).filter(Boolean) as string[];
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('cleaner_pricing')
            .delete()
            .in('id', idsToDelete);
          if (deleteError) throw deleteError;
        }
      }
      
      // Upsert entries with prices
      if (entriesToSave.length > 0) {
        const entriesToUpsert = entriesToSave.map(entry => ({
          ...entry,
          cleaner_id: user.id
        }));
        
        const { error: upsertError } = await supabase
          .from('cleaner_pricing')
          .upsert(entriesToUpsert, {
            onConflict: 'cleaner_id,residential_complex_id'
          });
        if (upsertError) throw upsertError;
      }
      
      toast.success('Цены обновлены');
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast.error('Ошибка обновления цен');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Banknote className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Стоимость уборки по ЖК (₾)</span>
      </div>
      
      {complexes.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          Нет доступных жилых комплексов
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {complexes.map(complex => {
            const complexPricing = pricing[complex.id] || {
              price_studio: null,
              price_one_plus_one: null,
              price_two_plus_one: null
            };
            
            return (
              <div key={complex.id} className="p-3 rounded-lg bg-muted/50">
                <h3 className="font-medium text-sm mb-2">{complex.name}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`price_studio_${complex.id}`} className="text-xs text-muted-foreground">
                      Студия
                    </Label>
                    <Input
                      id={`price_studio_${complex.id}`}
                      type="number"
                      min="0"
                      value={complexPricing.price_studio || ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_studio', e.target.value)}
                      placeholder="0"
                      className="bg-background h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`price_1_1_${complex.id}`} className="text-xs text-muted-foreground">
                      1+1
                    </Label>
                    <Input
                      id={`price_1_1_${complex.id}`}
                      type="number"
                      min="0"
                      value={complexPricing.price_one_plus_one || ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_one_plus_one', e.target.value)}
                      placeholder="0"
                      className="bg-background h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`price_2_1_${complex.id}`} className="text-xs text-muted-foreground">
                      2+1
                    </Label>
                    <Input
                      id={`price_2_1_${complex.id}`}
                      type="number"
                      min="0"
                      value={complexPricing.price_two_plus_one || ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_two_plus_one', e.target.value)}
                      placeholder="0"
                      className="bg-background h-9"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <Button type="submit" size="sm" disabled={isSaving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Сохранение...' : 'Сохранить цены'}
      </Button>
    </form>
  );
};