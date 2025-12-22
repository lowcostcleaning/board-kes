import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export const AddObjectDialog = ({ onObjectAdded, disabled }: AddObjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [complexName, setComplexName] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [apartmentType, setApartmentType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!complexName.trim() || !apartmentNumber.trim() || !apartmentType) {
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
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { error } = await supabase.from('objects').insert({
        user_id: user.id,
        complex_name: complexName.trim(),
        apartment_number: apartmentNumber.trim(),
        apartment_type: apartmentType,
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект добавлен',
      });

      setComplexName('');
      setApartmentNumber('');
      setApartmentType('');
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить объект
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить объект</DialogTitle>
          <DialogDescription>
            Укажите жилой комплекс, номер и тип апартамента
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="complex" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                ЖК
              </Label>
              <Input
                id="complex"
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder="Orbi City"
                className="bg-muted/50"
              />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
