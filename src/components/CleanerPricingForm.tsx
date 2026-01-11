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

interface CleanerPricingRow {
  residential_complex_id: string;
  price_studio: number | null;
  price_one_plus_one: number | null;
  price_two_plus_one: number | null;
}

interface CleanerPricingFormProps {
  cleanerId: string;
}

const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ cleanerId }) => {
  const [residential_complexes, setResidential_complexes] = useState<ResidentialComplex[]>([]);
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
        setResidential_complexes(complexesData || []);

        // Fetch existing prices for the cleaner from cleaner_pricing
        // Avoid using a deep generic on select — fetch raw and cast to a lightweight interface
        const { data: pricesData, error: pricesError } = await supabase
          .from('cleaner_pricing')
          .select('residential_complex_id, price_studio, price_one_plus_one, price_two_plus_one')
          .eq('cleaner_id', cleanerId);

        if (pricesError) throw pricesError;

        const prices = (pricesData || []) as CleanerPricingRow[];

        const initialPricing: Record<string, number> = {};
        prices.forEach((p) => {
          if (p && p.residential_complex_id) {
            initialPricing[p.residential_complex_id] =
              p.price_studio ?? p.price_one_plus_one ?? p.price_two_plus_one ?? 0;
          }
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

  const handlePriceChange = (complexId: string, price: number) => {
    setPricingData((prev) => ({
      ...prev,
      [complexId]: price,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build payload matching cleaner_pricing insert shape: cleaner_id + residential_complex_id required
      const payload = Object.entries(pricingData).map(([residential_complex_id, price]) => ({
        cleaner_id: cleanerId,
        residential_complex_id,
        price_studio: price,
        price_one_plus_one: price,
        price_two_plus_one: price,
      }));

      const { error: upsertError } = await supabase
        .from('cleaner_pricing')
        .upsert(payload, { onConflict: 'cleaner_id,residential_complex_id' });

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
        <form onSubmit={handleSubmit} className="space-y-4">
          {residential_complexes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет доступных жилых комплексов
            </p>
          ) : (
            residential_complexes.map((complex) => (
              <div key={complex.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                  {complex.name}
                  {complex.city && (
                    <span className="text-xs text-muted-foreground">({complex.city})</span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={pricingData[complex.id] ?? 0}
                  onChange={(e) => handlePriceChange(complex.id, parseFloat(e.target.value || '0'))}
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
        <Button type="submit" onClick={handleSubmit} disabled={loading || residential_complexes.length === 0} className="w-full">
          {loading ? 'Сохранение...' : 'Сохранить цены'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CleanerPricingForm;