import { useState, useEffect } from 'react';
import { Building2, MapPin, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ResidentialComplex } from '@/hooks/use-admin-objects';

interface AssignComplexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectName: string;
  currentComplexId: string | null;
  residentialComplexes: ResidentialComplex[];
  onAssign: (complexId: string | null) => Promise<boolean>;
  isReadOnlyMode: boolean;
}

const NO_COMPLEX_VALUE = 'none';

export const AssignComplexDialog = ({
  open,
  onOpenChange,
  objectName,
  currentComplexId,
  residentialComplexes,
  onAssign,
  isReadOnlyMode,
}: AssignComplexDialogProps) => {
  const [selectedComplexId, setSelectedComplexId] = useState<string>(
    currentComplexId || NO_COMPLEX_VALUE
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync internal state when the dialog opens or currentComplexId changes
  useEffect(() => {
    setSelectedComplexId(currentComplexId || NO_COMPLEX_VALUE);
  }, [currentComplexId, open]);

  const handleAssign = async () => {
    if (isReadOnlyMode) return;
    setIsSubmitting(true);
    
    const complexIdToAssign = selectedComplexId === NO_COMPLEX_VALUE ? null : selectedComplexId;
    
    const success = await onAssign(complexIdToAssign);
    
    if (success) {
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  const currentComplexName = residentialComplexes.find(c => c.id === currentComplexId)?.name || 'Не присвоен';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Присвоить ЖК объекту</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/50 rounded-md border text-sm">
            <p className="font-medium mb-1">Объект:</p>
            <p className="flex items-center gap-2 text-foreground">
              <Building2 className="w-4 h-4" />
              {objectName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complex-select">Текущий ЖК: <span className="font-medium">{currentComplexName}</span></Label>
            <Select
              value={selectedComplexId}
              onValueChange={setSelectedComplexId}
              disabled={isReadOnlyMode || isSubmitting}
            >
              <SelectTrigger id="complex-select">
                <SelectValue placeholder="Выберите жилой комплекс" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COMPLEX_VALUE}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    Без ЖК
                  </div>
                </SelectItem>
                {residentialComplexes.map(complex => (
                  <SelectItem key={complex.id} value={complex.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {complex.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting || isReadOnlyMode}
          >
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isSubmitting || isReadOnlyMode || selectedComplexId === currentComplexId}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};