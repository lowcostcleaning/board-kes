import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Building2, Home, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
}

interface EditObjectDialogProps {
  object: PropertyObject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onObjectUpdated: () => void;
}

const APARTMENT_TYPES = [
  { value: 'studio', label: 'Студия' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
];

export const EditObjectDialog = ({ object, open, onOpenChange, onObjectUpdated }: EditObjectDialogProps) => {
  const [complexName, setComplexName] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [apartmentType, setApartmentType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (object) {
      setComplexName(object.complex_name);
      setApartmentNumber(object.apartment_number);
      setApartmentType(object.apartment_type || '');
    }
  }, [object]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!object) return;

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
      const { error } = await supabase
        .from('objects')
        .update({
          complex_name: complexName.trim(),
          apartment_number: apartmentNumber.trim(),
          apartment_type: apartmentType,
        })
        .eq('id', object.id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект обновлён',
      });

      onOpenChange(false);
      onObjectUpdated();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить объект',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать объект</DialogTitle>
          <DialogDescription>
            Измените данные объекта
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-complex" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                ЖК
              </Label>
              <Input
                id="edit-complex"
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder="Orbi City"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apartment" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Апартамент
              </Label>
              <Input
                id="edit-apartment"
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
                placeholder="B-1210"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type" className="flex items-center gap-2">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
