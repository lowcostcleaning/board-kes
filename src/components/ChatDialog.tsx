import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, X, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageFile {
  id: string;
  message_id: string;
  file_url: string; // This stores the file path, not a public URL
  file_type: string;
  signedUrl?: string; // Generated signed URL for display
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

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

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
  userRole
}: ChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentManagerId = userRole === 'manager' ? user?.id : managerId;

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
              manager_id: currentManagerId
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
      const messageIds = messagesData?.map(m => m.id) || [];
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
            // Extract file path from stored URL or use as path
            const filePath = file.file_url.includes('/chat_files/') 
              ? file.file_url.split('/chat_files/')[1]?.split('?')[0] 
              : file.file_url;
            
            const { data } = await supabase.storage
              .from('chat_files')
              .createSignedUrl(filePath, 3600);
            
            return { ...file, signedUrl: data?.signedUrl };
          })
        );
        
        filesData = filesWithSignedUrls;
      }

      // Attach files to messages
      const messagesWithFiles = messagesData?.map(msg => ({
        ...msg,
        files: filesData.filter(f => f.message_id === msg.id)
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
          filter: `dialog_id=eq.${dialogId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Small delay to ensure files are saved
          setTimeout(async () => {
            const { data: newFiles } = await supabase
              .from('message_files')
              .select('*')
              .eq('message_id', newMsg.id);
            
            // Generate signed URLs for new files
            const filesWithSignedUrls = await Promise.all(
              (newFiles || []).map(async (file) => {
                const filePath = file.file_url.includes('/chat_files/') 
                  ? file.file_url.split('/chat_files/')[1]?.split('?')[0] 
                  : file.file_url;
                
                const { data } = await supabase.storage
                  .from('chat_files')
                  .createSignedUrl(filePath, 3600);
                
                return { ...file, signedUrl: data?.signedUrl };
              })
            );
            
            setMessages((prev) => {
              // Check if message already exists
              if (prev.some(m => m.id === newMsg.id)) {
                return prev.map(m => m.id === newMsg.id ? { ...newMsg, files: filesWithSignedUrls } : m);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: FilePreview[] = [];

    for (const file of selectedFiles) {
      if (file.type.startsWith('image/')) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          type: 'image'
        });
      } else if (file.type.startsWith('video/')) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          type: 'video'
        });
      }
    }

    setFiles(prev => [...prev, ...validFiles]);
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && files.length === 0) || !dialogId || !user?.id) return;

    setSending(true);
    if (files.length > 0) {
      setUploading(true);
    }

    try {
      // Create message first
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          dialog_id: dialogId,
          sender_id: user.id,
          sender_role: userRole,
          text: newMessage.trim() || '📎 Файлы'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Upload files and create file records
      const uploadedFiles: MessageFile[] = [];
      
      for (const fileData of files) {
        const fileExt = fileData.file.name.split('.').pop();
        const filePath = `${dialogId}/${messageData.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat_files')
          .upload(filePath, fileData.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Ошибка загрузки: ${fileData.file.name}`);
          continue;
        }

        // Store file path instead of public URL
        const { data: fileRecord, error: fileRecordError } = await supabase
          .from('message_files')
          .insert({
            message_id: messageData.id,
            file_url: filePath,
            file_type: fileData.type
          })
          .select()
          .single();

        if (fileRecordError) {
          console.error('File record error:', fileRecordError);
        } else if (fileRecord) {
          // Generate signed URL for immediate display
          const { data } = await supabase.storage
            .from('chat_files')
            .createSignedUrl(filePath, 3600);
          
          uploadedFiles.push({ ...fileRecord, signedUrl: data?.signedUrl });
        }
      }

      // Add message with files to state immediately
      const newMsgWithFiles: Message = {
        ...messageData,
        files: uploadedFiles
      };
      
      setMessages(prev => {
        if (prev.some(m => m.id === messageData.id)) {
          return prev.map(m => m.id === messageData.id ? newMsgWithFiles : m);
        }
        return [...prev, newMsgWithFiles];
      });

      // Cleanup
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка при отправке сообщения');
    } finally {
      setSending(false);
      setUploading(false);
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
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
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
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {date}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {msgs.map((message) => {
                          const isOwn = message.sender_id === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                'flex',
                                isOwn ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <div
                                className={cn(
                                  'max-w-[75%] rounded-lg px-3 py-2',
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                )}
                              >
                                {message.files && message.files.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {message.files.map((file) => (
                                      <button
                                        key={file.id}
                                        onClick={() => file.signedUrl && openLightbox(file.signedUrl, file.file_type as 'image' | 'video')}
                                        className="relative rounded overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
                                      >
                                        {file.file_type === 'image' && file.signedUrl ? (
                                          <img
                                            src={file.signedUrl}
                                            alt="Attachment"
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
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Начните диалог
                    </p>
                  )}
                </div>
              </ScrollArea>

              {/* File previews with upload indicator */}
              {files.length > 0 && (
                <div className="px-4 py-2 border-t bg-muted/50">
                  <div className="flex gap-2 overflow-x-auto">
                    {files.map((file, index) => (
                      <div key={index} className="relative shrink-0">
                        {file.type === 'image' ? (
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {uploading ? (
                          <div className="absolute inset-0 bg-background/60 rounded flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || !dialogId}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Сообщение..."
                    disabled={sending || !dialogId}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && files.length === 0) || sending || !dialogId}
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
                    alt="Полный размер"
                    className="w-full max-h-[80vh] object-contain"
                  />
                ) : (
                  <video
                    src={lightboxUrl}
                    controls
                    className="w-full max-h-[80vh]"
                  />
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}