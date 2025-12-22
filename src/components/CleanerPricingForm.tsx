import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Banknote, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CleanerPricingFormProps {
  onUpdate?: () => void;
}

export const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ onUpdate }) => {
  const { user, profile } = useAuth();
  const [priceStudio, setPriceStudio] = useState<string>('');
  const [priceOnePlusOne, setPriceOnePlusOne] = useState<string>('');
  const [priceTwoPlusOne, setPriceTwoPlusOne] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPrices();
    }
  }, [user]);

  const fetchPrices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('price_studio, price_one_plus_one, price_two_plus_one')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPriceStudio(data.price_studio?.toString() || '');
        setPriceOnePlusOne(data.price_one_plus_one?.toString() || '');
        setPriceTwoPlusOne(data.price_two_plus_one?.toString() || '');
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          price_studio: priceStudio ? parseInt(priceStudio) : null,
          price_one_plus_one: priceOnePlusOne ? parseInt(priceOnePlusOne) : null,
          price_two_plus_one: priceTwoPlusOne ? parseInt(priceTwoPlusOne) : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Цены обновлены');
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast.error('Ошибка обновления цен');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
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
        <span className="text-sm font-medium">Стоимость уборки (₾)</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price_studio" className="text-xs text-muted-foreground">
            Студия
          </Label>
          <Input
            id="price_studio"
            type="number"
            min="0"
            value={priceStudio}
            onChange={(e) => setPriceStudio(e.target.value)}
            placeholder="0"
            className="bg-muted/50 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price_1_1" className="text-xs text-muted-foreground">
            1+1
          </Label>
          <Input
            id="price_1_1"
            type="number"
            min="0"
            value={priceOnePlusOne}
            onChange={(e) => setPriceOnePlusOne(e.target.value)}
            placeholder="0"
            className="bg-muted/50 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price_2_1" className="text-xs text-muted-foreground">
            2+1
          </Label>
          <Input
            id="price_2_1"
            type="number"
            min="0"
            value={priceTwoPlusOne}
            onChange={(e) => setPriceTwoPlusOne(e.target.value)}
            placeholder="0"
            className="bg-muted/50 h-9"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        size="sm" 
        disabled={isLoading}
        className="w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        {isLoading ? 'Сохранение...' : 'Сохранить цены'}
      </Button>
    </form>
  );
};