import { useState, useEffect } from 'react';
import { FileText, Video, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ReportFile {
  id: string;
  file_path: string;
  file_type: string;
}

interface Report {
  id: string;
  description: string | null;
  created_at: string;
  files: ReportFile[];
}

interface ViewReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

export const ViewReportDialog = ({
  isOpen,
  onClose,
  orderId,
}: ViewReportDialogProps) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    if (!isOpen || !orderId) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        // Fetch report
        const { data: reportData, error: reportError } = await supabase
          .from('completion_reports')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();

        if (reportError) throw reportError;

        if (!reportData) {
          setReport(null);
          setLoading(false);
          return;
        }

        // Fetch files
        const { data: filesData, error: filesError } = await supabase
          .from('report_files')
          .select('*')
          .eq('report_id', reportData.id);

        if (filesError) throw filesError;

        setReport({
          ...reportData,
          files: filesData || [],
        });
      } catch (error) {
        console.error('Error fetching report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, orderId]);

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('reports')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const openLightbox = (filePath: string, type: string) => {
    setLightboxUrl(getPublicUrl(filePath));
    setLightboxType(type === 'image' ? 'image' : 'video');
  };

  const closeLightbox = () => {
    setLightboxUrl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Отчёт о выполнении
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !report ? (
            <div className="text-center py-8 text-muted-foreground">
              Отчёт не найден
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {formatDate(report.created_at)}
              </div>

              {report.description && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                </div>
              )}

              {report.files.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Файлы ({report.files.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {report.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => openLightbox(file.file_path, file.file_type)}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {file.file_type === 'image' ? (
                          <img
                            src={getPublicUrl(file.file_path)}
                            alt="Report file"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {report.files.length === 0 && !report.description && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Отчёт без описания и файлов
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <div className="relative bg-background">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={closeLightbox}
              className="absolute right-2 top-2 z-10"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="max-h-[80vh] w-full">
              {lightboxUrl &&
                (lightboxType === 'image' ? (
                  <img
                    src={lightboxUrl}
                    alt="Полный размер"
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <video
                    src={lightboxUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[80vh]"
                  />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
