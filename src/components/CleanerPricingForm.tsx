import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Banknote } from 'lucide-react';

interface ResidentialComplex {
  id: string;
  name: string;
  city: string | null;
}

interface CleanerPricing {
  complex_id: string;
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

interface CleanerPricingFormProps {
  cleanerId: string;
}

const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ cleanerId }) => {
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [pricingData, setPricingData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplexesAndPricing = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch complexes from residential_complexes table
        const { data: complexesData, error: complexesError } = await supabase
          .from('residential_complexes')
          .select('*');

        if (complexesError) throw complexesError;
        setComplexes(complexesData || []);

        // Fetch existing prices for the cleaner from cleaner_pricing
        const { data: prices, error: pricesError } = await supabase
          .from('cleaner_pricing')
          .select('complex_id, price_studio, price_one_plus_one, price_two_plus_one')
          .eq('user_id', cleanerId);

        if (pricesError) throw pricesError;

        const initialPricing: Record<string, number> = {};
        prices?.forEach(p => {
          if (p.complex_id) {
            // Use studio price as the base price, or fallback to other prices
            initialPricing[p.complex_id] = p.price_studio || p.price_one_plus_one || p.price_two_plus_one || 0;
          }
        });
        setPricingData(initialPricing);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
        toast({
          title: 'Ошибка',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComplexesAndPricing();
  }, [cleanerId]);

  const handlePriceChange = (complexId: string, price: number) => {
    setPricingData(prev => ({
      ...prev,
      [complexId]: price,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Upsert prices into cleaner_pricing
      const { error: upsertError } = await supabase
        .from('cleaner_pricing')
        .upsert(
          Object.entries(pricingData).map(([complex_id, price]) => ({
            user_id: cleanerId,
            complex_id: complex_id,
            price_studio: price,
            price_one_plus_one: price,
            price_two_plus_one: price,
          })),
          { onConflict: 'user_id, complex_id' }
        );

      if (upsertError) throw upsertError;

      toast({
        title: 'Успешно',
        description: 'Цены сохранены',
      });
    } catch (err: any) {
      console.error("Error saving pricing:", err);
      setError(`Failed to save pricing: ${err.message}`);
      toast({
        title: 'Ошибка',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-4">
        {error}
      </div>
    );
  }

  return (
    <Card className="shadow-card border-border/50 bg-card animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Banknote className="w-4 h-4 text-accent-foreground" />
          </div>
          Мои цены
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {complexes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет доступных жилых комплексов
            </p>
          ) : (
            complexes.map((complex) => (
              <div key={complex.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                  {complex.name}
                  {complex.city && (
                    <span className="text-xs text-muted-foreground">
                      ({complex.city})
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={pricingData[complex.id] || 0}
                  onChange={(e) => handlePriceChange(complex.id, parseFloat(e.target.value))}
                  min={0}
                  step={1}
                  placeholder="Цена за уборку"
                  className="bg-muted/50"
                />
              </div>
            ))
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={loading || complexes.length === 0}
          className="w-full"
        >
          {loading ? 'Сохранение...' : 'Сохранить цены'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CleanerPricingForm;