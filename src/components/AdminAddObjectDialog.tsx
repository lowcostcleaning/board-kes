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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building2, Home, LayoutGrid, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/UserAvatar';

interface Manager {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface ResidentialComplex {
  id: string;
  name: string;
}

interface AdminAddObjectDialogProps {
  onObjectAdded: () => void;
}

const APARTMENT_TYPES = [
  { value: 'studio', label: 'Студия' },
  { value: '1+1', label: '1+1' },
  { value: '2+1', label: '2+1' },
];

// NO_COMPLEX_VALUE removed as complex is now mandatory

export const AdminAddObjectDialog = ({ onObjectAdded }: AdminAddObjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [selectedComplexId, setSelectedComplexId] = useState(''); // Changed default to empty string
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [apartmentType, setApartmentType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchManagers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedManager) {
      fetchComplexes();
    } else {
      setComplexes([]);
      setSelectedComplexId('');
    }
  }, [selectedManager]);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url')
      .eq('status', 'approved')
      .eq('role', 'manager') // Filter only real managers
      .order('name');

    if (!error && data) {
      setManagers(data);
    }
  };

  const fetchComplexes = async () => {
    const { data, error } = await supabase
      .from('residential_complexes')
      .select('id, name')
      .order('name');

    const fetchedComplexes = data || [];
    setComplexes(fetchedComplexes);
    
    // Set default selection if complexes exist
    if (fetchedComplexes.length > 0) {
      setSelectedComplexId(fetchedComplexes[0].id);
    } else {
      setSelectedComplexId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedManager || !apartmentNumber.trim() || !apartmentType || !selectedComplexId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите менеджера, ЖК, тип и номер апартамента',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedComplex = complexes.find((complex) => complex.id === selectedComplexId);
      
      if (!selectedComplex) {
        throw new Error('Выбранный ЖК не найден');
      }

      const { error } = await supabase.from('objects').insert({
        user_id: selectedManager,
        complex_name: selectedComplex.name, // Use selected name
        apartment_number: apartmentNumber.trim(),
        apartment_type: apartmentType,
        residential_complex_id: selectedComplexId,
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект добавлен',
      });

      setSelectedManager('');
      setSelectedComplexId('');
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

  const complexesAvailable = complexes.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Building2 className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить объект</span>
          <Plus className="w-4 h-4 sm:hidden" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить объект</DialogTitle>
          <DialogDescription>
            Выберите менеджера, ЖК и укажите данные объекта
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Менеджер
              </Label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Выберите менеджера">
                    {selectedManager && (
                      <span>{managers.find((m) => m.id === selectedManager)?.name}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          avatarUrl={manager.avatar_url}
                          name={manager.name}
                          email={manager.email}
                          size="sm"
                        />
                        <span>{manager.name || manager.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Жилой комплекс (ЖК)
              </Label>
              <Select value={selectedComplexId} onValueChange={setSelectedComplexId}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Выберите ЖК" />
                </SelectTrigger>
                <SelectContent>
                  {complexesAvailable ? (
                    complexes.map((complex) => (
                      <SelectItem key={complex.id} value={complex.id}>
                        {complex.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_options__" disabled>
                      Нет доступных ЖК
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!complexesAvailable && (
                <p className="text-xs text-destructive">
                  Сначала создайте ЖК на вкладке "Объекты"
                </p>
              )}
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
                required
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !selectedManager || !apartmentNumber.trim() || !apartmentType || !selectedComplexId}
            >
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};