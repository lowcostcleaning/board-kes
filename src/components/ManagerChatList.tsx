import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatDialog } from '@/components/ChatDialog';
import { MessageCircle, User } from 'lucide-react';

interface Cleaner {
  id: string;
  name: string | null;
  email: string | null;
}

interface UnreadInfo {
  cleanerId: string;
  hasUnread: boolean;
}

export function ManagerChatList() {
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const checkUnreadMessages = async () => {
    if (!user?.id) return;

    try {
      // Get all dialogs for this manager
      const { data: dialogs } = await supabase
        .from('dialogs')
        .select('id, cleaner_id, manager_last_read_at')
        .eq('manager_id', user.id);

      if (!dialogs || dialogs.length === 0) return;

      const newUnreadMap: Record<string, boolean> = {};

      for (const dialog of dialogs) {
        // Check if there are messages from cleaner after manager_last_read_at
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('dialog_id', dialog.id)
          .eq('sender_role', 'cleaner')
          .gt('created_at', dialog.manager_last_read_at || '1970-01-01');

        newUnreadMap[dialog.cleaner_id] = (count || 0) > 0;
      }

      setUnreadMap(newUnreadMap);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  useEffect(() => {
    const fetchCleaners = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'cleaner')
          .eq('status', 'approved')
          .order('name', { ascending: true });

        if (error) throw error;
        setCleaners(data || []);
        
        // Check unread after fetching cleaners
        await checkUnreadMessages();
      } catch (error) {
        console.error('Error fetching cleaners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCleaners();
  }, [user?.id]);

  // Subscribe to new messages to update unread indicators
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('manager-unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleOpenChat = async (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setChatOpen(true);
    
    // Mark as read when opening chat
    if (user?.id) {
      const { data: dialog } = await supabase
        .from('dialogs')
        .select('id')
        .eq('manager_id', user.id)
        .eq('cleaner_id', cleaner.id)
        .maybeSingle();

      if (dialog) {
        await supabase
          .from('dialogs')
          .update({ manager_last_read_at: new Date().toISOString() })
          .eq('id', dialog.id);
        
        setUnreadMap(prev => ({ ...prev, [cleaner.id]: false }));
      }
    }
  };

  const getDisplayName = (cleaner: Cleaner) => {
    if (cleaner.name) return cleaner.name;
    if (cleaner.email) return cleaner.email.split('@')[0];
    return 'Клинер';
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground p-3">Загрузка...</p>
    );
  }

  if (cleaners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
        Нет доступных клинеров.
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {cleaners.map((cleaner) => (
            <Button
              key={cleaner.id}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleOpenChat(cleaner)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{getDisplayName(cleaner)}</p>
                {cleaner.name && cleaner.email && (
                  <p className="text-xs text-muted-foreground">
                    @{cleaner.email.split('@')[0]}
                  </p>
                )}
              </div>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                {unreadMap[cleaner.id] && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {selectedCleaner && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          cleanerId={selectedCleaner.id}
          cleanerName={getDisplayName(selectedCleaner)}
          userRole="manager"
        />
      )}
    </>
  );
}
