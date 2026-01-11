import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Building2, Home, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddObjectDialogProps {
  onObjectAdded: () => void;
  disabled?: boolean;
}

const APARTMENT_TYPES = [
  { value: 'studio', label: 'Студия' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
];

interface ResidentialComplex {
  id: string;
  name: string;
}

const NO_COMPLEX_VALUE = '__no_complex__';

export const AddObjectDialog = ({ onObjectAdded, disabled }: AddObjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [apartmentType, setApartmentType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [selectedComplexId, setSelectedComplexId] = useState(NO_COMPLEX_VALUE);
  const [isLoadingComplexes, setIsLoadingComplexes] = useState(false);

  useEffect(() => {
    if (open) {
      fetchComplexes();
    }
  }, [open]);

  const fetchComplexes = async () => {
    setIsLoadingComplexes(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setComplexes([]);
        return;
      }

      // Fetch complexes that belong to the current manager OR have no manager assigned (created by admin)
      const { data, error } = await supabase
        .from('residential_complexes')
        .select('id, name')
        .or(`manager_id.eq.${user.id},manager_id.is.null`)
        .order('name');

      if (error) throw error;
      setComplexes(data || []);
    } catch (error: any) {
      console.error('Error fetching complexes:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить ЖК',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingComplexes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apartmentNumber.trim() || !apartmentType) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const selectedComplex = complexes.find((complex) => complex.id === selectedComplexId);
      const residentialComplexIdToUse = selectedComplexId === NO_COMPLEX_VALUE ? null : selectedComplexId; // Corrected to residential_complex_id

      const { error } = await supabase.from('objects').insert({
        user_id: user.id,
        complex_name: selectedComplex?.name || 'Без ЖК',
        apartment_number: apartmentNumber.trim(),
        apartment_type: apartmentType,
        residential_complex_id: residentialComplexIdToUse, // Corrected to residential_complex_id
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект добавлен',
      });

      setApartmentNumber('');
      setApartmentType('');
      setSelectedComplexId(NO_COMPLEX_VALUE);
      setOpen(false);
      onObjectAdded();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить объект',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const complexesAvailable = complexes.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="default" disabled={disabled} className="h-7 w-7">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить объект</DialogTitle>
          <DialogDescription>
            Выберите ЖК и укажите номер апартамента
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                ЖК
              </Label>
              <Select value={selectedComplexId} onValueChange={setSelectedComplexId}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue>
                    {isLoadingComplexes ? 'Загрузка...' : selectedComplexId === NO_COMPLEX_VALUE ? 'Без ЖК' : complexes.find(c => c.id === selectedComplexId)?.name || 'Выберите ЖК'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPLEX_VALUE}>Без ЖК</SelectItem>
                  {complexesAvailable ? (
                    complexes.map((complex) => (
                      <SelectItem key={complex.id} value={complex.id}>
                        {complex.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_options__" disabled>
                      {isLoadingComplexes
                        ? 'ЖК загружаются...'
                        : 'Нет доступных ЖК'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartment" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Апартамент
              </Label>
              <Input
                id="apartment"
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
                placeholder="B-1210"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Тип апартамента
              </Label>
              <Select value={apartmentType} onValueChange={setApartmentType}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  {APARTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading || apartmentType === ''}
            >
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};