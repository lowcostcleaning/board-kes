import { useState, useEffect } from 'react';
import { Building2, Home, Trash2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  created_at: string;
}

interface ObjectsListProps {
  refreshTrigger: number;
  onRefresh: () => void;
  disabled?: boolean;
}

const getApartmentTypeLabel = (type: string | null) => {
  switch (type) {
    case 'studio':
      return 'Студия';
    case '1+1':
      return '1+1';
    case '2+1':
      return '2+1';
    default:
      return null;
  }
};

export const ObjectsList = ({ refreshTrigger, onRefresh, disabled }: ObjectsListProps) => {
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchObjects = async () => {
    try {
      const { data, error } = await supabase
        .from('objects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setObjects(data || []);
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить объекты',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (disabled) return;
    
    try {
      const { error } = await supabase.from('objects').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Объект удалён',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить объект',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Нет зарегистрированных объектов</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {objects.map((obj) => (
        <div
          key={obj.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{obj.complex_name}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Home className="w-3 h-3" />
              <span className="text-sm">{obj.apartment_number}</span>
            </div>
            {obj.apartment_type && (
              <Badge variant="secondary" className="text-xs">
                <LayoutGrid className="w-3 h-3 mr-1" />
                {getApartmentTypeLabel(obj.apartment_type)}
              </Badge>
            )}
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(obj.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
