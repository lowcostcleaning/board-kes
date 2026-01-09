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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const NO_COMPLEX_VALUE = '__no_complex__';

export const AdminAddObjectDialog = ({ onObjectAdded }: AdminAddObjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [complexes, setComplexes] = useState<ResidentialComplex[]>([]);
  const [selectedComplexId, setSelectedComplexId] = useState(NO_COMPLEX_VALUE);
  const [complexName, setComplexName] = useState('');
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
      fetchComplexesForManager(selectedManager);
    } else {
      setComplexes([]);
      setSelectedComplexId(NO_COMPLEX_VALUE);
    }
  }, [selectedManager]);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url')
      .eq('status', 'approved')
      .in('role', ['manager', 'demo_manager'])
      .order('name');

    if (!error && data) {
      setManagers(data);
    }
  };

  const fetchComplexesForManager = async (managerId: string) => {
    const { data } = await supabase
      .from('residential_complexes')
      .select('id, name')
      .eq('manager_id', managerId)
      .order('name');

    setComplexes(data || []);
    setSelectedComplexId(NO_COMPLEX_VALUE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedManager || !apartmentNumber.trim() || !apartmentType) {
      toast({
        title: 'Ошибка',
        description: 'Выберите менеджера и заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedComplex = complexes.find((complex) => complex.id === selectedComplexId);
      const complexIdToUse = selectedComplexId === NO_COMPLEX_VALUE ? null : selectedComplexId;

      const { error } = await supabase.from('objects').insert({
        user_id: selectedManager,
        complex_name: selectedComplex?.name || complexName.trim() || 'Без ЖК',
        apartment_number: apartmentNumber.trim(),
        apartment_type: apartmentType,
        residential_complex_id: complexIdToUse,
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект добавлен',
      });

      setSelectedManager('');
      setComplexName('');
      setSelectedComplexId(NO_COMPLEX_VALUE);
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

  const selectedComplex = complexes.find((complex) => complex.id === selectedComplexId);

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
                ЖК
              </Label>
              <Select value={selectedComplexId} onValueChange={setSelectedComplexId} disabled={!selectedManager}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue>
                    {selectedComplexId === NO_COMPLEX_VALUE 
                      ? 'Без ЖК' 
                      : selectedComplex?.name || 'Выберите ЖК'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPLEX_VALUE}>Без ЖК</SelectItem>
                  {complexes.length > 0 ? (
                    complexes.map((complex) => (
                      <SelectItem key={complex.id} value={complex.id}>
                        {complex.name}
                      </SelectItem>
                    ))
                  ) : selectedManager ? (
                    <SelectItem value="__no_options__" disabled>
                      У менеджера нет ЖК
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complex" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Название ЖК (если нужно)
              </Label>
              <Input
                id="complex"
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder={selectedComplex ? selectedComplex.name : 'Например, Orbi City'}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading || !selectedManager || !apartmentNumber.trim()}>
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};