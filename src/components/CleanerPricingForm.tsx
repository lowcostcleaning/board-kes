import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { CleanerPricingRecord, Complex } from '../types'; // Assuming these types are defined

interface CleanerPricingFormProps {
  cleanerId: string;
}

const CleanerPricingForm: React.FC<CleanerPricingFormProps> = ({ cleanerId }) => {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [pricingData, setPricingData] = useState<Record<string, number>>({}); // { complex_id: price }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplexesAndPricing = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch complexes: SELECT * FROM complexes WHERE active = true
        // If 'active' column doesn't exist, this query will fetch all.
        const { data: complexesData, error: complexesError } = await supabase
          .from('complexes')
          .select('*')
          .eq('active', true); // Add this condition if 'active' column exists

        if (complexesError) {
          // Fallback if 'active' column does not exist or other error
          const { data: allComplexesData, error: allComplexesError } = await supabase
            .from('complexes')
            .select('*');
          
          if (allComplexesError) throw allComplexesError;
          setComplexes(allComplexesData || []);
        } else {
          setComplexes(complexesData || []);
        }

        // Fetch existing prices for the cleaner from cleaner_complex_prices
        const { data: prices, error: pricesError } = await supabase
          .from('cleaner_complex_prices')
          .select('complex_id, price')
          .eq('cleaner_id', cleanerId);

        if (pricesError) throw pricesError;

        const initialPricing: Record<string, number> = {};
        prices?.forEach(p => {
          if (p.complex_id) {
            initialPricing[p.complex_id] = p.price;
          }
        });
        setPricingData(initialPricing);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
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
      // Upsert prices into cleaner_complex_prices
      const { error: upsertError } = await supabase
        .from('cleaner_complex_prices')
        .upsert(
          Object.entries(pricingData).map(([complex_id, price]) => ({
            cleaner_id: cleanerId,
            complex_id: complex_id,
            price: price,
          })),
          { onConflict: 'cleaner_id, complex_id' } // Ensure unique constraint
        );

      if (upsertError) throw upsertError;

      alert('Pricing saved successfully!');
    } catch (err: any) {
      console.error("Error saving pricing:", err);
      setError(`Failed to save pricing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading pricing...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <h2>Set Pricing for Complexes</h2>
      {complexes.length === 0 && !error && <div>No complexes available to set prices for.</div>}
      {complexes.map((complex) => (
        <div key={complex.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>{complex.name}</h3>
          <label htmlFor={`price-${complex.id}`}>
            Price: $
            <input
              type="number"
              id={`price-${complex.id}`}
              value={pricingData[complex.id] || 0}
              onChange={(e) => handlePriceChange(complex.id, parseFloat(e.target.value))}
              min="0"
              step="0.01"
              required
              style={{ marginLeft: '5px' }}
            />
          </label>
        </div>
      ))}
      {complexes.length > 0 && (
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Prices'}
        </button>
      )}
    </form>
  );
};

export default CleanerPricingForm;

// Dummy types (replace with your actual types)
// interface CleanerPricingRecord {
//   id: string;
//   user_id: string;
//   complex_id: string;
//   price: number;
//   created_at: string;
//   updated_at: string;
// }

interface Complex {
  id: string;
  name: string;
  // other complex properties...
  active?: boolean; // Optional active flag
}