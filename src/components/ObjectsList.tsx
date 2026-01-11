import { useState, useEffect } from 'react';
import { Building2, Home, Trash2, LayoutGrid, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { EditObjectDialog } from './EditObjectDialog';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyObject {
  id: string;
  complex_name: string;
  apartment_number: string;
  apartment_type: string | null;
  created_at: string;
  user_id: string;
  residential_complex_id: string | null; // Corrected to residential_complex_id
  residential_complex_name: string | null;
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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [objects, setObjects] = useState<PropertyObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editObject, setEditObject] = useState<PropertyObject | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchObjects = async () => {
    try {
      const { data, error } = await supabase
        .from('objects')
        .select(`
          id,
          complex_name,
          apartment_number,
          apartment_type,
          created_at,
          user_id,
          residential_complex_id,
          residential_complexes (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) {
        setObjects([]);
        setIsLoading(false);
        return;
      }

      const mapped = data.map((obj: any) => ({
        ...obj,
        residential_complex_id: obj.residential_complex_id, // Ensure this is correctly mapped
        residential_complex_name: obj.residential_complexes?.name || null,
      }));

      setObjects(mapped);
    } catch (error: any) {
      console.error('Error fetching objects:', error); // Added console.error
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
    <>
      <div className="space-y-2">
        {objects.map((obj) => (
          <div
            key={obj.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors gap-2"
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{obj.complex_name}</span>
                {!obj.residential_complex_id && ( // Corrected to residential_complex_id
                  <Badge variant="outline" className="text-xs">
                    Без ЖК
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Home className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{obj.apartment_number}</span>
              </div>
              {obj.apartment_type && (
                <Badge variant="secondary" className="text-xs w-fit">
                  <LayoutGrid className="w-3 h-3 mr-1" />
                  {getApartmentTypeLabel(obj.apartment_type)}
                </Badge>
              )}
              {obj.residential_complex_name && (
                <p className="text-xs text-muted-foreground">Связан с ЖК: {obj.residential_complex_name}</p>
              )}
            </div>
            {!disabled && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setEditObject(obj);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(obj.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <EditObjectDialog
        order={null} // This dialog is for orders, not objects. This needs to be fixed.
        open={editDialogOpen}
        onOpenChange={(open) => !open && setEditDialogOpen(false)}
        onSuccess={() => {
          setEditDialogOpen(false);
          onRefresh();
        }}
        canDelete={false}
        canEditComplex={isAdmin}
      />
    </>
  );
};