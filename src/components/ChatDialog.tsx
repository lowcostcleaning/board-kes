import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  dialog_id: string;
  sender_id: string;
  sender_role: string;
  text: string;
  created_at: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentManagerId = userRole === 'manager' ? user?.id : managerId;

  // Fetch or create dialog
  useEffect(() => {
    if (!open || !user?.id || !cleanerId || !currentManagerId) return;

    const fetchOrCreateDialog = async () => {
      setLoading(true);
      try {
        // Try to find existing dialog
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
          // Create new dialog (only managers can create)
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

  // Fetch messages
  useEffect(() => {
    if (!dialogId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('dialog_id', dialogId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
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
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
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

  const handleSend = async () => {
    if (!newMessage.trim() || !dialogId || !user?.id) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        dialog_id: dialogId,
        sender_id: user.id,
        sender_role: userRole,
        text: newMessage.trim()
      });

      if (error) throw error;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base font-medium">{cleanerName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Загрузка...</p>
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
                              <p className="text-sm break-words">{message.text}</p>
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

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  disabled={sending || !dialogId}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending || !dialogId}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
