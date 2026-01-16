import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type UploadedReportFile = {
  path: string;
  type: 'image' | 'video';
  name: string;
};

export const CompletionReportDialog = ({
  isOpen,
  onClose,
  orderId,
  onComplete,
}: CompletionReportDialogProps) => {
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedReportFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftIdRef = useRef<string>(crypto.randomUUID());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Reset input ASAP (iOS Safari stability)
    if (e.target) e.target.value = '';

    if (selectedFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      const draftId = draftIdRef.current;

      for (const file of selectedFiles) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          toast({
            title: 'Ошибка',
            description: 'Можно загружать только фото и видео',
            variant: 'destructive',
          });
          continue;
        }

        const maxBytes = 50 * 1024 * 1024; // 50MB
        if (file.size > maxBytes) {
          toast({
            title: 'Ошибка',
            description: 'Файл слишком большой (макс. 50MB)',
            variant: 'destructive',
          });
          continue;
        }

        const fileExt = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
        const filePath = `${orderId}/${draftId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('reports').upload(filePath, file, {
          contentType: file.type,
        });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          toast({
            title: 'Ошибка',
            description: 'Ошибка загрузки файла: ' + uploadError.message,
            variant: 'destructive',
          });
          continue;
        }

        setUploadedFiles((prev) => [
          ...prev,
          {
            path: filePath,
            type: isImage ? 'image' : 'video',
            name: file.name,
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error selecting/uploading files:', error);
      toast({
        title: 'Ошибка',
        description: error?.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting || uploadingFiles) return;
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Не авторизован');
      }

      let reportId: string;
      let isExistingReport = false;

      // 1. Try to create completion report
      const { data: newReport, error: reportError } = await supabase
        .from('completion_reports')
        .insert({
          order_id: orderId,
          description: description.trim() || null,
        })
        .select('id')
        .single();

      if (reportError) {
        // Check for unique constraint violation (PostgreSQL error code 23505)
        if (reportError.code === '23505') {
          // Report already exists. Fetch the existing report ID.
          isExistingReport = true;
          const { data: existingReport, error: fetchError } = await supabase
            .from('completion_reports')
            .select('id')
            .eq('order_id', orderId)
            .single();
          
          if (fetchError || !existingReport) {
            // If we can't fetch the existing report, throw the original error
            console.error('[CompletionReportDialog] Failed to fetch existing report after 23505 error:', fetchError);
            throw reportError;
          }
          reportId = existingReport.id;
          
          // Log warning and proceed
          console.warn(`[CompletionReportDialog] Report already exists for order ${orderId}. Using existing report ID: ${reportId}`);

        } else {
          // Other database error
          console.error('Report creation error:', reportError);
          throw new Error('Ошибка создания отчёта: ' + reportError.message);
        }
      } else {
        // Report created successfully
        reportId = newReport.id;
      }

      // 2. Save uploaded file references
      for (const file of uploadedFiles) {
        const { error: fileRefError } = await supabase.from('report_files').insert({
          report_id: reportId, // Use the obtained reportId
          file_path: file.path,
          file_type: file.type,
        });

        if (fileRefError) {
          console.error('File reference error:', fileRefError);
          throw new Error('Ошибка сохранения ссылки на файл: ' + fileRefError.message);
        }
      }

      // 3. Update order status
      const { error: orderError } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);

      if (orderError) {
        console.error('Order update error:', orderError);
        throw new Error('Ошибка обновления статуса: ' + orderError.message);
      }

      toast({
        title: 'Успешно',
        description: isExistingReport ? 'Отчёт уже существовал, статус заказа обновлён.' : 'Отчёт отправлен',
      });

      // Cleanup and close only on success
      setDescription('');
      setUploadedFiles([]);
      draftIdRef.current = crypto.randomUUID();
      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отправить отчёт',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || uploadingFiles) return;
    setDescription('');
    setUploadedFiles([]);
    draftIdRef.current = crypto.randomUUID();
    onClose();
  };

  return (
    <>
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
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || uploadingFiles}
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Загрузка…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Добавить фото/видео
                  </>
                )}
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={`${file.path}-${index}`}
                    className="flex items-center gap-2 rounded-md border bg-background px-2 py-2"
                  >
                    {file.type === 'image' ? (
                      <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting || uploadingFiles}
                      aria-label="Удалить файл"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || uploadingFiles}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || uploadingFiles}
              className="w-full sm:w-auto"
            >
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

      {/* IMPORTANT: file input is portaled outside Dialog to avoid mobile crashes */}
      {typeof document !== 'undefined' &&
        createPortal(
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
            tabIndex={-1}
          />,
          document.body
        )}
    </>
  );
};