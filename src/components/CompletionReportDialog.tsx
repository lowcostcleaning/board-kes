import { useState, useRef } from 'react';
import { Upload, X, Image, Video, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CompletionReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onComplete: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export const CompletionReportDialog = ({
  isOpen,
  onClose,
  orderId,
  onComplete,
}: CompletionReportDialogProps) => {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: FilePreview[] = [];
    
    Array.from(selectedFiles).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast({
          title: 'Ошибка',
          description: 'Можно загружать только фото и видео',
          variant: 'destructive',
        });
        return;
      }

      const preview = URL.createObjectURL(file);
      newFiles.push({
        file,
        preview,
        type: isImage ? 'image' : 'video',
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Не авторизован');
      }

      // Create completion report
      const { data: report, error: reportError } = await supabase
        .from('completion_reports')
        .insert({
          order_id: orderId,
          description: description.trim() || null,
        })
        .select()
        .single();

      if (reportError) {
        console.error('Report creation error:', reportError);
        throw new Error('Ошибка создания отчёта: ' + reportError.message);
      }

      // Upload files one by one
      for (const fileData of files) {
        const fileExt = fileData.file.name.split('.').pop();
        const filePath = `${orderId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, fileData.file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw new Error('Ошибка загрузки файла: ' + uploadError.message);
        }

        // Save file reference
        const { error: fileRefError } = await supabase
          .from('report_files')
          .insert({
            report_id: report.id,
            file_path: filePath,
            file_type: fileData.type,
          });

        if (fileRefError) {
          console.error('File reference error:', fileRefError);
          throw new Error('Ошибка сохранения ссылки на файл: ' + fileRefError.message);
        }
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (orderError) {
        console.error('Order update error:', orderError);
        throw new Error('Ошибка обновления статуса: ' + orderError.message);
      }

      toast({
        title: 'Успешно',
        description: 'Отчёт отправлен',
      });

      // Cleanup and close only on success
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setDescription('');
      setFiles([]);
      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить отчёт',
        variant: 'destructive',
      });
      // Dialog stays open on error - user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setDescription('');
      setFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отчёт о выполнении</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="Описание выполненной работы..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Добавить фото/видео
            </Button>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((fileData, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {fileData.type === 'image' ? (
                    <img
                      src={fileData.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 p-1 rounded bg-background/80">
                    {fileData.type === 'image' ? (
                      <Image className="w-3 h-3" />
                    ) : (
                      <Video className="w-3 h-3" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              'Отправить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
