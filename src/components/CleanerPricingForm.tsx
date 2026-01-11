import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Banknote, Building2 } from 'lucide-react'; // Added Building2 import
import { Tables } from '@/integrations/supabase/types'; // Import Tables type

interface ResidentialComplex {
  id: string;
  name: string;
  city: string | null;
}

// Use the Tables type for CleanerPricingRow
type CleanerPricingRow = Tables<'cleaner_pricing'>;

interface CleanerPricingFormProps {
  cleanerId: string;
}

// Define a type for the pricing state to hold all three prices
interface ComplexPrices {
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

export const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ cleanerId }) => {
  const [residential_complexes, setResidential_complexes] = useState<ResidentialComplex[]>([]);
  const [pricingData, setPricingData] = useState<Record<string, ComplexPrices>>({});
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
        setResidential_complexes(complexesData || []);

        // Fetch existing prices for the cleaner from cleaner_pricing
        const { data: pricesData, error: pricesError } = await supabase
          .from('cleaner_pricing')
          .select('complex_id, price_studio, price_one_plus_one, price_two_plus_one')
          .eq('user_id', cleanerId); // Corrected to user_id

        if (pricesError) throw pricesError;

        const prices = (pricesData || []) as CleanerPricingRow[];

        const initialPricing: Record<string, ComplexPrices> = {};
        (complexesData || []).forEach(complex => {
          const existingPrice = prices.find(p => p.complex_id === complex.id);
          initialPricing[complex.id] = {
            price_studio: existingPrice?.price_studio ?? null,
            price_one_plus_one: existingPrice?.price_one_plus_one ?? null,
            price_two_plus_one: existingPrice?.price_two_plus_one ?? null,
          };
        });

        setPricingData(initialPricing);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err?.message || String(err)}`);
        toast({
          title: 'Ошибка',
          description: err?.message || 'Не удалось загрузить данные',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComplexesAndPricing();
  }, [cleanerId]);

  const handlePriceChange = (complexId: string, priceType: keyof ComplexPrices, value: string) => {
    const parsedValue = value === '' ? null : parseFloat(value);
    setPricingData((prev) => ({
      ...prev,
      [complexId]: {
        ...prev[complexId],
        [priceType]: parsedValue,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = Object.entries(pricingData).map(([complex_id, prices]) => ({
        user_id: cleanerId,
        complex_id,
        price_studio: prices.price_studio,
        price_one_plus_one: prices.price_one_plus_one,
        price_two_plus_one: prices.price_two_plus_one,
      }));

      const { error: upsertError } = await supabase
        .from('cleaner_pricing')
        .upsert(payload, { onConflict: 'user_id,complex_id' });

      if (upsertError) throw upsertError;

      toast({
        title: 'Успешно',
        description: 'Цены сохранены',
      });
    } catch (err: any) {
      console.error('Error saving pricing:', err);
      setError(`Failed to save pricing: ${err?.message || String(err)}`);
      toast({
        title: 'Ошибка',
        description: err?.message || 'Не удалось сохранить цены',
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
    return <div className="text-center text-destructive p-4">{error}</div>;
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {residential_complexes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет доступных жилых комплексов
            </p>
          ) : (
            residential_complexes.map((complex) => (
              <div key={complex.id} className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  {complex.name}
                  {complex.city && (
                    <span className="text-sm text-muted-foreground">({complex.city})</span>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`studio-${complex.id}`} className="text-xs text-muted-foreground">Студия</Label>
                    <Input
                      id={`studio-${complex.id}`}
                      type="number"
                      value={pricingData[complex.id]?.price_studio ?? ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_studio', e.target.value)}
                      min={0}
                      step={1}
                      placeholder="Цена"
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`one-plus-one-${complex.id}`} className="text-xs text-muted-foreground">1+1</Label>
                    <Input
                      id={`one-plus-one-${complex.id}`}
                      type="number"
                      value={pricingData[complex.id]?.price_one_plus_one ?? ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_one_plus_one', e.target.value)}
                      min={0}
                      step={1}
                      placeholder="Цена"
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`two-plus-one-${complex.id}`} className="text-xs text-muted-foreground">2+1</Label>
                    <Input
                      id={`two-plus-one-${complex.id}`}
                      type="number"
                      value={pricingData[complex.id]?.price_two_plus_one ?? ''}
                      onChange={(e) => handlePriceChange(complex.id, 'price_two_plus_one', e.target.value)}
                      min={0}
                      step={1}
                      placeholder="Цена"
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" onClick={handleSubmit} disabled={loading || residential_complexes.length === 0} className="w-full">
          {loading ? 'Сохранение...' : 'Сохранить цены'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CleanerPricingForm;