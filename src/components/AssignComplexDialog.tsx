"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ResidentialComplex } from '@/hooks/use-admin-objects';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignComplexDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectName: string;
  currentComplexId: string | null;
  residentialComplexes: ResidentialComplex[];
  onAssign: (complexId: string | null) => Promise<boolean>;
  isReadOnlyMode: boolean;
}

export const AssignComplexDialog = ({
  open,
  onOpenChange,
  objectName,
  currentComplexId,
  residentialComplexes,
  onAssign,
  isReadOnlyMode,
}: AssignComplexDialogProps) => {
  const [selectedComplexId, setSelectedComplexId] = useState<string>(currentComplexId || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedComplexId(currentComplexId || '');
    }
  }, [open, currentComplexId]);

  const handleSubmit = async () => {
    if (isReadOnlyMode) return;

    setIsSaving(true);
    const success = await onAssign(selectedComplexId || null);
    setIsSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Привязать ЖК</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {objectName}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              ЖК
            </Label>
            <Select value={selectedComplexId} onValueChange={setSelectedComplexId}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue>
                  {selectedComplexId
                    ? residentialComplexes.find((complex) => complex.id === selectedComplexId)?.name
                    : 'Без ЖК'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без ЖК</SelectItem>
                {residentialComplexes.map((complex) => (
                  <SelectItem key={complex.id} value={complex.id}>
                    {complex.name}
                    {complex.city && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({complex.city})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || isReadOnlyMode}
            className={cn('w-full sm:w-auto', isReadOnlyMode && 'cursor-not-allowed')}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};