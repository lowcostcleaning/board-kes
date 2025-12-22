import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, Loader2, Camera } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canCreateObjectUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

  const processFiles = useCallback((selectedFiles: FileList | null) => {
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

      const maxBytes = 20 * 1024 * 1024; // 20MB
      if (file.size > maxBytes) {
        toast({
          title: 'Ошибка',
          description: 'Файл слишком большой (макс. 20MB)',
          variant: 'destructive',
        });
        return;
      }

      // Avoid video object-URL previews on mobile (can cause crashes). Videos already render as an icon.
      const preview = isImage && canCreateObjectUrl ? URL.createObjectURL(file) : '';
      newFiles.push({
        file,
        preview,
        type: isImage ? 'image' : 'video',
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const item = newFiles[index];
      if (canCreateObjectUrl && item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
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
      if (canCreateObjectUrl) {
        files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      }
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
      if (canCreateObjectUrl) {
        files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      }
      setDescription('');
      setFiles([]);
      onClose();
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          <div className="space-y-2">
            {/* File input for gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {/* Camera input for mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {isMobile ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Камера
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Галерея
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Добавить фото/видео
              </Button>
            )}
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((fileData, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {fileData.type === 'image' ? (
                    fileData.preview ? (
                      <img
                        src={fileData.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
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
