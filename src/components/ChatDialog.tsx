import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, X, Video, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/use-notification-sound';

interface MessageFile {
  id: string;
  message_id: string;
  file_url: string; // stores the file path (not a public URL)
  file_type: string;
  signedUrl?: string; // generated signed URL for display
}

interface Message {
  id: string;
  dialog_id: string;
  sender_id: string;
  sender_role: string;
  text: string;
  created_at: string;
  files?: MessageFile[];
}

type PendingAttachment = {
  path: string;
  type: 'image' | 'video';
  name: string;
};

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cleanerId: string;
  cleanerName: string;
  managerId?: string;
  userRole: 'manager' | 'cleaner';
}

export function ChatDialog({
  open,
  onOpenChange,
  cleanerId,
  cleanerName,
  managerId,
  userRole,
}: ChatDialogProps) {
  const { user } = useAuth();
  const { playSound } = useNotificationSound();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentManagerId = userRole === 'manager' ? user?.id : managerId;

  const attachmentInputId = useId();
  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  }, []);


  // Fetch or create dialog
  useEffect(() => {
    if (!open || !user?.id || !cleanerId || !currentManagerId) return;

    const fetchOrCreateDialog = async () => {
      setLoading(true);
      try {
        const { data: existingDialog, error: fetchError } = await supabase
          .from('dialogs')
          .select('id')
          .eq('cleaner_id', cleanerId)
          .eq('manager_id', currentManagerId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingDialog) {
          setDialogId(existingDialog.id);
        } else if (userRole === 'manager') {
          const { data: newDialog, error: createError } = await supabase
            .from('dialogs')
            .insert({
              cleaner_id: cleanerId,
              manager_id: currentManagerId,
            })
            .select('id')
            .single();

          if (createError) throw createError;
          setDialogId(newDialog.id);
        }
      } catch (error) {
        console.error('Error with dialog:', error);
        toast.error('Ошибка при загрузке чата');
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateDialog();
  }, [open, user?.id, cleanerId, currentManagerId, userRole]);

  // Fetch messages with files
  useEffect(() => {
    if (!dialogId) return;

    const fetchMessages = async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('dialog_id', dialogId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      // Fetch files for all messages
      const messageIds = messagesData?.map((m) => m.id) || [];
      let filesData: MessageFile[] = [];

      if (messageIds.length > 0) {
        const { data: fetchedFiles, error: filesError } = await supabase
          .from('message_files')
          .select('*')
          .in('message_id', messageIds);

        if (filesError) {
          console.error('Error fetching files:', filesError);
        }

        // Generate signed URLs for each file
        const filesWithSignedUrls = await Promise.all(
          (fetchedFiles || []).map(async (file) => {
            // Normalize file path: handle old full URLs and new path-only values
            let filePath = file.file_url;
            if (filePath.includes('/chat_files/')) {
              filePath = filePath.split('/chat_files/')[1]?.split('?')[0] || filePath;
            }
            // Decode URI components that may be double-encoded
            try { filePath = decodeURIComponent(filePath); } catch {}

            const { data } = await supabase.storage.from('chat_files').createSignedUrl(filePath, 3600);

            return { ...file, signedUrl: data?.signedUrl };
          })
        );

        filesData = filesWithSignedUrls;
      }

      // Attach files to messages
      const messagesWithFiles =
        messagesData?.map((msg) => ({
          ...msg,
          files: filesData.filter((f) => f.message_id === msg.id),
        })) || [];

      setMessages(messagesWithFiles);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dialog_id=eq.${dialogId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Play notification sound if message is from someone else
          if (newMsg.sender_id !== user?.id) {
            playSound();
          }

          // Small delay to ensure files are saved
          setTimeout(async () => {
            const { data: newFiles } = await supabase.from('message_files').select('*').eq('message_id', newMsg.id);

            const filesWithSignedUrls = await Promise.all(
              (newFiles || []).map(async (file) => {
                let filePath = file.file_url;
                if (filePath.includes('/chat_files/')) {
                  filePath = filePath.split('/chat_files/')[1]?.split('?')[0] || filePath;
                }
                try { filePath = decodeURIComponent(filePath); } catch {}

                const { data } = await supabase.storage.from('chat_files').createSignedUrl(filePath, 3600);

                return { ...file, signedUrl: data?.signedUrl };
              })
            );

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev.map((m) => (m.id === newMsg.id ? { ...newMsg, files: filesWithSignedUrls } : m));
              }
              return [...prev, { ...newMsg, files: filesWithSignedUrls }];
            });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dialogId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Reset input ASAP (iOS Safari stability)
    if (e.target) e.target.value = '';

    if (!dialogId || selectedFiles.length === 0) return;

    setUploadingAttachments(true);
    try {
      for (const file of selectedFiles) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          toast.error('Можно загружать только фото и видео');
          continue;
        }

        const maxBytes = 50 * 1024 * 1024; // 50MB
        if (file.size > maxBytes) {
          toast.error('Файл слишком большой (макс. 50MB)');
          continue;
        }

        const fileExt = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
        const filePath = `${dialogId}/pending/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('chat_files').upload(filePath, file, {
          contentType: file.type,
        });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Ошибка загрузки: ${file.name}`);
          continue;
        }

        setPendingAttachments((prev) => [
          ...prev,
          {
            path: filePath,
            type: isImage ? 'image' : 'video',
            name: file.name,
          },
        ]);
      }
    } catch (err) {
      console.error('Error uploading file(s):', err);
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !dialogId || !user?.id) return;
    if (uploadingAttachments) return;

    setSending(true);

    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          dialog_id: dialogId,
          sender_id: user.id,
          sender_role: userRole,
          text: newMessage.trim() || '📎 Файлы',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      const uploadedFiles: MessageFile[] = [];

      for (const attachment of pendingAttachments) {
        const { data: fileRecord, error: fileRecordError } = await supabase
          .from('message_files')
          .insert({
            message_id: messageData.id,
            file_url: attachment.path,
            file_type: attachment.type,
          })
          .select()
          .single();

        if (fileRecordError) {
          console.error('File record error:', fileRecordError);
          continue;
        }

        const { data } = await supabase.storage.from('chat_files').createSignedUrl(attachment.path, 3600);
        uploadedFiles.push({ ...fileRecord, signedUrl: data?.signedUrl });
      }

      const newMsgWithFiles: Message = {
        ...messageData,
        files: uploadedFiles,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === messageData.id)) {
          return prev.map((m) => (m.id === messageData.id ? newMsgWithFiles : m));
        }
        return [...prev, newMsgWithFiles];
      });

      setPendingAttachments([]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openLightbox = (url: string, type: 'image' | 'video') => {
    setLightboxUrl(url);
    setLightboxType(type);
  };

  const closeLightbox = () => {
    setLightboxUrl(null);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
    const date = formatDate(message.created_at);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {} as Record<string, Message[]>);


  const attachDisabled = sending || uploadingAttachments || !dialogId;

  return (

    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base font-medium">{cleanerName}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="py-4 space-y-4">
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="flex justify-center mb-3">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{date}</span>
                      </div>
                      <div className="space-y-2">
                        {msgs.map((message) => {
                          const isOwn = message.sender_id === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[75%] rounded-lg px-3 py-2',
                                  isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}
                              >
                                {message.files && message.files.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {message.files.map((file) => (
                                      <button
                                        key={file.id}
                                        onClick={() =>
                                          file.signedUrl &&
                                          openLightbox(file.signedUrl, file.file_type as 'image' | 'video')
                                        }
                                        className="relative rounded overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
                                      >
                                        {file.file_type === 'image' && file.signedUrl ? (
                                          <img
                                            src={file.signedUrl}
                                            alt="Вложение (фото)"
                                            className="h-16 w-16 object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="h-16 w-16 bg-background/20 flex items-center justify-center">
                                            <Video className="h-6 w-6" />
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {message.text && message.text !== '📎 Файлы' && (
                                  <p className="text-sm break-words">{message.text}</p>
                                )}
                                <p
                                  className={cn(
                                    'text-[10px] mt-1',
                                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  )}
                                >
                                  {formatTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">Начните диалог</p>
                  )}
                </div>
              </ScrollArea>

              {/* Uploaded attachments (no local previews) */}
              {(pendingAttachments.length > 0 || uploadingAttachments) && (
                <div className="px-4 py-2 border-t bg-muted/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingAttachments.map((file, index) => (
                      <div
                        key={`${file.path}-${index}`}
                        className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 max-w-full"
                      >
                        {file.type === 'image' ? (
                          <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs truncate max-w-[180px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePendingAttachment(index)}
                          className="shrink-0 rounded-sm p-1 hover:bg-muted"
                          aria-label="Удалить файл"
                          disabled={uploadingAttachments || sending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {uploadingAttachments && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Загрузка…
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className={cn(attachDisabled && 'pointer-events-none opacity-50')}
                  >
                    <label
                      htmlFor={attachDisabled ? undefined : attachmentInputId}
                      tabIndex={attachDisabled ? -1 : 0}
                      aria-label="Прикрепить файл"
                    >
                      <Paperclip className="h-4 w-4" />
                    </label>
                  </Button>

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Сообщение..."
                    disabled={sending || uploadingAttachments || !dialogId}
                    className="flex-1"
                  />

                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={
                      (!newMessage.trim() && pendingAttachments.length === 0) ||
                      sending ||
                      uploadingAttachments ||
                      !dialogId
                    }
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox for viewing files */}
      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeLightbox();
        }}
      >
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
                    alt="Фото (полный размер)"
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <video src={lightboxUrl} controls className="w-full max-h-[80vh]" />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for attachment uploads */}
      <input
        id={attachmentInputId}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/3gpp"
        multiple={!isIOS}
        onChange={handleFileSelect}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );
}
