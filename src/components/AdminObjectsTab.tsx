import { useState } from 'react';
import { Building2, Search, Archive, ArchiveRestore, User, MapPin, Home, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminObjects, ResidentialComplex, AdminObject } from '@/hooks/use-admin-objects';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AssignComplexDialog } from './AssignComplexDialog';

interface AdminObjectsTabProps {
  isReadOnlyMode: boolean;
}

export const AdminObjectsTab = ({ isReadOnlyMode }: AdminObjectsTabProps) => {
  const { toast } = useToast();
  const {
    objects,
    residentialComplexes,
    managers,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    createResidentialComplex,
    updateResidentialComplex,
    deleteResidentialComplex,
    updateObjectComplex,
    toggleObjectArchived,
  } = useAdminObjects();

  const [showComplexDialog, setShowComplexDialog] = useState(false);
  const [editingComplex, setEditingComplex] = useState<ResidentialComplex | null>(null);
  const [complexName, setComplexName] = useState('');
  const [complexCity, setComplexCity] = useState('');
  
  // New state for assignment dialog
  const [assigningObject, setAssigningObject] = useState<AdminObject | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const checkReadOnly = () => {
    if (isReadOnlyMode) {
      toast({
        title: 'Режим только для чтения',
        description: 'Действие заблокировано. Отключите режим аудита.',
        variant: 'destructive',
      });
      return true;
    }
    return false;
  };

  const handleCreateComplex = async () => {
    if (checkReadOnly()) return;
    if (!complexName.trim()) {
      toast({ title: 'Ошибка', description: 'Введите название ЖК', variant: 'destructive' });
      return;
    }

    const result = await createResidentialComplex(complexName.trim(), complexCity.trim());
    if (result) {
      toast({ title: 'ЖК создан', description: `${result.name} успешно добавлен` });
      setShowComplexDialog(false);
      setComplexName('');
      setComplexCity('');
    }
  };

  const handleUpdateComplex = async () => {
    if (checkReadOnly()) return;
    if (!editingComplex || !complexName.trim()) return;
    
    const success = await updateResidentialComplex(editingComplex.id, complexName.trim(), complexCity.trim());
    if (success) {
      toast({ title: 'ЖК обновлён' });
      setEditingComplex(null);
      setComplexName('');
      setComplexCity('');
    }
  };

  const handleDeleteComplex = async (complex: ResidentialComplex) => {
    if (checkReadOnly()) return;
    const success = await deleteResidentialComplex(complex.id);
    if (success) {
      toast({ title: 'ЖК удалён' });
    }
  };

  const handleToggleArchive = async (objectId: string, currentArchived: boolean) => {
    if (checkReadOnly()) return;
    const success = await toggleObjectArchived(objectId, !currentArchived);
    if (success) {
      toast({ 
        title: currentArchived ? 'Объект восстановлен' : 'Объект архивирован' 
      });
    }
  };

  // Handler to open the assignment dialog
  const openAssignDialog = (obj: AdminObject) => {
    if (checkReadOnly()) return;
    setAssigningObject(obj);
    setShowAssignDialog(true);
  };

  // Handler to perform the assignment logic (passed to AssignComplexDialog)
  const handleAssignComplexSubmit = async (complexId: string | null) => {
    if (!assigningObject) return false;
    if (checkReadOnly()) return false;
    
    const success = await updateObjectComplex(assigningObject.id, complexId);
    if (success) {
        setShowAssignDialog(false);
        setAssigningObject(null);
    }
    return success;
  };

  const openCreateComplexDialog = () => {
    if (checkReadOnly()) return;
    setEditingComplex(null);
    setComplexName('');
    setComplexCity('');
    setShowComplexDialog(true);
  };

  const openEditComplexDialog = (complex: ResidentialComplex) => {
    if (checkReadOnly()) return;
    setEditingComplex(complex);
    setComplexName(complex.name);
    setComplexCity(complex.city || '');
    setShowComplexDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Жилые комплексы
          </h3>
          <Button size="sm" onClick={openCreateComplexDialog} disabled={isReadOnlyMode}>
            <Plus className="w-4 h-4 mr-1" />
            Добавить ЖК
          </Button>
        </div>
        
        {residentialComplexes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет жилых комплексов</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {residentialComplexes.map(complex => (
              <Badge 
                key={complex.id} 
                variant="secondary" 
                className="flex items-center gap-1 py-1.5 px-3"
              >
                <Building2 className="w-3 h-3" />
                {complex.name}
                {complex.city && <span className="text-muted-foreground">({complex.city})</span>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 ml-1"
                  onClick={() => openEditComplexDialog(complex)}
                  disabled={isReadOnlyMode}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 text-destructive"
                  onClick={() => handleDeleteComplex(complex)}
                  disabled={isReadOnlyMode}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по объектам..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.managerId || 'all'}
          onValueChange={(value) => updateFilters({ managerId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все менеджеры" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все менеджеры</SelectItem>
            {managers.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email || m.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.residentialComplexId || 'all'}
          onValueChange={(value) =>
            updateFilters({ residentialComplexId: value === 'all' ? null : value === 'none' ? 'none' : value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все ЖК" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ЖК</SelectItem>
            <SelectItem value="none">Без ЖК</SelectItem>
            {residentialComplexes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value: 'all' | 'active' | 'archived') => updateFilters({ status: value })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="archived">Архивные</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={filters.withoutComplex ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ withoutComplex: !filters.withoutComplex })}
        >
          Без ЖК
        </Button>

        {(filters.search || filters.managerId || filters.residentialComplexId || filters.status !== 'active' || filters.withoutComplex) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Сбросить
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {objects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет объектов
          </p>
        ) : (
          objects.map(obj => (
            <div
              key={obj.id}
              className={`flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border gap-3 ${
                obj.is_archived ? 'bg-muted/50 border-border/50' : 'bg-card border-border'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{obj.complex_name}, кв. {obj.apartment_number}</span>
                  {obj.residential_complex_id ? (
                    <Badge variant="outline">
                      ЖК: {obj.residential_complex_name || 'Неизвестный'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted">
                      <MapPin className="w-3 h-3 mr-1" />
                      Без ЖК
                    </Badge>
                  )}
                  {obj.apartment_type && (
                    <Badge variant="outline" className="text-xs">
                      {obj.apartment_type}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>Менеджер: {obj.owner_name || obj.owner_email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Archive/Restore Button */}
                <Button
                  size="sm"
                  variant={obj.is_archived ? 'outline' : 'ghost'}
                  className={obj.is_archived ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-foreground'}
                  onClick={() => handleToggleArchive(obj.id, obj.is_archived)}
                  disabled={isReadOnlyMode}
                >
                  {obj.is_archived ? <ArchiveRestore className="w-4 h-4 mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                  {obj.is_archived ? 'Восстановить' : 'Архивировать'}
                </Button>

                {/* Assign Complex Button - Opens Dialog */}
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => openAssignDialog(obj)}
                  disabled={isReadOnlyMode}
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  ЖК
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complex Create/Edit Dialog */}
      <Dialog open={showComplexDialog || !!editingComplex} onOpenChange={(open) => {
        if (!open) {
          setShowComplexDialog(false);
          setEditingComplex(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingComplex ? 'Редактировать ЖК' : 'Создать ЖК'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder="Название жилого комплекса"
                disabled={isReadOnlyMode}
              />
            </div>
            <div className="space-y-2">
              <Label>Город</Label>
              <Input
                value={complexCity}
                onChange={(e) => setComplexCity(e.target.value)}
                placeholder="Город (опционально)"
                disabled={isReadOnlyMode}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowComplexDialog(false);
              setEditingComplex(null);
            }} disabled={isReadOnlyMode}>
              Отмена
            </Button>
            <Button onClick={editingComplex ? handleUpdateComplex : handleCreateComplex} disabled={isReadOnlyMode}>
              {editingComplex ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Complex Dialog */}
      {assigningObject && (
        <AssignComplexDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          objectName={`${assigningObject.complex_name}, кв. ${assigningObject.apartment_number}`}
          currentComplexId={assigningObject.residential_complex_id}
          residentialComplexes={residentialComplexes}
          onAssign={handleAssignComplexSubmit}
          isReadOnlyMode={isReadOnlyMode}
        />
      )}
    </div>
  );
};